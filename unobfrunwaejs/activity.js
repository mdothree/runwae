//writeActivity(useri, uid, "showed interest in", "post", key); //name showed interest in name's post
//writeActivity(useri, uid, "shared", "post", key); shared name's post
//writeActivity(useri, uid, "favorited", "page", uid); favorited name's page
//writeActivity(useri, "", "posted an item", "", itemKey); posted an item __
//writeActivity(useri, uid, "followed", "", uid); followed name
//writeActivity(useri, uid, "commented on", "post", key); commented on name's post

function writeActivity(useri, uid, action, target, targetKey) {

    var action = {
        "action": action,
        "target": target,
        "target_key": targetKey,
        "actorID": useri,
        "recipientID": uid,
        "time": dNow,
    }

    database.ref().child('activity').push().update(action);
}

function displayActivity(snapUser, limit) {
    $("#activityDisplay").html("");
    var i = 0;
    var total = 0;
    var before = ["{{key}}", "{{src}}", "{{actorID}}", "{{actor}}", "{{action}}", "{{recipientID}}", "{{recipient}}", "{{target}}", "{{time}}"];
    database.ref().child('activity').once('value', function (snap) {
        activityObj = snap.val();
        if (activityObj) {
            actionKeys = Object.keys(activityObj);
            actionKeys = actionKeys.reverse();
            actions = actionKeys.length;
            //followers
            followingObj = snapUser.val().following;
            if(followingObj){
            followingKeys = Object.keys(followingObj);
            following = followingKeys.length;
            followingKeys = followingKeys.reverse();
            getAction(0);
            }else{
            getAction(0);
            }

            function getAction(n) {
                if (n < limit && n < actions) {
                    var actionKey = actionKeys[n];
                    var actionObj = activityObj[actionKey];

                    if (actionObj) {
                        if (checkFollowing(actionObj, followingObj)) {
                            displayAction(actionObj, n);
                        } else {
                            getAction(n + 1);
                        }
                    }
                } else {
                    if ($("#activityDisplay").html() == "") {
                        $("#activityDisplay").html("<br><h6 align='center'>No activity to display</h6><br>");
                    }
                }

            }

            function displayAction(actionObj, n) {
                key = actionObj["target_key"];
                database.ref().child('users/' + actionObj["actorID"]).once('value', function (snapActor) {
                    database.ref().child('users/' + actionObj["recipientID"]).once('value', function (snapRecipient) {
                        if (snapRecipient.val()) {
                            username = snapRecipient.val().username;
                            if (username == undefined){
                                username = "";
                            }
                        } else {
                            username = "";
                        }
                        if (actionObj["target"] == "") {
                            after = [key, snapActor.val().photo_url, snapActor.key, snapActor.val().username, actionObj["action"], snapRecipient.key, username, "", timeDisplay(actionObj["time"])];
                        } else {
                            if (snapRecipient.val()) {
                                after = [key, snapActor.val().photo_url, snapActor.key, snapActor.val().username, actionObj["action"], snapRecipient.key, snapRecipient.val().username + "'s", actionObj["target"], timeDisplay(actionObj["time"])];
                            }else{
                                after = [key, snapActor.val().photo_url, snapActor.key, snapActor.val().username, actionObj["action"], snapRecipient.key, "someone's", actionObj["target"], timeDisplay(actionObj["time"])];

                            }
                            }

                        displayHTML("#activityTemplate", "#activityDisplay", before, after);

                        $(".actionLi").not('.author-thumb').not('.notification-friend').not('.recipient-friend').not('.more').click(function (event) {
                            event.preventDefault();
                            event.stopPropagation();
                            event.stopImmediatePropagation();
                            handleActionRelocate(snapUser, this);
                        });
                        $(".actionLi .recipient-friend").click(function (event) {
                            event.preventDefault();
                            event.stopPropagation();
                            event.stopImmediatePropagation();
                            var uid = $(this).attr("id");
                            profileRelocate(snapUser, uid);
                        });
                        $(".actionLi .notification-friend, .author-thumb").click(function (event) {
                            event.preventDefault();
                            event.stopPropagation();
                            event.stopImmediatePropagation();
                            var uid = $(this).closest(".actionLi").find(".notification-friend").attr("id");
                            profileRelocate(snapUser, uid);
                        });
                        getAction(n + 1);
                    });
                });
            }
        } else {
            if ($("#activityDisplay").html() == "") {
                $("#activityDisplay").html("<br><h6 align='center'>No activity to display</h6><br>");
            }
        }
    });
}

function checkFollowing(actionObj, followingObj) {
    for (key of Object.keys(followingObj)) {
        if (key == actionObj["actorID"] || key == actionObj["recipientID"]) {
            return true;
        }
    }
    return false
}



function handleActionRelocate(snapUser, el) {
    //going to a profile. Actor profile if no recipient
    //Going to ?post for all except follow
    var key = $(el).closest(".actionLi").attr("id");
    var action = $(el).closest(".actionLi").find(".notification-event").attr("id");
    var id = $(el).closest(".actionLi").find(".recipient-friend").attr("id");
    var actorID = $(el).closest(".actionLi").find(".notification-friend").attr("id");
    if (action == "showed interest in") {
        redirect = "profile?post";
    } else if (action == "posted an item") {
        redirect = "profile?post";
        id = actorID;
    } else if (action == "shared") {
        redirect = "profile?post";
    } else if (action == "followed") {
        redirect = "profile";
    } else if (action == "favorited") {
        redirect = "profile";
    } else if (action == "commented on") {
        redirect = "profile?post";
    }
    if (redirect == "gig") {
        database.ref().child('users/' + snapUser.key).update({
            "current_profile": is
        });
    }
    if (redirect == "profile?post") {
        database.ref().child('users/' + snapUser.key).update({
            "current_item": key,
            "current_profile": id
        });
    }

    window.location.href = redirect;
}
