firebase.auth().onAuthStateChanged(function (user) {
    var user = firebase.auth().currentUser;
    console.log(user);
    if (user) {
        useri = user.uid;
        database.ref().child('users/' + useri).once('value', function (snap) {
            handleVerify(user, snap);
            hyperlinkIcons(snap, useri);
            $("#navProfilePicture").attr("src", snap.val().photo_url);
            $("#navName").html(snap.val().name);
            $("#navUsername").html("@" + snap.val().username);
            $('#navName, #navUsername, #navProfilePicture').click(function (event) {
                event.preventDefault();
                profileRelocate(snap, useri);
            });
            $("#btnLogout").click(function () {
                firebase.auth().signOut().then(function () {
                    window.location.href = "welcome";
                }).catch(function (error) {
                    window.location.href = "welcome";
                });
            });
            $('.unreadNotificationsCount').html(snap.val().unread_notifications_count);
            $('.unreadMessagesCount').html(snap.val().unread_messages_count);
            displayUsers(snap, 6);
            displayConversations(snap, 6);
            displayNotifications(snap, 6);
        });
    }
});
function hyperlinkIcons(snap, useri) {
    $(".header-content-wrapper .control-icon .badge-icon").click(function () {
        window.location.href = "explore";
    });
    $(".header-responsive .control-icon .badge-icon").click(function () {
        window.location.href = "explore";
    });
    $(".header-content-wrapper .control-icon .home-icon").click(function () {
        profileRelocate(snap, useri);
    });
    $(".header-responsive .control-icon .home-icon").click(function () {
        profileRelocate(snap, useri);
    });
}
function handleVerify(user) {
    if (!user.emailVerified) {
        $('header').append("<h4 style='padding: 10px; background-color: white; color:red' align='center'>Please Verifiy your Email!</h4>");
    } else {
        database.ref('users/' + user.uid).update({
            "email_verified": true
        });
    }
}
