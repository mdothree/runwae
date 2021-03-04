function updateUnreadMessagesCount(snapUser, snapRecipient) {
    firebase.database().ref().child('users/' + snapUser.key + '/conversations').once('value', function (snap) {
        var obj = snap.val();
        database.ref().child('users/' + snapUser.key).update({
            "unread_messages_count": getUnreadCount(obj)
        });
    });
    firebase.database().ref().child('users/' + snapRecipient.key + '/conversations').once('value', function (snap) {
        var obj = snap.val();
        database.ref().child('users/' + snapRecipient.key).update({
            "unread_messages_count": getUnreadCount(obj)
        });
    });
}


function openConversation(snapUser, snapSender, key) {
    useri = snapUser.key;
    database.ref().child('users/' + useri + '/conversations/' + key).update({
        "read_or_unread": "read"
    });
    database.ref().child('users/' + useri + '/conversations/' + key).once('value', function (snap) {
        database.ref().child('users/' + useri).update({
            "current_conversation": key,
            "current_contact": snap.val().uid
        });

        updateUnreadMessagesCount(snapUser, snapSender);

        if (window.location.href.includes("messages")) {
            displayConversation(useri, key);
        } else {
            window.location.href = "messages";
        }
    });
}

function openUserConversation(snapUser, uid) {
    useri = snapUser.key;
    database.ref().child('users/' + useri + '/conversations').once('value', function (snap) {
        if(!snap.val()){
            database.ref().child('users/' + useri).update({
                "current_contact": uid,
                "current_conversation": ""
            });
             window.location.href = "messages";
        }else{
        convsOb = snap.val();
        conKeys = Object.keys(convsOb);
        found = false;
        if (!conKeys){
            convKeys = False;
        }
        else{
            for (key of conKeys){
                console.log(key);
                if (convsOb[key]["uid"] == uid){
                    conversationKey = key;
                    found = true;
                }
            }
        }
        if (!found) {
            database.ref().child('users/' + useri).update({
                "current_contact": uid,
                "current_conversation": ""
            });
        } else {
            database.ref().child('users/' + useri).update({
                "current_contact": uid,
                "current_conversation": conversationKey
            });
        }
        if (window.location.href.includes("messages")) {
            displayConversation(useri, "");
        } else {
            window.location.href = "messages";
        }
        }
    });
}

function displayConversation(snapUser, conversationKey) {
    $("#conversationDisplay").html("");
    useri = snapUser.key;
    var before = ["{{uid}}", "{{src}}", "{{username}}", "{{time}}", "{{body}}"];
    var dbRefConversation = firebase.database().ref().child('conversations/' + conversationKey);
    dbRefConversation.once('value', function (snapConversation) {
        obj = snapConversation.val();
        var messagesLength = Object.keys(obj).length;
        getMessage(0);

        function getMessage(i) {
            if (i < messagesLength) {
                var messageObj = obj[Object.keys(obj)[i]];
                displayMessage(messageObj, i);
            } else {
                importScripts();
            }
        }

        function displayMessage(messageObj, i) {
            senderId = messageObj["uid"];
            database.ref().child('users/' + senderId).once('value', function (snapSender) {
                var after = [messageObj["uid"], snapSender.val().photo_url, snapSender.val().username, timeDisplay(messageObj["time"]), messageObj["body"]];
                displayHTML("#messageInConversationTemplate", "#conversationDisplay", before, after);
                $(".messageLi .notification-friend").click(function (event) {
                    event.preventDefault();
                        event.stopImmediatePropagation();
                        event.stopPropagation();
                    var key = $(this).closest(".author-thumb").attr("id");
                    window.location.href = "profile?" + key;
                });
                $(".messageLi .author-thumb").click(function (event) {
                    event.preventDefault();
                        event.stopImmediatePropagation();
                        event.stopPropagation();
                    var key = $(this).attr("id");
                    window.location.href = "profile?" + key;
                });
                getMessage(i + 1);

            });
        }
    });

}



function displayConversations(snapUser, limit) {
    if (limit < 7) {
        $("#navConversationsDisplay, #mobileNavConversationsDisplay").html("");
    } else {
        $("#conversationsDisplay").html("");
    }
    $('.unreadMessagesCount').html(snapUser.val().unread_messages_count);
    var before = ["{{status}}", "{{key}}", "{{uid}}", "{{src}}", "{{username}}", "{{time}}", "{{body}}"];
    var i = 0;
    var total = 0;
    obj = snapUser.val().conversations;
    if (obj) {
        conversationKeys = Object.keys(obj);
        var conversations = conversationKeys.length;
        conversationKeys = conversationKeys.reverse();
        getConversation(0);
    } else {
        if (limit < 7) {
            $("#navConversationsDisplay, #mobileNavConversationsDisplay").html("<h6 align='center'>No conversations to display</h6>");
        } else {
            $("#conversationsDisplay").html("<br><h6 align='center'>No conversations to display</h6><br>");
        }

    }

    function getConversation(n) {
        if (n < limit && n < conversations) {
            var conversationKey = conversationKeys[n];
            var conversationObj = obj[conversationKey];
            if (conversationObj) {
                displayConversation(conversationObj, n);
            }
        } else {
            if (limit < 7 && $("#navConversationsDisplay, #mobileNavConversationsDisplay").html() == "") {
                $("#navConversationsDisplay, #mobileNavConversationsDisplay").html("<h6 align='center'>No conversations to display</h6>");
            } else if (limit > 7 && $("#conversationsDisplay").html() == "") {
                $("#conversationsDisplay").html("<br><h6 align='center'>No conversations to display</h6><br>");
            }
            importScripts();
        }
    }

    function displayConversation(conversationObj, n) {
        database.ref().child('conversations/' + conversationKeys[n]).once('value', function (snapConv) {
            convObj = snapConv.val();
            if (convObj) {
                messageObj = convObj[Object.keys(convObj)[Object.keys(convObj).length - 1]];
                //                database.ref().child('conversations/' + conversationKeys[n]).orderByKey().limitToLast(1).once('value', function (snapMessage) {
                database.ref().child('users/' + messageObj["uid"]).once('value', function (snapSender) {
                    if (snapSender.val()){
                    body = messageObj["body"];
                    if (body.length > 30) {
                        body = body.substring(0, 27) + "...";
                    }
                    var after = [conversationObj["read_or_unread"], conversationKeys[n], messageObj["uid"], snapSender.val().photo_url, snapSender.val().username, timeDisplay(messageObj["time"]), body];
                    if (limit < 7) {
                        displayHTML("#conversationTemplate", "#mobileNavConversationsDisplay", before, after);
                        displayHTML("#conversationTemplate", "#navConversationsDisplay", before, after);
                    } else {
                        displayHTML("#conversationTemplate", "#conversationsDisplay", before, after);
                    }
                    $(".conversationLi .notification-friend").click(function (event) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        event.stopPropagation();
                        var uid = $(this).closest('.conversationLi').find(".author-thumb").attr("id");
                        profileRelocate(snapUser, uid);
                    });
                    $(".conversationLi .author-thumb").click(function (event) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        event.stopPropagation();
                        var uid = $(this).attr("id");
                        profileRelocate(snapUser, uid);
                    });
                    $(".chat-message .conversationLi").find("*").not('.author-thumb').not('.notification-friend').not('.more').click(function (event) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        event.stopPropagation();
                        var key = $(this).closest('.conversationLi').attr("id");
                        openConversation(snapUser, snapSender, key);
                    });
                }
                    getConversation(n + 1);
                });
            }
        });
    }
}
