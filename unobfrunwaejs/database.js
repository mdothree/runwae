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
            previous['users/' + useri + '/email'] = snapUser.child('email').exists() ? snapUser.child('email').val() : null;
            updates['users/' + useri + '/email'] = "";
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
