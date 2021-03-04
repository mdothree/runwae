function initFavorite(visitorSnap, hostSnap) {
    $("#btnFavorite").off("click");
    displayFavorited(visitorSnap, hostSnap, 10);
    displayFavorites(visitorSnap, hostSnap, 20);
    database.ref().child('users/' + visitorSnap.key + '/favorited').orderByChild('uid').equalTo(hostSnap.key).once('value', function (snap) {
        if (!snap.val()) {
            $("#btnFavorite").html("Favorite");
            $("#btnFavorite").click(function () {
                writeFavorite(visitorSnap, hostSnap);
            });
        } else {
            $("#btnFavorite").html("Unfavorite");
            $("#btnFavorite").click(function () {
                writeUnfavorite(visitorSnap, hostSnap);
            });
        }

    });
}

function writeFavorite(visitorSnap, hostSnap) {
    uid = hostSnap.key
    useri = visitorSnap.key;
    username = visitorSnap.val().username;

    database.ref().child('users/' + uid + '/favorites').push().update({
        "time": dNow,
        "uid": useri
    });

    database.ref().child('users/' + useri + '/favorited').push().update({
        "time": dNow,
        "uid": uid
    });

    writeNotification(useri, uid, username, "favorited", "your page", useri);
    writeActivity(useri, uid, "favorited", "page", uid);
    updateFavoritesCount(useri, uid);
    $("#btnFavorite").off("click");
    database.ref().child('users/' + visitorSnap.key).once('value', function (visitorSnap) {
        database.ref().child('users/' + hostSnap.key).once('value', function (hostSnap) {
            initFavorite(visitorSnap, hostSnap);
        });
    });
}


function writeUnfavorite(visitorSnap, hostSnap) {
    uid = hostSnap.key
    useri = visitorSnap.key;
    username = visitorSnap.val().username;
    dbRefFavorites = database.ref().child('users/' + uid + '/favorites');
    dbRefFavorited = database.ref().child('users/' + useri + '/favorited');
    dbRefFavorites.once('value', function (snap) {
        obj = snap.val();
        for (key of Object.keys(obj)) {
            if (obj[key]["uid"] == useri) {
                dbRefFavorites.child(key).remove();
            }
        }
    });
    dbRefFavorited.once('value', function (snap) {
        obj = snap.val();
        if (obj) {
            for (key of Object.keys(obj)) {
                if (obj[key]["uid"] == uid) {
                    dbRefFavorited.child(key).remove();
                }
            }
            writeNotification(useri, uid, username, "unfavorited", "your page", useri);
            updateFavoritesCount(useri, uid);
            database.ref().child('users/' + visitorSnap.key).once('value', function (visitorSnap) {
                database.ref().child('users/' + hostSnap.key).once('value', function (hostSnap) {
                    initFavorite(visitorSnap, hostSnap);
                });
            });
        }
    });
}

function updateFavoritesCount(useri, uid) {
    firebase.database().ref().child('users/' + uid).once('value', function (snap) {
        var obj = snap.val().favorites;
        if (obj) {
            favoritesCount = Object.keys(obj).length;
        } else {
            favoritesCount = 0;
        }
        database.ref().child('users/' + uid).update({
            "favorites_count": Number(favoritesCount)
        });
    });
    firebase.database().ref().child('users/' + useri).once('value', function (snap) {
        var obj = snap.val().favorited;
        if (obj) {
            favoritedCount = Object.keys(obj).length;
        } else {
            favoritedCount = 0;
        }
        database.ref().child('users/' + useri).update({
            "favorited_count": Number(favoritedCount)
        });
    });

}


function displayFavorited(snapVisitor, snapHost, limit) {
    favoritedCount = snapHost.val().favorited_count;
    //    $("#favoritedCount").html(favoritedCount);
    $("#favoritedDisplay").html("");
    var i = 0;
    var total = 0;
    var before = ["{{uid}}", "{{src}}", "{{name}}", "{{username}}"];
    var favoritedObj = snapHost.val().favorited;
    if (favoritedObj) {
        favoritedKeys = Object.keys(favoritedObj);
        var favorites = favoritedKeys.length;
        getFavorite(0);

        function getFavorite(n) {
            if (n < limit && n < favorites) {
                var favoritedKey = favoritedKeys[n];
                var favoriteObj = favoritedObj[favoritedKey];
                if (favoriteObj) {
                    displayFavorite(favoriteObj, n);
                } else {
                    getFavorite(n + 1);
                }

            } else {
                if (n < favorites && n > limit) {
                    $("#moreUsers").html("+" + (favorites - limit));
                    $('.all-users').show();
                }
                if ($("#favoritedDisplay").html() == "") {
                    $("#favoritedDisplay").html("<br><h6 align='center'>No favorites to display</h6><br>");
                }
                return true;

            }
        }

        function displayFavorite(favoriteObj, n) {
            database.ref().child('users/' + favoriteObj["uid"]).once('value', function (snapFavorite) {
                if (snapFavorite.val()){
                var after = [snapFavorite.key, snapFavorite.val().photo_url, snapFavorite.val().name, snapFavorite.val().username];
                displayHTML("#favoritePagesTemplate", "#favoritedDisplay", before, after);
                $(".author-thumb,.notification-friend").click(function (event) {
                    event.preventDefault();
                        event.stopImmediatePropagation();
                        event.stopPropagation();
                    var key = $(this).closest("li.inline-items").attr("id");
                    profileRelocate(snapVisitor, key);
                });
            }
            getFavorite(n + 1);

            });
        }
    } else {
        if ($("#favoritedDisplay").html() == "") {
            $("#favoritedDisplay").html("<br><h6 align='center'>No favorites to display</h6><br>");
        }
    }
}

