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
            return database.ref().child('users/' + useri).update({ "email": "" });
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
