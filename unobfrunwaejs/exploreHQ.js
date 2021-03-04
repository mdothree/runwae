tabAction();
firebase.auth().onAuthStateChanged(function (user) {
    var user = firebase.auth().currentUser;
    if (user) {
        useri = user.uid;
        email = user.email;
        database.ref().child('users/' + useri).once('value', function (snap) {
            var role = snap.val().role;
            if (role == "marketer") {
                $("#writePostBlock").show();
                writePostAssist(snap);
                tabAction();
            } else {
                $("#writePostBlock").remove();
            }
            displayFeed(snap, "#newsfeed-items-grid");
            whoToFollow(snap, 6, "#influencersToFollowDisplay", "influencer");
            whoToFollow(snap, 6, "#brandsToFollowDisplay", "marketer");
            displayActivity(snap, 20);
        });
    }
});