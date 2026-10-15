var dNow = new Date();
var dNow = dNow.getTime();

function handleWriteReview(visitorSnap, hostSnap) {
    hostObj = hostSnap.val();
    reviewable = false;
    // console.log(Object.keys(hostObj["gigs"]));
    for (var gigkey of Object.keys(hostObj["gigs"] || {})) {
        if (hostObj["gigs"][gigkey]) {
            if (hostObj["gigs"][gigkey]["uid"] == visitorSnap.key) {
                reviewable = true;
                break;
            }
        }
    }
    if( hostObj["reviews_received"]){
    for (var reviewkey of Object.keys(hostObj["reviews_received"])) {
        if (hostObj["reviews_received"][reviewkey]) {
            if (hostObj["reviews_received"][reviewkey]["uid"] == visitorSnap.key) {
                reviewable = false;
                $('#reviewSubmissionBlock').remove();
                break;
            }
        }
    }
    }
    if (!reviewable) {
        $('#reviewSubmissionBlock').remove();
    } else {
        $('#reviewSubmissionBlock').show();
    }
    $(".writeReview").click(function () {
        $('#writeReviewDiv').hide();
        $('#submitReviewDiv').show();
    });
    $("#btnCancelReview").click(function (e) {
        e.preventDefault();
        $('#submitReviewDiv').hide();
        $('#writeReviewDiv').show();
    });
    $("#btnSubmitReview").click(function (e) {
        e.preventDefault();
        postReview(visitorSnap, hostSnap);
    });
    $("#writeReviewInput").on('input', function () {
        if ($("#writeReviewInput").val() < 0) {
            $("#writeReviewInput").val(0);
        } else if ($("#writeReviewInput").val() > 10) {
            $("#writeReviewInput").val(10);
        }
        $("#writeReviewInput").val(Number($("#writeReviewInput").val()).toFixed(0));
    });

}

function postReview(visitorSnap, hostSnap) {
    console.log(true);
    reviewKey = database.ref().child('items/' + hostSnap.key + '/reviews_received').push().key;
    database.ref().child('users/' + hostSnap.key + '/reviews_received/' + reviewKey).update({
        "time": dNow,
        "uid": visitorSnap.key,
        "rating": $("#reviewRatingInput").val(),
        "body": $("textarea#reviewBodyInput").val()
    });
    database.ref().child('users/' + visitorSnap.key + '/reviews_written/' + reviewKey).update({
        "time": dNow,
        "uid": visitorSnap.key
    });
    analytics.logEvent('review', {
        category: 'engagement',
        review_key: reviewKey,
        review_rating: $("#reviewRatingInput").val(),
        actor_industry: visitorSnap.val().industry,
        actor_id: visitorSnap.key,
        recipient_industry: hostSnap.val().industry,
        recipeint_id: hostSnap.key
    });
    updateReviewsCount(visitorSnap, hostSnap);
    writeNotification(visitorSnap.key, hostSnap.key, visitorSnap.val().username, "left a review on", "your profile", visitorSnap.key);
    database.ref().child('users/' + hostSnap.key).once('value', function (snapHost) {
        displayReviews(snapHost);
    });
    $('#reviewSubmissionBlock').remove();
}


function updateReviewsCount(visitorSnap, hostSnap) {
    firebase.database().ref().child('users/' + hostSnap.key + '/reviews_received').once('value', function (snap) {
        var obj = snap.val();
        if (obj) {
            reviewsCount = Object.keys(obj).length;
        } else {
            reviewsCount = 0;
        }
        database.ref().child('users/' + hostSnap.key).update({
            "reviews_received_count": Number(reviewsCount)
        });
        refreshReviewsCount(reviewsCount);
    });
    firebase.database().ref().child('users/' + visitorSnap.key + '/reviews_written').once('value', function (snap) {
        var obj = snap.val();
        if (obj) {
            reviewsCount = Object.keys(obj).length;
        } else {
            reviewsCount = 0;
        }
        database.ref().child('users/' + visitorSnap.key).update({
            "reviews_written_count": Number(reviewsCount)
        });
    });
}

function refreshReviewsCount(reviewsCount) {
    $("#reviewsCount").text(reviewsCount);
}


// Rating summary (sidebar + Reviews header): average of the ratings shown, out of 10 like the review form.
function rwRatingSummary(count, ratings) {
    var sum = 0;
    for (var i = 0; i < ratings.length; i++) sum += ratings[i];
    $(".rating-value").text(ratings.length ? (sum / ratings.length).toFixed(1) + " / 10" : "");
    $(".rating-count").text(count ? "(" + count + (count === 1 ? " review)" : " reviews)") : "No reviews yet");
    // "No reviews yet" is said once, by the Reviews list; the sidebar and header summaries hide until there are reviews.
    $(".rating-summary, .rating-summary-inline").prop("hidden", !count);
}

// One row per review: reviewer, time, text, score. Each row gets its own review object (the old loop
// shared one `key` across async callbacks, so every row showed the last review's text), and the list is
// written once all reviewer lookups are back (the old empty-state check ran before any of them returned,
// so "No reviews to display" showed above the reviews).
function displayReviews(snap) {
    var $list = $("#reviewsDisplay");
    var before = ["{{key}}", "{{body}}", "{{rating}}", "{{uid}}", "{{username}}", "{{time}}"];
    var obj = snap.val().reviews_received || {};
    var keys = Object.keys(obj).filter(function (k) {
        return obj[k] && obj[k]["uid"];
    }).sort(function (a, b) {
        return (Number(obj[b]["time"]) || 0) - (Number(obj[a]["time"]) || 0);
    });
    var ratings = [];
    keys.forEach(function (k) {
        var r = Number(obj[k]["rating"]);
        if (!isNaN(r)) ratings.push(r);
    });
    rwRatingSummary(keys.length, ratings);
    if (!keys.length) {
        $list.html('<li class="rw-review rw-review--empty">No reviews yet</li>');
        return;
    }
    var rows = new Array(keys.length);
    var pending = keys.length;
    function done() {
        pending -= 1;
        if (pending === 0) $list.html(rows.join(""));
    }
    keys.forEach(function (key, i) {
        var review = obj[key];
        database.ref().child('users/' + review["uid"]).once('value', function (snapReviewer) {
            var reviewer = snapReviewer.val();
            var rating = Number(review["rating"]);
            var after = [key, review["body"] || "", isNaN(rating) ? "" : String(rating), review["uid"],
                reviewer && reviewer.username ? reviewer.username : "Former member", timeDisplay(review["time"])];
            rows[i] = replaceText($("#reviewTemplate").html(), before, after);
            done();
        }, function () {
            rows[i] = "";
            done();
        });
    });
}
