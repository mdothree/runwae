function initFollow(visitorSnap, hostSnap) {
    $("#btnFollow").off("click");
    if (window.location.href.includes("profile")) {
        $("#followersCount").html(hostSnap.val().followers_count);
        $("#followingCount").html(hostSnap.val().following_count);
        followersReturn = displayFollowers(visitorSnap, hostSnap, 100);
        followingReturn = displayFollowing(visitorSnap, hostSnap, 100);
        if (followersReturn && followingReturn) {
            importScripts();
        }
    }

    database.ref().child('users/' + visitorSnap.key + '/following').orderByChild('uid').equalTo(hostSnap.key).once('value', function (snap) {
        if (!snap.val()) {
            $("#btnFollow ion-icon").attr("name", "person-add");
            $("#btnFollow").click(function () {
                writeFollow(visitorSnap, hostSnap);
            });
        } else {
            $("#btnFollow ion-icon").attr("name", "person-remove");
            $("#btnFollow").click(function () {
                writeUnfollow(visitorSnap, hostSnap);
            });
        }

    });
}



function writeFollow(visitorSnap, hostSnap) {
    uid = hostSnap.key
    useri = visitorSnap.key;
    username = visitorSnap.val().username;

    database.ref().child('users/' + uid + '/followers').push().update({
        "time": dNow,
        "uid": useri
    });

    database.ref().child('users/' + useri + '/following').push().update({
        "time": dNow,
        "uid": uid
    });
    analytics.logEvent('follow', {
        category: 'engagement',
        actor_industry: visitorSnap.val().industry,
        actor_id: visitorSnap.key,
        recipient_industry: hostSnap.val().industry,
        recipeint_id: hostSnap.key
    });
    writeNotification(useri, uid, username, "followed", "you", useri);
    writeActivity(useri, uid, "followed", "", uid);
    updateFollowerCount(useri, uid);
    database.ref().child('users/' + visitorSnap.key).once('value', function (visitorSnap) {
        database.ref().child('users/' + hostSnap.key).once('value', function (hostSnap) {
            initFollow(visitorSnap, hostSnap);
            if (hostSnap.val().role == "influencer") {
                whoToFollow(visitorSnap, 20, "#influencersToFollowDisplay", "influencer");
            } else if (hostSnap.val().role == "marketer") {
                whoToFollow(visitorSnap, 20, "#brandsToFollowDisplay", "marketer");
            }
        });
    });
}

function writeUnfollow(visitorSnap, hostSnap) {
    uid = hostSnap.key
    useri = visitorSnap.key;
    username = visitorSnap.val().username;
    dbRefFollowers = database.ref().child('users/' + uid + '/followers');
    dbRefFollowing = database.ref().child('users/' + useri + '/following');
    dbRefFollowers.once('value', function (snap) {
        obj = snap.val();
        if (obj) {
            for (key of Object.keys(obj)) {
                if (obj[key]["uid"] == useri) {
                    dbRefFollowers.child(key).remove();
                }
            }
        }
    });
    dbRefFollowing.once('value', function (snap) {
        obj = snap.val();
        if (obj) {
            for (key of Object.keys(obj)) {
                if (obj[key]["uid"] == uid) {
                    dbRefFollowing.child(key).remove();
                }

            }
            analytics.logEvent('unfollow', {
                category: 'engagement',
                actor_industry: visitorSnap.val().industry,
                actor_id: visitorSnap.key,
                recipient_industry: hostSnap.val().industry,
                recipeint_id: hostSnap.key
            });
            writeNotification(useri, uid, username, "unfollowed", "your page", useri);
            updateFollowerCount(useri, uid);
            database.ref().child('users/' + visitorSnap.key).once('value', function (visitorSnap) {
                database.ref().child('users/' + hostSnap.key).once('value', function (hostSnap) {
                    initFollow(visitorSnap, hostSnap);
                });
            });
        }
    });

}



function updateFollowerCount(useri, uid) {
    firebase.database().ref().child('users/' + uid).once('value', function (snap) {
        var obj = snap.val().followers;
        if (obj) {
            followersCount = Object.keys(obj).length;
        } else {
            followersCount = 0;
        }
        database.ref().child('users/' + uid).update({
            "followers_count": Number(followersCount)
        });
    });
    firebase.database().ref().child('users/' + useri).once('value', function (snap) {
        var obj = snap.val().following;
        if (obj) {
            followingCount = Object.keys(obj).length;
        } else {
            followingCount = 0;
        }
        database.ref().child('users/' + useri).update({
            "following_count": Number(followingCount)
        });
    });

}


