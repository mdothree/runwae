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
    useri = snapUser.key;
    $("#deactivateAccountError").text("");
    openModal("#deactivateAccountModal");
    $("#btnDeactivateCancel").off("click").on("click", function () {
        $("#deactivateAccountModal .icon-close").trigger("click");
    });
    // .off first: the button is wired once per open, not once per earlier open.
    $("#btnDeactivateConfirmation").off("click").on("click", function () {
        var authUser = firebase.auth().currentUser;
        if (!authUser) {
            window.location.href = "login";
            return;
        }
        var $btn = $(this).prop("disabled", true);
        // Take the user's posts off Explore, then clear the email, then delete the sign-in.
        // (Used to reference the undefined dbRefUsers / user globals, so the click threw and did nothing.)
        database.ref().child('users/' + useri + '/posts').once('value').then(function (snapPosts) {
            var jobs = [];
            snapPosts.forEach(function (snapP) {
                jobs.push(database.ref().child('items/' + snapP.key).update({ "status": "inactive" }).catch(function () {}));
            });
            return Promise.all(jobs);
        }).then(function () {
            // RW-SEC-03: the email lives at users_private/{uid}.
            return rwPrivateRef(useri).update({ "email": "" });
        }).then(function () {
            return authUser.delete();
        }).then(function () {
            window.location.href = "login";
        }).catch(function (error) {
            $btn.prop("disabled", false);
            if (error && error.code === "auth/requires-recent-login") {
                $("#deactivateAccountError").text("For your security, log out and back in, then remove your account.");
            } else {
                $("#deactivateAccountError").text("Something went wrong. Please try again.");
            }
        });
    });
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
