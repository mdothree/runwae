firebase.auth().onAuthStateChanged(function (user) {
    var user = firebase.auth().currentUser;
    if (user) {
        useri = user.uid;
        email = user.email;
        database.ref().child('users/' + useri).once('value', function (snap) {
            if (window.location.href.includes("notifications")) {
                displayNotifications(snap, 100);
                whoToFollow(snap, 6, "#influencersToFollowDisplay", "influencer");
                whoToFollow(snap, 6, "#brandsToFollowDisplay", "marketer");
                displayActivity(snap, 20);
            }
        });
    }
});