function displayFollowers(visitorSnap, hostSnap, limit) {
    var i = 0;
    var total = 0;
    var before = ["{{uid}}", "{{header_src}}", "{{username}}", "{{src}}", "{{name}}", "{{description}}", "{{followers}}", "{{following}}", "{{gigs}}", "{{index}}"];
    var userObj = hostSnap.val();
    var obj = hostSnap.val().followers;
    $("#followingCount").html(hostSnap.val().followers_count);
    render();
    $("#followersSearch button").click(function () {
        render();
    });
    //    $("#searchFollowersInput").on('input focus', function () {
    //        render();
    //    });

    function render() {
        filter = $("#searchFollowersInput").val();
        $("#followersDisplay").html("");
        if (obj) {
            followerKeys = Object.keys(obj);
            followerKeys = followerKeys.reverse();
            var followers = Object.keys(obj).length;
            getFollower(0);

            function getFollower(n) {
                if (n < limit && n < followers) {
                    var followerKey = followerKeys[n];
                    var followerObj = obj[followerKey];
                    if (followerObj) {
                        displayFollower(followerObj, n);
                    }
                } else {
                    if ($("#followersDisplay").html() == "") {

                        $("#followersDisplay").html("<h3 align='center' style='width:100%'>No followers to Display</h3>");
                    }
                    return true;
                }
            }

            function displayFollower(followerObj, n) {
                database.ref().child('users/' + followerObj["uid"]).once('value', function (snapFollower) {
                    if (filter != "") {
                        userObj = snapFollower.val();
                        go = false;
                        var propertiesArray = ["username", "name", "description"];
                        for (i = 0; i < propertiesArray.length; i++) {
                            var property = userObj[propertiesArray[i]];
                            if (property) {
                                if (filter.toLowerCase().includes(property.toLowerCase()) || property.toLowerCase().includes(filter.toLowerCase())) {
                                    go = true;
                                }
                            }
                        }
                    } else {
                        go = true;
                    }
                    if ($('#followersDisplay .ui-block#' + snapFollower.key).length > 0) {
                        go = false;
                    }

                    if (go == true) {
                        if(snapFollower.val()){
                        var after = [snapFollower.key, snapFollower.val().header_url, snapFollower.val().username, snapFollower.val().photo_url, snapFollower.val().name, snapFollower.val().description, snapFollower.val().followers_count, snapFollower.val().following_count, snapFollower.val().gigs_count, n];
                        displayHTML("#followTemplate", "#followersDisplay", before, after);
                        //open user name
                        $("#followersDisplay .author-content").click(function (event) {
                            event.preventDefault();
                            event.stopImmediatePropagation();
                            event.stopPropagation();
                            var key = $(this).closest("div.ui-block").attr("id");
                            profileRelocate(visitorSnap, key);
                        });
                        }
                    }
                    getFollower(n + 1);
                });
            }
        } else {
            if ($("#followersDisplay").html() == "") {
                $("#followersDisplay").html("<h3 align='center' style='width:100%'>No followers to Display</h3>");
            }
            return true;
        }
    }

}


