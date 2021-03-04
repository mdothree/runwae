var dNow = new Date();
var dNow = dNow.getTime();

function handleWriteReview(visitorSnap, hostSnap) {
    hostObj = hostSnap.val();
    reviewable = false;
    // console.log(Object.keys(hostObj["gigs"]));
    for (var gigkey of Object.keys(hostObj["gigs"])) {
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
    displayReviews(hostSnap);
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
    $("#reviewsCount").html(reviewsCount);
}


function displayReviews(snap) {
    $("#reviewsDisplay").html("");
    before = ["{{key}}", "{{body}}", "{{rating}}", "{{uid}}", "{{username}}", "{{time}}"]
    var obj = snap.val().reviews_received;
    reviewCount = 0;
    if (snap.val().reviews_received_count) {
        $("#reviewsCount").html(snap.val().reviews_received_count);
    } else {
        $("#reviewsCount").html(reviewCount);
    }
    if (obj) {
        total = Object.keys(obj).length;
        for (var key of Object.keys(obj)) {
            database.ref().child('users/' + obj[key]["uid"]).once('value', function (snapReviewer) {
                after = [key, obj[key]["body"], obj[key]["rating"], obj[key]["uid"], snapReviewer.val().username, timeDisplay(obj[key]["time"])];
                reviewCount = reviewCount + 1;
                displayHTML("#reviewTemplate", "#reviewsDisplay", before, after);
            });
        }
        if (reviewCount == 0) {
            $("#reviewsDisplay").html("<br><h6 align='center'>No reviews to display</h6><br>");
        }
    } else {
        $("#reviewsDisplay").html("<br><h6 align='center'>No reviews to display</h6><br>");
    }
}