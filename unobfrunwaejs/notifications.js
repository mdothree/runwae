function notifyAll(userKey, username, action, target, targetKey) {
    database.ref().child('users').once('value', function (snap) {
        usersObj = snap.val();
        for (uKey of Object.keys(usersObj)) {
            if (uKey != userKey){
                writeNotification(userKey, ukey, username, action, target, targetKey); 
            }
        }
    });
}

function writeNotification(useri, uid, username, action, target, targetKey) {

    var notification = {
        "action": action,
        "target": target,
        "username": username,
        "target_key": targetKey,
        "uid": useri,
        "read_or_unread": "unread",
        "time": dNow,
    }

    notificationKey = database.ref().child('users/' + uid + '/notifications').push().key;
    database.ref().child('users/' + uid + '/notifications/' + notificationKey).update(notification);


    database.ref().child('users/' + uid).once('value', function (snap) {
        updateUnreadNotificationsCount(snap);
        title = "Notification from " + username;
        body = "Hey " + snap.val().name.split(" ")[0] + "! Have you logged into Runwae lately? It looks like " + username + " just " + action + " " + target + ".";
        bodyNote = "Don't miss the action! Please don't hesitate to email us if there's anything you think we can do better!";
        moreLink = "Runwae.com/notifications";
        actionText = "Check Notifications";
        if (action != "favorited") {
            sendEmail(snap.val().email, 'You have a notification on Runwae!', [title, body, bodyNote, moreLink, actionText]);
        }
    });
}


function displayNotifications(snapUser, limit) {
    $('.unreadNotificationsCount').html(snapUser.val().unread_notifications_count);
    if (limit < 7) {
        $("#navNotificationsDisplay").html("");
        $("#mobileNavNotificationsDisplay").html("");
    } else {
        $("#notificationsDisplay").html("");
    }
    var i = 0;
    var total = 0;
    var notificationBefore = ["{{status}}", "{{target_key}}", "{{uid}}", "{{src}}", "{{username}}", "{{action}}", "{{target}}", "{{time}}", "{{icon}}", "{{key}}"];
    var obj = snapUser.val().notifications;
    if (obj) {
        notificationKeys = Object.keys(obj);
        notifications = notificationKeys.length;
        notificationKeys = notificationKeys.reverse();
        var notifications = Object.keys(obj).length;
        getNotification(0);
    } else {
        if (limit < 7) {
            $("#navNotificationsDisplay, #mobileNavNotificationsDisplay").html("<br><h6 align='center'>No notifications to display</h6><br>");
        } else {
            $("#notificationsDisplay").html("<br><h6 align='center'>No notifications to display</h6><br>");
        }
        importScripts();
    }

    function getNotification(n) {
        if (n < limit && n < notifications) {
            var notificationKey = notificationKeys[n];
            var notificationObj = obj[notificationKey];
            if (notificationObj) {
                displayNotification(notificationObj, n);
            }
        }
    }

    function displayNotification(notificationObj, n) {
        key = notificationKeys[n];
        var icon = getIcon(notificationObj["action"]);
        database.ref().child('users/' + notificationObj["uid"]).once('value', function (snapSender) {




            if (limit < 7) {
                notificationAfter = [notificationObj["read_or_unread"], notificationObj["target_key"], snapSender.key, snapSender.val().photo_url, snapSender.val().username, notificationObj["action"], notificationObj["target"], timeDisplay(notificationObj["time"]), icon, key];
                displayHTML("#notificationTemplate", "#navNotificationsDisplay", notificationBefore, notificationAfter, i, total);
                displayHTML("#notificationTemplate", "#mobileNavNotificationsDisplay", notificationBefore, notificationAfter, i, total);

            } else {
                notificationAfter = [notificationObj["read_or_unread"], notificationObj["target_key"], snapSender.key, snapSender.val().photo_url, snapSender.val().username, notificationObj["action"], notificationObj["target"], timeDisplay(notificationObj["time"]), icon, key];
                displayHTML("#notificationTemplate", "#notificationsDisplay", notificationBefore, notificationAfter, i, total);
            }


            $(".notificationLi").not('.author-thumb').not('.notification-friend').not('.more').click(function (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                handleRelocate(snapUser, this);
            });
            $(".notificationLi .notification-friend, .notificationLi .author-thumb").click(function (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                var uid = $(this).closest(".notificationLi").find(".author-thumb").attr("id");
                profileRelocate(snapUser, uid);
            });
            $(".notificationLi .more").click(function (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                removeNotification(snapUser, this);
            });
            getNotification(n + 1);
        });
    }
}

