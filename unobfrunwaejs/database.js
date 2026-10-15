// RW-SEC-03: a user's private fields live at users_private/{uid} (owner-only
// rules); users/{uid} keeps the public profile. Until scripts/MIGRATE has moved
// every account, older records may still hold these fields under users/{uid}, so
// the owner's view merges both (private wins). Only the OWNER's record is merged:
// other users' private fields are never readable.
var RW_PRIVATE_MAPS = ["notifications", "conversations", "transactions"];
var RW_PRIVATE_SCALARS = ["email", "email_prefs", "customer_id"];

function rwPrivateRef(uid, sub) {
    return database.ref().child('users_private/' + uid + (sub ? '/' + sub : ''));
}

function rwUnreadCount(obj) {
    var count = 0;
    if (obj && typeof obj === "object") {
        Object.keys(obj).forEach(function (k) {
            if (obj[k] && obj[k]["read_or_unread"] == "unread") count += 1;
        });
    }
    return count;
}

function rwMergedUserSnap(pubSnap, privVal) {
    var pub = pubSnap.val();
    var merged = pub ? Object.assign({}, pub) : null;
    var legacy = {};
    if (merged) {
        var priv = privVal || {};
        RW_PRIVATE_MAPS.forEach(function (k) {
            var a = (pub[k] && typeof pub[k] === "object") ? pub[k] : {};
            var b = (priv[k] && typeof priv[k] === "object") ? priv[k] : {};
            legacy[k] = {};
            Object.keys(a).forEach(function (key) { if (!b[key]) legacy[k][key] = a[key]; });
            var m = Object.assign({}, a, b);
            merged[k] = Object.keys(m).length ? m : "";
        });
        RW_PRIVATE_SCALARS.forEach(function (k) {
            if (priv[k] !== undefined && priv[k] !== null && priv[k] !== "") merged[k] = priv[k];
        });
        // Badge counts are the owner's own recount (other users can no longer
        // read this index to update it); the stored value is refreshed below.
        merged.unread_notifications_count = rwUnreadCount(merged.notifications);
        merged.unread_messages_count = rwUnreadCount(merged.conversations);
    }
    return {
        key: pubSnap.key,
        ref: pubSnap.ref,
        rwLegacy: legacy,
        val: function () { return merged; },
        exists: function () { return merged !== null; },
        child: function (p) { return pubSnap.child(p); }
    };
}

// Load the signed-in user's own record (public + private, merged).
function rwOwnUser(uid, cb) {
    database.ref().child('users/' + uid).once('value', function (pubSnap) {
        rwPrivateRef(uid).once('value', function (privSnap) {
            var snap = rwMergedUserSnap(pubSnap, privSnap.val());
            rwSyncUnreadCounts(snap, pubSnap.val());
            cb(snap);
        }, function () {
            cb(rwMergedUserSnap(pubSnap, null));
        });
    });
}

function rwSyncUnreadCounts(snap, stored) {
    var m = snap.val();
    if (!m) return;
    stored = stored || {};
    var upd = {};
    if (stored.unread_notifications_count !== m.unread_notifications_count) upd.unread_notifications_count = m.unread_notifications_count;
    if (stored.unread_messages_count !== m.unread_messages_count) upd.unread_messages_count = m.unread_messages_count;
    if (Object.keys(upd).length) database.ref().child('users/' + snap.key).update(upd);
}

// Owner update of one entry of a private map (notifications/conversations).
// A legacy entry still under users/{uid} is moved to users_private on write.
function rwOwnPrivateUpdate(snapUser, map, key, data) {
    var uid = snapUser.key;
    var legacy = snapUser.rwLegacy && snapUser.rwLegacy[map] && snapUser.rwLegacy[map][key];
    if (legacy) {
        rwPrivateRef(uid, map + '/' + key).set(Object.assign({}, legacy, data));
        database.ref().child('users/' + uid + '/' + map + '/' + key).remove();
        delete snapUser.rwLegacy[map][key];
    } else {
        rwPrivateRef(uid, map + '/' + key).update(data);
    }
}

function rwOwnPrivateRemove(uid, map, key) {
    rwPrivateRef(uid, map + '/' + key).remove();
    database.ref().child('users/' + uid + '/' + map + '/' + key).remove();
}

function updateGigStatus(path, status) {
    database.ref().child(path).update({
        "status": status
    });
    window.location.href = "gig";
}

function deactivateAccount(snapUser) {
    // A plan that still renews must be cancelled in Manage billing first (util.js rwCloseAccountGuard).
    rwCloseAccountGuard(snapUser.key, function () { deactivateAccountConfirmed(snapUser); });
}

