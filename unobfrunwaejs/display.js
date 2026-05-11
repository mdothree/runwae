function displayProfile(snap) {
    $("#profilePicture").attr("src", snap.val().photo_url);
    $("#headerPicture").attr("src", snap.val().header_url);
    if (snap.val().name) {
        $(".firstName").text(snap.val().name.split(" ")[0]);
    }
    $("#name").text(snap.val().name);
    $("#username").text("@" + snap.val().username);
    // Use SafeRender for descriptions to support line breaks safely
    if (typeof SafeRender !== 'undefined') {
        SafeRender.setTextWithBreaks("#description", snap.val().description);
    } else {
        $("#description").text(snap.val().description);
    }
    $("#website").text(snap.val().website);
    $("#website").attr("href", snap.val().website);
    $("#website").attr("target", "_blank");
    $("#industry").text(snap.val().industry);
    $("#gigsCount").text(snap.val().gigs_count);
    $("#role").text(capitalizeFLetter(snap.val().role));
    if (snap.val().city != "" && snap.val().city) {
        $("#city").text(snap.val().city);
        $("#region").text(", " + snap.val().region);
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
                    $("#" + key + "img").text(points);
                }
            }
        }
        if (badgeCount == 0) {
            $(".w-badges").closest(".ui-block-content").html("<br><h6 align='center'>No badges to display</h6><br>");
        }
    });
}