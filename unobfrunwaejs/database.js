function updateGigStatus(path, status) {
    database.ref().child(path).update({
        "status": status
    });
    window.location.href = "gig";
}

function deactivateAccount(snapUser) {
    useri = snapUser.key;
    openModal("#deactivateAccountModal");
    $("#btnDeactivateConfirmation").click(function () {

        dbRefPosts = dbRefUsers.child('posts');
        database.ref().child('users/' + useri + '/posts').orderByKey().on('child_added', function (snapP) {
            var key = snapP.key;
            database.ref().child('items/' + key).update({
                "status": "inactive"
            });
        });

        database.ref().child('users/' + useri).update({
            "email": ""
        });
        user.delete().then(function () {
            // User deleted.
            window.location.href = "login.html";
        }).catch(function (error) {
            // An error happened.
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