function deactivateAccountConfirmed(snapUser) {
    // Remove account (ported from origin/ui/rw-style 2f17f94, adapted to this page's ids). The user confirms in
    // #deactivateAccountModal and re-enters their password when they signed in with one. Order: re-authenticate
    // (before any write, so auth/requires-recent-login can't leave a half-removed account), then ONE atomic update
    // (own posts inactive + profile email blanked, previous values kept), then delete the sign-in and sign out.
    // If anything fails after the write, the previous values are written back and the dialog says so honestly.
    var useri = snapUser.key;
    $("#deactivateAccountError").text("");
    $("#deactivatePassword").val("");
    $("#deactivateConfirm").show();
    $("#deactivateDone").hide();
    var current = firebase.auth().currentUser;
    var usesPassword = !!(current && current.providerData && current.providerData.some(function (p) {
        return p && p.providerId === "password";
    }));
    $("#deactivatePasswordField").toggle(usesPassword);
    openModal("#deactivateAccountModal", usesPassword ? "#deactivatePassword" : "#btnDeactivateConfirmation");
    $("#btnDeactivateCancel").off("click").on("click", function (event) {
        event.preventDefault();
        closeModal("#deactivateAccountModal");
    });
    // .off first: the button is wired once per open, not once per earlier open.
    $("#btnDeactivateConfirmation").off("click").on("click", function (event) {
        event.preventDefault();
        var $btn = $(this);
        if ($btn.prop("disabled")) {
            return;
        }
        var user = firebase.auth().currentUser;
        if (!user || user.uid !== useri) {
            $("#deactivateAccountError").text("You are signed out. Log in again, then remove your account from Account settings.");
            return;
        }
        var password = $("#deactivatePassword").val();
        if (usesPassword && !password) {
            $("#deactivateAccountError").text("Enter your password to confirm.");
            $("#deactivatePassword").trigger("focus");
            return;
        }
        $("#deactivateAccountError").text("");
        $btn.prop("disabled", true).text("Removing...");
        var previous = {};
        var applied = false;
        reauthenticateForRemoval(user, usesPassword, password).then(function () {
            return database.ref().child('users/' + useri + '/posts').once('value');
        }).then(function (snapPosts) {
            var keys = [];
            snapPosts.forEach(function (snapP) {
                keys.push(snapP.key);
            });
            return Promise.all(keys.map(function (key) {
                return database.ref().child('items/' + key).once('value').then(function (snapI) {
                    // only posts that exist and belong to this user are marked inactive
                    if (snapI.exists() && snapI.child('uid').val() === useri) {
                        previous['items/' + key + '/status'] = snapI.child('status').exists() ? snapI.child('status').val() : null;
                    }
                });
            }));
        }).then(function () {
            var updates = {};
            Object.keys(previous).forEach(function (path) {
                updates[path] = "inactive";
            });
            // RW-SEC-03: the email lives at users_private/{uid} (rwOwnUser merges it into
            // snapUser.val()); a not-yet-migrated copy under users/{uid} is blanked too.
            var mine = snapUser.val() || {};
            previous['users_private/' + useri + '/email'] = mine.email ? mine.email : null;
            updates['users_private/' + useri + '/email'] = "";
            if (snapUser.child('email').exists()) {
                previous['users/' + useri + '/email'] = snapUser.child('email').val();
                updates['users/' + useri + '/email'] = "";
            }
            return database.ref().update(updates);
        }).then(function () {
            applied = true;
            try { sessionStorage.setItem("rw_account_removed", "1"); } catch (e) { /* storage blocked */ }
            return user.delete();
        }).then(function () {
            // Deleting the sign-in signs the user out with it; signOut() makes sure.
            return firebase.auth().signOut().catch(function () { /* already signed out */ });
        }).then(function () {
            if (typeof analytics !== "undefined" && analytics && analytics.logEvent) {
                analytics.logEvent('account_deactivated', {
                    category: 'authentication'
                });
            }
            $("#deactivateConfirm").hide();
            $("#deactivateDone").show();
            setTimeout(function () {
                window.location.href = "login?login";
            }, 2500);
        }).catch(function (error) {
            try { sessionStorage.removeItem("rw_account_removed"); } catch (e) { /* storage blocked */ }
            var undo = applied ? database.ref().update(previous) : Promise.resolve();
            undo.then(function () {
                return true;
            }, function () {
                return false;
            }).then(function (restored) {
                $btn.prop("disabled", false).text("Remove account");
                $("#deactivateAccountError").text(restored ? removalErrorMessage(error) + " Nothing was changed." :
                    "Your account could not be removed, and your profile email or posts may not have been restored. Email hello@runwae.com and we will fix it.");
            });
        });
    });
}

function reauthenticateForRemoval(user, usesPassword, password) {
    if (usesPassword) {
        var credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        return user.reauthenticateWithCredential(credential);
    }
    return Promise.resolve();
}

function removalErrorMessage(error) {
    var code = error && error.code;
    if (code === "auth/requires-recent-login") {
        return "For your security, Runwae needs a recent sign-in to remove an account. Log out, log in again, then remove your account.";
    }
    if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/user-mismatch") {
        return "That password is not correct.";
    }
    if (code === "auth/too-many-requests") {
        return "Too many attempts. Wait a few minutes and try again.";
    }
    if (code === "auth/network-request-failed") {
        return "No connection. Check your internet and try again.";
    }
    return "Your account could not be removed. Try again, or email hello@runwae.com.";
}

function writeToPHPLedger(instaId) {
    var address = 'writeLedger.php?instagram_id=' + instaId;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log(this.responseText);
        }
    };
    xmlhttp.open("GET", address, true);
    xmlhttp.send();
}
