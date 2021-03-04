//type no media:
//.open-photo-popup-v2 .open-photo-content {
//        /* width: 33%; */
//    /* float: left; */
//}
//with media:
//.open-photo-thumb: display:none
interestColor = "#9a9fbf";

function displayPost(snapVisitor, snapHost, el) {
    $("#open-post .ui-block").hide();
    $("#triggerPostModal").click();
    var key = $(el).closest(".ui-block").attr("id");
    $("#open-post").find("*").off("click");
    useri = snapVisitor.key;
    photoUrl = snapVisitor.val().photo_url;
    role = snapVisitor.val().role;
    database.ref().child('items/' + key).once('value', function (snapItem) {
        itemObj = snapItem.val();
        interestObj = itemObj["interests"];
        interestKeys = Object.keys(interestObj);
        interests = interestKeys.length;
        sharesObj = itemObj["shares"];
        shareKeys = Object.keys(sharesObj);
        $("#postHostName").html(snapHost.val().name);
        $("#open-post #postCaption").html(itemObj["caption"]);
        $("#postInterestsCount").html(itemObj["interests_count"]);
        $("#postCommentsCount").html(itemObj["comments_count"]);
        $("#postSharesCount").html(itemObj["shares_count"]);
        $("#postHostUrl").attr("src", snapHost.val().photo_url);
        $("#postVisitorUrl").attr("src", snapVisitor.val().photo_url);
        $("#postTime").html(timeDisplay(itemObj["time"]));
        $("#postPhotoUrl").attr("src", itemObj["photo_url"]);
        $("#open-post .ui-block").attr("id", key);
        $("#open-post article").attr("id", snapHost.key);
        if (role != "influencer") {
            $("#open-post .btnInterest").addClass("disabled");
            $("#open-post .btnInterest").hide();
            $("#open-post .btnInterest").css("background-color", interestColor);
        } else {
            interestShown();
        }
        if (useri == snapHost) {
            $("#open-post .more").show();
        } else {
            $("#open-post .more").hide();
        }
        if (itemObj["compensation"] == "money") {
            $("#postCompensationIcon").attr("name", "card-outline");
        } else {
            $("#postCompensationIcon").attr("name", "gift-outline");
        }
        if (itemObj["photo_url"] == "") {
            $("#open-post .open-photo-thumb").hide();
            $("#open-post .open-photo-content").css("width", "100%");
        } else {
            $("#open-post .open-photo-thumb").show();
            // $("#open-post .open-photo-content").css("width", "unset");
            // $("#open-post .open-photo-content").css("width", "null");
            $("#open-post .open-photo-content").css("width", "");
            // $("#open-post .open-photo-content").css("width", "33%");
        }
        buttonsShown();
        shared();
        allCommentsHTML();

        function buttonsShown(after) {
            if (itemObj["facebook"]) {
                $("#postFacebook").css("display", null);
            }
            if (itemObj["instagram"]) {
                $("#postInstagram").css("display", null);
            }
            if (itemObj["twitter"]) {
                $("#postTwitter").css("display", null);
            }
            if (itemObj["linkedin"]) {
                $("#postLinkedin").css("display", null);
            }
        }

        function interestShown() {
            var platforms = [];
            for (i = 0; i < interestKeys.length; i++) {
                if (interestObj[interestKeys[i]]["uid"] == useri) {
                    platforms.push(interestObj[interestKeys[i]]["platform"]);
                    $("#open-post .btnInterest").addClass("interested");
                }
            }
            if (!platforms.includes("facebook")) {
                $("#postFacebook").css("background-color", interestColor);
            }
            if (!platforms.includes("instagram")) {
                $("#postInstagam").css("background-color", interestColor);
            }
            if (!platforms.includes("twitter")) {
                $("#postTwitter").css("background-color", interestColor);
            }
            if (!platforms.includes("linkedin")) {
                $("#postLinkedin").css("background-color", interestColor);
            }
        }

        function shared() {
            for (i = 0; i < shareKeys.length; i++) {
                if (sharesObj[shareKeys[i]]["uid"] == useri) {
                    $("#open-post .share-icon").css("fill", sharedColor);
                }
            }
        }

        function allCommentsHTML() {
            removeDisplay = "none";
            var before = ["{{remove_display}}", "{{key}}", "{{uid}}", "{{src}}", "{{username}}", "{{time}}", "{{caption}}"];
            var after = new Array(5);
            $("#postCommentsDisplay").html("");
            commentKeys = Object.keys(itemObj["comments"]);
            comments = itemObj["comments_count"];
            getComment(0, "");

            function getComment(i) {
                if (commentKeys[i]) {
                    database.ref().child('items/' + key + '/comments/' + commentKeys[i]).once('value', function (snap) {
                        getUser(snap.key, snap.val().uid, snap.val().time, snap.val().comment, i);
                    });
                } else {
                    finalize();
                }
            }

            function getUser(key, uid, time, comment, i) {
                database.ref().child('users/' + uid).once('value', function (snap) {
                    if (snap.key == snapVisitor.key) {
                        removeDisplay = "";
                    }
                    after = [removeDisplay, key, uid, snap.val().photo_url, snap.val().username, timeDisplay(time), comment];
                    displayHTML("#commentTemplate", "#postCommentsDisplay", before, after);
                    getComment(i + 1);
                });
            }
        }

        function finalize() {
            // postListeners(snapVisitor, snapHost);
            $("article .post__author-name").on('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                var uid = $(this).closest("article").attr("id");
                profileRelocate(snapVisitor, uid);
            });
            if (role == "influencer") {
                $("#open-post .post-control-button .btn-control.btnInterest").on('click', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    handleInterest(snapVisitor, this);
                });
            }
            $("#open-post .interestsCount").click(function (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                displayInterests(snapVisitor, snapHost, this);
            });
            $("#open-post .share").click(function (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                handleShare(snapVisitor, this);
            });
            $("#open-post #btnWriteComment").click(function (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                writeComment(snapVisitor, this);
            });
            $("#open-post .commentUsername").click(function (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                var uid = $(this).closest(".comment-item").attr("id");
                profileRelocate(snapVisitor, uid);
            });
            if (snapHost.key = snapVisitor.key) {
                $("#open-post .deactivatePost").on('click', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    deactivatePost(snapVisitor, this);
                });
            }
            $("#open-post .ui-block").show();
            importScripts();
        }
    });
}

function deactivatePost(snapUser, el) {
    var key = $(el).closest(".ui-block").attr("id");
    var uid = $(el).closest("article").attr("id");
    database.ref().child('items/' + key).update({
        status: "inactive"
    });
    window.location.reload();
}