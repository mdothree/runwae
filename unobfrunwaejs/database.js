function updateGigStatus(path, status) {
    database.ref().child(path).update({
        "status": status
    });
    window.location.href = "gig";
}

function deactivateAccount(snapUser) {
    // Remove account: the user confirms in #deactiveAccountModal (and re-enters their password when they
    // signed in with one). Then: posts marked inactive + profile email blanked (one atomic update), then the
    // sign-in is deleted. If the sign-in delete fails, the database update is put back, so nothing changes.
    var useri = snapUser.key;
    $("#deactivateError").text("");
    $("#deactivatePassword").val("");
    var current = firebase.auth().currentUser;
    var usesPassword = !!(current && current.providerData && current.providerData.some(function (p) {
        return p && p.providerId === "password";
    }));
    $("#deactivatePasswordField").toggle(usesPassword);
    openModal("#deactiveAccountModal");
    $(usesPassword ? "#deactivatePassword" : "#btnDeactivateConfirmation").focus();
    $("#btnDeactivateConfirmation").off("click").on("click", function (event) {
        event.preventDefault();
        var btn = $(this);
        if (btn.attr("aria-disabled") === "true") {
            return;
        }
        var user = firebase.auth().currentUser;
        if (!user || user.uid !== useri) {
            $("#deactivateError").text("You are signed out. Sign in again, then remove your account from Account settings.");
            return;
        }
        var password = $("#deactivatePassword").val();
        if (usesPassword && !password) {
            $("#deactivateError").text("Enter your password to confirm.");
            return;
        }
        $("#deactivateError").text("");
        btn.attr("aria-disabled", "true").text("Removing...");
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
                    // only posts that exist and belong to this user can be marked inactive
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
            // User deleted (Firebase signs them out with it).
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
                btn.attr("aria-disabled", "false").text("Remove my account");
                $("#deactivateError").text(restored ? removalErrorMessage(error) + " Nothing was changed." :
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
        return "For your security, Runwae needs a recent sign-in to remove an account. Log out, sign in again, then remove your account.";
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
