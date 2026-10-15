function displayProfile(snap) {
    $("#profilePicture").attr("src", snap.val().photo_url);
    $("#headerPicture").attr("src", snap.val().header_url);
    if (snap.val().name) {
        $(".firstName").text(snap.val().name.split(" ")[0]);
    }
    $("#name").text(snap.val().name);
    // profile.html prints the "@" before #username, so the value goes in bare (was "@@name").
    $("#username").text(snap.val().username || "");
    // Use SafeRender for descriptions to support line breaks safely
    if (typeof SafeRender !== 'undefined') {
        SafeRender.setTextWithBreaks("#description", snap.val().description);
    } else {
        $("#description").text(snap.val().description);
    }
    // User-entered URLs: http(s) only for the website; social links are built
    // from a fixed platform base + handle (util.js). Missing helper = no link.
    var websiteUrl = (typeof rwExternalUrl === 'function') ? rwExternalUrl(snap.val().website) : '';
    if (websiteUrl) {
        $("#website").text(snap.val().website).attr("href", websiteUrl)
            .attr("target", "_blank").attr("rel", "noopener noreferrer nofollow").show();
    } else {
        $("#website").text("").removeAttr("href").hide();
    }
    $("#industry").text(snap.val().industry);
    $("#gigsCount, #gigsCountStat").text(snap.val().gigs_count || 0);
    $("#role").text(capitalizeFLetter(snap.val().role));
    if (snap.val().city != "" && snap.val().city) {
        $("#city").text(snap.val().city);
        $("#region").text(", " + snap.val().region);
    } else {
        $("#city, #region").remove();
    }
    rwTrustSignals(snap.val());
    var ids = ["instagram", "twitter", "facebook", "linkedin"];
    for (var i = 0; i < ids.length; i++) {
        var socialUrl = (typeof rwSocialUrl === 'function') ? rwSocialUrl(ids[i], snap.val()[ids[i]]) : '';
        if (!socialUrl) {
            $("#" + ids[i]).closest('.label-floating').addClass("is-empty");
            $("#" + ids[i]).attr("href", "#").hide();
        } else {
            $("#" + ids[i]).attr("href", socialUrl).attr("rel", "noopener noreferrer nofollow");
            $("#" + ids[i]).show();
        }
    }
    displayBadges(snap);
}

// Profile sidebar facts, only from data the record really has (no presence or response-time data exists, so
// those badges are gone). Member since = year of users/{uid}/time, which auth.js createUser() writes at signup.
function rwTrustSignals(u) {
    u = u || {};
    var loc = [u.city, u.region].filter(function (x) { return x; }).join(", ");
    $("#locationBadge").text(loc).closest(".trust-badge").prop("hidden", !loc);
    var joined = Number(u.time);
    var year = joined > 1262304000000 && joined <= Date.now() ? new Date(joined).getFullYear() : null;
    $(".member-since").text(year ? "Member since " + year : "").closest(".trust-badge").prop("hidden", !year);
    $("#trustSignals").prop("hidden", !loc && !year);
}

function displayBadges(snap) {
    var dbRefUser = firebase.database().ref().child('users/' + snap.key);
    dbRefUser.once('value', function (snap) {
        //get conversation object
        var badgeCount = 0;
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