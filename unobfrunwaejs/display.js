function displayProfile(snap) {
    $("#profilePicture").attr("src", snap.val().photo_url);
    $("#headerPicture").attr("src", snap.val().header_url);
    if (snap.val().name) {
        $(".firstName").html(snap.val().name.split(" ")[0]);
    }
    $("#name").html(snap.val().name);
    $("#username").html("@" + snap.val().username);
    $("#description").html(snap.val().description);
    $("#website").html(snap.val().website);
    $("#website").attr("href", snap.val().website);
    $("#website").attr("target", "_blank");
    $("#industry").html(snap.val().industry);
    $("#gigsCount").html(snap.val().gigs_count);
    $("#role").html(capitalizeFLetter(snap.val().role));
    if (snap.val().city != "" && snap.val().city) {
        $("#city").html(snap.val().city);
        $("#region").append(", " + snap.val().region);
    } else {
        $("#city, #region").remove();
    }
    var ids = ["instagram", "twitter", "facebook", "linkedin"];
    for (i = 0; i <= ids.length; i++) {
        if (snap.val()[ids[i]] == "" || !snap.val()[ids[i]]) {
            $("#" + ids[i]).closest('.label-floating').addClass("is-empty");
        } else {
            $("#" + ids[i]).attr("href", snap.val()[ids[i]]);
            $("#" + ids[i]).show();
        }
    }
    displayBadges(snap);
}

function displayBadges(snap) {
    var dbRefUser = firebase.database().ref().child('users/' + snap.key);
    dbRefUser.once('value', function (snap) {
        //get conversation object
        badgeCount = 0;
        var obj = snap.val().badges;
        for (var key in obj) {
            if (obj[key] >= 5) {
                badgeCount += 1;
                $("#" + key).show();
                var points = Math.floor(obj[key] / 10);
                if (points >= 0) {
                    $("#" + key + "img").html(points);
                }
            }
        }
        if (badgeCount == 0) {
            $(".w-badges").closest(".ui-block-content").html("<br><h6 align='center'>No badges to display</h6><br>");
        }
    });
}