function removeNotification(snapUser, el) {
    key = $(el).closest(".notificationLi").find(".more").attr("id");
    useri = snapUser.key;
    database.ref().child('users/' + useri + '/notifications/' + key).remove();
    database.ref().child('users/' + useri).once('value', function (snapUser) {
        updateUnreadNotificationsCount(snapUser);
        displayNotifications(snapUser, 6);
    });
}



function getIcon(action) {
    if (action == "shipped for") {
        className = "fa fa-box-open";
    } else if (action == "posted for") {
        className = "fa fa-photo";
    } else if (action == "accepted payment for") {
        className = "fa fa-check-circle";
    } else if (action == "followed") {
        className = "fa fa-check-circle";
    } else if (action == "unfollowed") {
        className = "fa fa-check-circle";
        return className;
    }
}

function handleRelocate(snapUser, el) {
    key = $(el).closest(".notificationLi").find(".more").attr("id");
    var targetKey = $(el).closest(".notificationLi").attr("id");
    var action = $(el).closest(".notificationLi").find(".notification-event").attr("id");
    var id = $(el).closest(".notificationLi").find(".author-thumb").attr("id");
    database.ref().child('users/' + snapUser.key + '/notifications/' + key).update({
        "read_or_unread": "read"
    });
    updateUnreadNotificationsCount(snapUser);
    if (action == "showed interest in") {
        redirect = "profile?post";
    } else if (action == "requested a proposal for") {
        redirect = "gig";
    } else if (action == "submitted a proposal for") {
        redirect = "gig";
    } else if (action == "declined") {
        redirect = "gig";
    } else if (action == "paid you for") {
        redirect = "gig";
    } else if (action == "shipped for") {
        redirect = "gig";
    } else if (action == "posted for") {
        redirect = "gig";
    } else if (action == "verified") {
        redirect = "gig";
    } else if (action == "accepted") {
        redirect = "gig";
    } else if (action == "followed") {
        redirect = "profile";
    } else if (action == "unfollowed") {
        redirect = "profile";
    } else if (action == "favorited") {
        redirect = "profile";
    } else if (action == "unfavorited") {
        redirect = "profile";
    } else if (action == "shared") {
        redirect = "profile?post";
    } else if (action == "commented on") {
        redirect = "profile?post";
    } else {
        redirect = null;
    }
    if (redirect) {
        if (redirect == "gig") {
            database.ref().child('users/' + snapUser.key).update({
                "current_gig": targetKey
            });
        }
        if (redirect == "profile") {
            database.ref().child('users/' + snapUser.key).update({
                "current_profile": snapUser.key
            });
        }
        if (redirect == "profile?post") {
            database.ref().child('users/' + snapUser.key).update({
                "current_item": targetKey,
                "current_profile": snapUser.key
            });
        }
        window.location.href = redirect;
    } else {
        profileRelocate(snapUser, snapUser.key);
    }
}

function updateUnreadNotificationsCount(snapUser) {
    firebase.database().ref().child('users/' + snapUser.key + '/notifications').once('value', function (snap) {
        var obj = snap.val();
        database.ref().child('users/' + snapUser.key).update({
            "unread_notifications_count": getUnreadCount(obj)
        });
    });
}