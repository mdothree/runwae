var dNow = new Date();
var dNow = dNow.getTime();

function writeComment(snapVisitor, el) {
    useri = snapVisitor.key;
    var key = $(el).closest(".ui-block").attr("id");
    var uid = $(el).closest(".ui-block").find("article").attr("id");
    comment = $(el).closest("form").find("textarea#postCommentInput").val();
    commentKey = database.ref().child('items/' + key + '/comments').push().key;
    database.ref().child('items/' + key + '/comments/' + commentKey).update({
        "time": dNow,
        "uid": useri,
        "comment": comment
    });
    if (useri != uid) {
        writeNotification(useri, uid, snapVisitor.val().username, "commented on", "your post", key);
        writeActivity(useri, uid, "commented on", "post", key);
    }
    updateCommentsCount(key);
    appendComment(snapVisitor, key, dNow, comment)
}


function removeComment(snapVisitor, snapHost, el) {
    useri = snapVisitor.key;
    //    uid = snapHost.key;
    var postKey = $(el).closest(".ui-block").attr("id");
    var postuid = $(el).closest(".ui-block").find("article").attr("id");
    var commentKey = $(el).attr("id");
    var commentuid = $(el).closest(".comment-item").attr("id");
    if (useri == commentuid) {
        database.ref().child('items/' + postKey + '/comments/' + commentKey).remove();
        $(el).closest(".comment-item").remove();
    }
    updateCommentsCount(postKey);
}


function updateCommentsCount(key) {
    firebase.database().ref().child('items/' + key + '/comments').once('value', function (snap) {
        var obj = snap.val();
        if (obj) {
            commentsCount = Object.keys(obj).length;
        } else {
            commentsCount = 0;
        }
        database.ref().child('items/' + key).update({
            "comments_count": Number(commentsCount)
        });
        refreshCommentsCount(key, commentsCount)
    });
}

function refreshCommentsCount(key, commentsCount) {
    $(".ui-block#" + key + " .allComments span").html(commentsCount);
    $("#postCommentsCount").html(commentsCount);
}

function appendComment(snapVisitor, key, time, comment) {
    var before = ["{{uid}}", "{{src}}", "{{username}}", "{{time}}", "{{caption}}"];
    after = [snapVisitor.key, snapVisitor.val().photo_url, snapVisitor.val().username, timeDisplay(time), comment];
    displayHTML("#commentTemplate", "#postCommentsDisplay", before, after);
}