function displayFavorites(snapVisitor, snapHost, limit) {
    favoritesCount = snapHost.val().favorites_count;
    $("#favoritesCount").html(favoritesCount);
    $("#favoritesDisplay").html("");
    var i = 0;
    var total = 0;
    var before = ["{{uid}}", "{{src}}"];
    var favoritesObj = snapHost.val().favorites;
    if (favoritesObj) {
        favoritesKeys = Object.keys(favoritesObj);
        var favorites = favoritesKeys.length;
        getFavorite(0);

        function getFavorite(n) {
            if (n < limit && n < favorites) {
                var favoritesKey = favoritesKeys[n];
                var favoriteObj = favoritesObj[favoritesKey];
                if (favoriteObj) {
                    displayFavorite(favoriteObj, n);
                } else {
                    getFavorite(n + 1);
                }

            } else {
                if ($("#favoritesDisplay").html() == "") {
                    $("#favoritesDisplay").html("<br><h6 align='center'>No one favorited this</h6><br>");
                }
                return true;

            }
        }

        function displayFavorite(favoriteObj, n) {
            database.ref().child('users/' + favoriteObj["uid"]).once('value', function (snapFavorite) {
                if(snapFavorite.val()){
                var after = [snapFavorite.key, snapFavorite.val().photo_url, snapFavorite.val().name, snapFavorite.val().username];
                displayHTML("#favoriteBubbleTemplate", "#favoritesDisplay", before, after);
                $(".favoriteBubbleLi").click(function (event) {
                    event.preventDefault();
                        event.stopImmediatePropagation();
                        event.stopPropagation();
                    var key = $(this).attr("id");
                    profileRelocate(snapVisitor, key);
                });
            }
                getFavorite(n + 1);
            });
        }
    } else {
        if ($("#favoritesDisplay").html() == "") {
            $("#favoritesDisplay").html("<br><h6 align='center'>No one favorited this</h6><br>");
        }
    }
}


function pagesYouMayLike(userSnap, limit) {
    $("#pagesYouMayLikeDisplay").html("");
    var i = 0;
    var total = 0;
    var before = ["{{uid}}", "{{src}}", "{{name}}", "{{username}}"];
    var favoritedObj = userSnap.val().favorited;
    var role = userSnap.val().role;
    database.ref().child('users').once('value', function (snapUsers) {
        var usersObj = snapUsers.val();
        if (usersObj) {
            userKeys = Object.keys(usersObj);
            shuffle(userKeys);
            var users = userKeys.length;
            getUser(0);

            function getUser(n) {
                if ($("#pagesYouMayLikeDisplay").children().length < limit && n < users) {
                    var userKey = userKeys[n];
                    var userObj = usersObj[userKey];
                    if (userObj) {

                        if (role != userObj["role"] && userObj["name"] != "Runwae User" && userSnap.key != userKey) {
                            if (checkFavorited(userKey, favoritedObj)) {
                                displayUser(userObj, n);
                            } else {
                                getUser(n + 1);
                            }
                        } else {
                            getUser(n + 1);
                        }
                    }
                } else {
                    if ($("#pagesYouMayLikeDisplay").html() == "") {
                        $("#pagesYouMayLikeDisplay").html("<h6 align='center' style='width:100%'><br>No suggestions to display<br></h6>");
                    }
                    return true;
                }
            }

            function displayUser(userObj, n) {
                key = userKeys[n];
                var after = [key, userObj["photo_url"], userObj["name"], userObj["username"]];
                displayHTML("#pagesYouMayLikeTemplate", "#pagesYouMayLikeDisplay", before, after);
                //open user name
                $(".author-thumb, .notification-friend").click(function (event) {
                    event.preventDefault();
                        event.stopImmediatePropagation();
                        event.stopPropagation();
                    var key = $(this).closest("li.inline-items").attr("id");
                    profileRelocate(userSnap, key);
                });
                $(".notification-icon").click(function (event) {
                    event.preventDefault();
                        event.stopImmediatePropagation();
                        event.stopPropagation();
                    var key = $(this).closest("li.inline-items").attr("id");
                    database.ref().child('users/' + key).once('value', function (snapHost) {
                        writeFavorite(userSnap, snapHost);
                        var key = $(this).closest("li.inline-items").attr("id");
                        database.ref().child('users/' + userSnap.key).once('value', function (userSnap) {
                            pagesYouMayLike(userSnap, limit);
                        });
                    });
                });
                getUser(n + 1);
            }
        } else {}

    });

}

function checkFavorited(uid, favoritedObj) {
    final = true;
    if (favoritedObj) {
        for (key of Object.keys(favoritedObj)) {
            if (favoritedObj[key]["uid"] == uid) {
                final = false;
            }
        }
    }
    return final;
}
