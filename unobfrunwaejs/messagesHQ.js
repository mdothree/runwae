var dNow = new Date();
var dNow = dNow.getTime();

firebase.auth().onAuthStateChanged(function (user) {
    var user = firebase.auth().currentUser;
    if (user) {
        useri = user.uid;
        email = user.email;
        database.ref().child('users/' + useri).once('value', function (snapUser) {
            if (window.location.href.includes("messages")) {
                displayConversations(snapUser, 100);
                var conversation = snapUser.val().current_conversation;
                var recipient = snapUser.val().current_contact;
                initContact(snapUser, recipient);
                if (conversation != "") {
                    displayConversation(snapUser, conversation);
                }
                whoToFollow(snapUser, 6, "#influencersToFollowDisplay", "influencer");
                whoToFollow(snapUser, 6, "#brandsToFollowDisplay", "marketer");
                // displayActivity(snapUser, 20);
                $("#btnWriteMessage").click(function () {
                    writeMessage(snapUser);
                });
            }
        });
    }
});



function initContact(snapUser, currentContact) {
    database.ref().child('users/' + currentContact).once('value', function (snapRecipient) {
        $("#conversationRecipient").html(snapRecipient.val().name);
        $("#conversationRecipient").attr("class", currentContact);
    });
}



function writeMessage(snapUser) {
    //reget the info because the current info could have changed
    database.ref().child('users/' + snapUser.key).once('value', function (snapUser) {
        recipient = snapUser.val().current_contact;
        conversation = snapUser.val().current_conversation;
        database.ref().child('users/' + recipient).once('value', function (snapRecipient) {
            if (conversation == "" || !conversation) {
                conversation = database.ref().child('conversations').push().key;
            }
            write(snapUser, snapRecipient, conversation);
        });
    });
}

function write(snapUser, snapRecipient, conversation) {
    database.ref().child('users/' + snapUser.key + '/conversations/' + conversation).update({
        "read_or_unread": "read",
        "uid": snapRecipient.key,
        "time": dNow
    });
    database.ref().child('users/' + snapUser.key).update({
        "current_contact": snapRecipient.key,
        "current_conversation": conversation
    });

    //    if (groupMessage) {
    //        database.ref().child('groups/' + recieverId + '/members').orderByChild('member').on('child_added', function (snap) {
    //            database.ref().child('users/' + snap.val().member + '/conversations/' + conversationId).update({
    //                "read_or_unread": "unread",
    //                "partnerId": receiverId,
    //                "neg_time": dNow * -1
    //            });
    //        });
    //    }

    database.ref().child('users/' + snapRecipient.key + '/conversations/' + conversation).update({
        "read_or_unread": "unread",
        "uid": snapUser.key,
        "time": dNow
    });

    database.ref().child('conversations/' + conversation).push().set({
        "uid": snapUser.key,
        "body": $("textarea#messageInput").val(),
        "time": dNow
    });
    $("textarea#messageInput").val("");
    title = "Message from " + snapUser.val().name;
    body = "Hey " + snapRecipient.val().name.split(" ")[0] + "! " + snapUser.val().name + " sent you a message on Runwae. It reads: " + $("textarea#messageInput").val();
    bodyNote = "Please don't hesitate to email us if there's anything you think we can do better!";
    moreLink = "Runwae.com/messages";
    actionText = "Reply Now";
    sendEmail(snapRecipient.val().email, "You have a message on Runwae!", [title, body, bodyNote, moreLink, actionText]);

    database.ref().child('users/' + snapUser.key).once('value', function (snapUser) {
        database.ref().child('users/' + snapRecipient.key).once('value', function (snapRecipient) {
            updateUnreadMessagesCount(snapUser, snapRecipient);
        });
    });

    database.ref().child('users/' + snapUser.key).once('value', function (snapUser) {
        displayConversations(snapUser, 5);
        displayConversations(snapUser, 100);
        displayConversation(snapUser, snapUser.val().current_conversation);
    });


}