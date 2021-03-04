var dNow = new Date();
var dNow = dNow.getTime();

sharedColor = "lightblue";

// window.fbAsyncInit = function () {
//     FB.init({
//         appId: 'xxxxx',
//         status: true,
//         cookie: true,
//         xfbml: true
//     });
// };
// (function (d, debug) {
//     var js, id = 'facebook-jssdk',
//         ref = d.getElementsByTagName('script')[0];
//     if (d.getElementById(id)) {
//         return;
//     }
//     js = d.createElement('script');
//     js.id = id;
//     js.async = true;
//     js.src = "//connect.facebook.net/en_US/all" + (debug ? "/debug" : "") + ".js";
//     ref.parentNode.insertBefore(js, ref);
// }(document, /*debug*/ false));

function postToFeed(title, description, url, imageurl, snapUser, uid, key) {
    var obj = {
        method: 'feed',
        link: url,
        picture: imageurl,
        name: title,
        description: description
    };

    function callback(response, snapUser, uid, key) {
        useri = snapUser.key;
        shareKey = database.ref().child('items/' + key + '/shares').push().key;
        database.ref().child('items/' + key + '/shares/' + shareKey).update({
            "time": dNow,
            "uid": useri
        });
        database.ref().child('users/' + snapUser.key + '/shares/' + shareKey).update({
            "time": dNow,
            "key": key
        });
        analytics.logEvent('share', {
            category: 'engagement',
            share_key: shareKey,
            actor_industry: snapUser.val().industry,
            actor_id: snapUser.key,
            recipient_industry: snapHost.val().industry,
            recipeint_id: snapHost.key
        });
        writeNotification(useri, uid, snapUser.val().username, "shared", "your post", key);
        writeActivity(useri, uid, "shared", "post", key);
        updateSharesCount(key);
    }
    FB.ui(obj, callback);
}


function handleShare(snapUser, el) {
    var key = $(el).closest(".ui-block").attr("id");
    var uid = $(el).closest("article").attr("id");
    useri = snapUser.key;
    if (uid != useri) {
        database.ref().child('items/' + key + '/shares').orderByChild('uid').equalTo(useri).once('value', function (snap) {
            if (!snap.val()) {
                $(el).css('fill', sharedColor);
                $(el).css('color', sharedColor + " !important");
                $(el).find().css('color', sharedColor + " !important");
                writeShare(snapUser, uid, key);
            } else {}
        });
    }
}

function writeShare(snapUser, uid, key) {
    firebase.database().ref().child('users/' + uid).once('value', function (snapHost) {
        firebase.database().ref().child('users/' + uid).once('value', function (snapItem) {
            postToFeed(snapHost.val().name + " on Runwae", snapHost.val().caption, 'https://runwae.com/explore', snapItem.val().photo_url, snapUser, uid, key);
        });
    });
}


function updateSharesCount(key) {
    firebase.database().ref().child('items/' + key + '/shares').once('value', function (snap) {
        var obj = snap.val();
        if (obj) {
            sharesCount = Object.keys(obj).length;
        } else {
            sharesCount = 0;
        }
        database.ref().child('items/' + key).update({
            "shares_count": Number(sharesCount)
        });
        refreshSharesCount(key, sharesCount);
    });
}

function refreshSharesCount(key, sharesCount) {
    $(".ui-block#" + key + " .share span").html(sharesCount);
    $("#postSharesCount").html(sharesCount);
}