// RW-SEC-03: only the signed-in user's own count is recomputed (from their
// private index); other users recount theirs when they load a page.
function updateUnreadMessagesCount(snapUser, snapRecipient) {
    rwOwnUser(snapUser.key, function () {});
}


function openConversation(snapUser, snapSender, key) {
    useri = snapUser.key;
    rwOwnUser(useri, function (snapOwn) {
        var convs = snapOwn.val() && snapOwn.val().conversations;
        var entry = convs && convs[key];
        if (!entry) return;
        rwOwnPrivateUpdate(snapOwn, 'conversations', key, {
            "read_or_unread": "read"
        });
        database.ref().child('users/' + useri).update({
            "current_conversation": key,
            "current_contact": entry.uid
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
    rwOwnUser(useri, function (snapOwn) {
        var snap = { val: function () { return snapOwn.val() && snapOwn.val().conversations ? snapOwn.val().conversations : null; } };
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

// rw: show the newest message. The thread renders one message per async user lookup, so this runs once the last
// one is in (on load, after opening a conversation and after sending). Images are fixed-size avatars, so the height
// is final; a second pass after layout covers late web-font metrics.
function rwScrollThreadToEnd() {
    var el = document.querySelector(".rw-thread-scroll");
    if (!el) return;
    var go = function () { el.scrollTop = el.scrollHeight; };
    go();
    if (window.requestAnimationFrame) requestAnimationFrame(go);
    setTimeout(go, 250);
}

function displayConversation(snapUser, conversationKey) {
    $("#conversationDisplay").html("");
    useri = snapUser.key;
    var before = ["{{uid}}", "{{src}}", "{{username}}", "{{time}}", "{{body}}"];
    var dbRefConversation = firebase.database().ref().child('conversations/' + conversationKey);
    dbRefConversation.once('value', function (snapConversation) {
        // Local: this used to write the global `obj` that displayConversations() is still walking.
        var obj = snapConversation.val() || {};
        var messagesLength = Object.keys(obj).length;
        getMessage(0);

        function getMessage(i) {
            if (i < messagesLength) {
                var messageObj = obj[Object.keys(obj)[i]];
                displayMessage(messageObj, i);
            } else {
                importScripts();
                rwScrollThreadToEnd();
            }
        }

        function displayMessage(messageObj, i) {
            var senderId = messageObj["uid"];
            database.ref().child('users/' + senderId).once('value', function (snapSender) {
                var after = [messageObj["uid"], snapSender.val().photo_url, snapSender.val().username, timeDisplay(messageObj["time"]), messageObj["body"]];
                displayHTML("#messageInConversationTemplate", "#conversationDisplay", before, after);
                // rw: my own messages sit on the right (bubble style); the template has no viewer context
                var me = firebase.auth().currentUser;
                if (me && senderId === me.uid) $("#conversationDisplay > .messageLi").last().addClass("rw-me");
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
    $('.unreadMessagesCount').text(snapUser.val().unread_messages_count);
    var before = ["{{status}}", "{{key}}", "{{uid}}", "{{src}}", "{{username}}", "{{time}}", "{{body}}"];
    // Locals: the thread view (displayConversation) and a second displayConversations() call run while this
    // list is still loading; with globals the list showed only its first conversation.
    var obj = snapUser.val().conversations;
    var conversationKeys;
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
            } else {
                getConversation(n + 1);
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
            var convObj = snapConv.val();
            if (!convObj) {
                getConversation(n + 1);
                return;
            }
            if (convObj) {
                var messageObj = convObj[Object.keys(convObj)[Object.keys(convObj).length - 1]];
                //                database.ref().child('conversations/' + conversationKeys[n]).orderByKey().limitToLast(1).once('value', function (snapMessage) {
                // The row names the other person in the conversation (users/{me}/conversations/{key}.uid), not the
                // sender of the last message, which is often me.
                var partnerId = conversationObj["uid"] || messageObj["uid"];
                database.ref().child('users/' + partnerId).once('value', function (snapSender) {
                    if (snapSender.val()){
                    var body = messageObj["body"] || "";
                    if (body.length > 30) {
                        body = body.substring(0, 27) + "...";
                    }
                    var after = [conversationObj["read_or_unread"], conversationKeys[n], partnerId, snapSender.val().photo_url, snapSender.val().username, timeDisplay(messageObj["time"]), body];
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
