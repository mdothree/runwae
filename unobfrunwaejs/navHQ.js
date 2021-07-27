firebase.auth().onAuthStateChanged(function (user) {
    var user = firebase.auth().currentUser;
    if (user) {
        $(".logo").click(function () {
            window.location.href = "https://runwae.com/explore";
        });
        $('.nav-prof').show();
        //show explore control block always
        //welcome control block conditionally show wel
        //hide prof content for both
        useri = user.uid;
        database.ref().child('users/' + useri).once('value', function (snap) {
            handleVerify(user, snap);
            hyperlinkIcons(snap, useri);
            $("#navProfilePicture, #navMobileProfilePicture").attr("src", snap.val().photo_url);
            $("#navProfilePicture, #navMobileProfilePicture").show();
            $("#navName").html(snap.val().name);
            $("#navUsername").html("@" + snap.val().username);
            $('#navName, #navUsername, #navProfilePicture').click(function (event) {
                event.preventDefault();
                profileRelocate(snap, useri);
            });
            // $('header .author-thumb').click(function (event) {
            //     event.preventDefault();
            //     profileRelocate(snap, useri);
            // });
            // $('header .author-page').click(function (event) {
            //     event.preventDefault();
            //     profileRelocate(snap, useri);
            // });
            $('header .author-thumb img').click(function (event) {
                event.preventDefault();
                profileRelocate(snap, useri);
            });
            $('header .author-thumb .author-name').click(function (event) {
                event.preventDefault();
                profileRelocate(snap, useri);
            });
            // $("#btnLogout, .logo").click(function () {
            $("#btnLogout, #acctLogout").click(function () {
                // obj = getCookieObj();
                // obj.auth = false;
                // document.cookie = JSON.stringify(obj);
                firebase.auth().signOut().then(function () {
                    // window.location.href = "welcome";
                }).catch(function (error) {
                    // window.location.href = "welcome";
                });
            });
            if (window.location.href.includes("explore") || window.location.href.includes("account") || window.location.href.includes("gig") || window.location.href.includes("messages") || window.location.href.includes("notifications") || window.location.href.includes("profile")) {
                displayUsers(snap, 6);
                displayConversations(snap, 6);
                displayNotifications(snap, 6);
            }
        });
    } else {
        $('.nav-prof').remove();
        if (window.location.href.includes("explore") || window.location.href.includes("account") || window.location.href.includes("gig") || window.location.href.includes("messages") || window.location.href.includes("notifications")) {
            //window.location.href = "runwae.com/welcome";
            window.location.href = "https://runwae.com/login";
        }
        $(".logo").click(function () {
            window.location.href = "https://runwae.com/welcome";
        });
    }
});

function hyperlinkIcons(snap, useri) {
    // $(".header-content-wrapper .control-icon .badge-icon").click(function () {
    //     window.location.href = "explore";
    // });
    // $(".header-responsive .control-icon .badge-icon").click(function () {
    //     window.location.href = "explore";
    // });
        $(".header .control-icon .mail-icon").click(function () {
        window.location.href = 'messages';
    });
        $(".header .control-icon .notifications-icon").click(function () {
        window.location.href = 'notifications';
    });
        $(".header-content-wrapper .control-icon .storefront-icon").click(function () {
        // profileRelocate(snap, useri);
        window.location.href = 'explore';
    });
    $(".header-content-wrapper .control-icon .storefront-icon").click(function () {
        // profileRelocate(snap, useri);
        window.location.href = 'explore';
    });
    $(".header-responsive .control-icon .storefront-icon").click(function () {
        // profileRelocate(snap, useri);
        window.location.href = 'explore';
    });
    $("#navMobileProfilePicture").click(function () {
        profileRelocate(snap, useri);
    });
}

function handleVerify(user) {
    if (!user.emailVerified) {
        $('#messagedEmail').html(user.email);
        openModal('#open-verifyEmail');
        $('#btnResendVerifyEmail').click(function () {
            sendVerifyEmail(user);
        });
        // database.ref('users/' + user.uid).update({
        //     "email_verified": false
        // });
    } else {
        database.ref('users/' + user.uid).update({
            "email_verified": true
        });
    }
}