function displayFollowing(visitorSnap, hostSnap, limit) {
    var i = 0;
    var total = 0;
    var before = ["{{uid}}", "{{header_src}}", "{{username}}", "{{src}}", "{{name}}", "{{description}}", "{{followers}}", "{{following}}", "{{gigs}}", "{{index}}"];
    var userObj = hostSnap.val();
    var obj = hostSnap.val().following;
    $("#followingCount").html(hostSnap.val().following_count);
    render();
    $("#followingSearch button").click(function () {
        render();
    });
    //    $("#searchFollowingInput").on('input focus', function () {
    //        render();
    //    });

    function render() {
        filter = $("#searchFollowingInput").val();
        $("#followingDisplay").html("");
        if (obj) {
            followingKeys = Object.keys(obj);
            followingKeys = followingKeys.reverse();
            var followers = Object.keys(obj).length;
            getFollow(0);

            function getFollow(n) {
                if (n < limit && n < followers) {
                    var followKey = followingKeys[n];
                    var followObj = obj[followKey];
                    if (followObj) {
                        displayFollow(followObj, n);
                    }
                } else {
                    if ($("#followingDisplay").html() == "") {
                        $("#followingDisplay").html("<h3 align='center' style='width:100%'>No follows to Display</h3>");
                    }
                    return true;
                }
            }

            function displayFollow(followObj, n) {
                database.ref().child('users/' + followObj["uid"]).once('value', function (snapFollow) {
                    if (snapFollow.val()) {
                        if (filter != "") {
                            userObj = snapFollow.val();
                            go = false;
                            var propertiesArray = ["username", "name", "description"];
                            for (i = 0; i < propertiesArray.length; i++) {
                                var property = userObj[propertiesArray[i]];
                                if (property) {
                                    if (filter.toLowerCase().includes(property.toLowerCase()) || property.toLowerCase().includes(filter.toLowerCase())) {
                                        go = true;
                                    }
                                }
                            }
                        } else {
                            go = true;
                        }
                        if ($('#followingDisplay .ui-block#' + snapFollow.key).length > 0) {
                            go = false;
                        }

                        if (go == true) {

                            var after = [snapFollow.key, snapFollow.val().header_url, snapFollow.val().username, snapFollow.val().photo_url, snapFollow.val().name, snapFollow.val().description, snapFollow.val().followers_count, snapFollow.val().following_count, snapFollow.val().gigs_count, n];
                            displayHTML("#followTemplate", "#followingDisplay", before, after);
                            //open user name
                            $("#followingDisplay .author-content").click(function (event) {
                                event.preventDefault();
                                event.stopImmediatePropagation();
                                event.stopPropagation();
                                var key = $(this).closest("div.ui-block").attr("id");
                                profileRelocate(visitorSnap, key);
                            });
                        }
                    }
                    getFollow(n + 1);
                });
            }
        } else {
            if ($("#followingDisplay").html() == "") {
                $("#followingDisplay").html("<h3 align='center' style='width:100%'>No follows to Display</h3>");
            }
            return true;
        }
    }

}



function whoToFollow(userSnap, limit, displayDiv, role) {
    $(displayDiv).html("");
    var i = 0;
    var total = 0;
    var before = ["{{uid}}", "{{src}}", "{{name}}", "{{username}}", "{{connections}}"];
    var followingObj = userSnap.val().following;
    database.ref().child('users').once('value', function (snapUsers) {
        var usersObj = snapUsers.val();
        if (usersObj) {
            userKeys = Object.keys(usersObj);
            userKeys = shuffle(userKeys);
            var users = userKeys.length;
            getUser(0);

            function getUser(n) {
                if ($(displayDiv).children().length < limit && n < users) {
                    var userKey = userKeys[n];
                    var userObj = usersObj[userKey];
                    if (userObj) {
                        if (role == userObj["role"] && userObj["name"] != "Runwae User" && userObj["name"] != "John Doe" && userSnap.key != userKey) {
                            if (checkFollowing(userKey, followingObj)) {
                                displayUser(userObj, n);
                            } else {
                                getUser(n + 1);
                            }
                        } else {
                            getUser(n + 1);
                        }
                    }
                } else {
                    if ($(displayDiv).html() == "") {
                        $(displayDiv).html("<h6 align='center' style='width:100%'>No suggestions to Display</h6>");
                    }
                    return true;
                }
            }

            function displayUser(userObj, n) {
                if(userObj["photo_url"] != "https://runwae.com/img/newuser.png"){
                key = userKeys[n];
                connections = getConnections(userSnap.val(), userObj);
                var after = [key, userObj["photo_url"], userObj["name"], userObj["username"], connections];
                displayHTML("#whoToFollowTemplate", displayDiv, before, after);
                //open user name
                $(displayDiv + " .author-thumb, " + displayDiv + " .notification-event").click(function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    var key = $(this).closest("li.inline-items").attr("id");
                    profileRelocate(userSnap, key);
                });
                $(displayDiv + " .accept-request").click(function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    var key = $(this).closest("li.inline-items").attr("id");
                    database.ref().child('users/' + key).once('value', function (snapHost) {
                        writeFollow(userSnap, snapHost);
                    });
                });
            }
                getUser(n + 1);
            }
        } else {}

    });

}

function checkFollowing(uid, followingObj) {
    final = true;
    if (followingObj) {
        for (key of Object.keys(followingObj)) {
            if (followingObj[key]["uid"] == uid) {
                final = false;
            }
        }
    }
    return final;
}

function getConnections(user1Obj, user2Obj) {
    connections = 0
    if (user1Obj["following"] && user2Obj["following"]) {
        following1Keys = Object.keys(user1Obj["following"]);
        following2Keys = Object.keys(user2Obj["following"]);
        if (following1Keys && following2Keys) {
            for (f1Key of following1Keys) {
                if (following2Keys.includes(f1Key)) {
                    connections = connections + 1;
                }
            }
        }
    }
    return connections;
}