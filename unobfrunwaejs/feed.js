function displayFeed(snapVisitor, displayDiv) {
    useri = snapVisitor.key;
    photoUrl = snapVisitor.val().photo_url;
    role = snapVisitor.val().role;
    //        var more = ($("#newsfeed-items-grid").length / 20);
    //        //////////////Get sort and search
    //        var sort = $("#sortDropdown").html();
    //        var search = $("#searchInput").val();
    //
    //        if (sort != "Sort") {
    //            var flip = false;
    //            if (sort == "Newest") {
    //                var order = "time";
    //                flip = true;
    //            } else if (sort == "Oldest") {
    //                var order = "time";
    //            } else if (sort == "Price (High)") {
    //                var order = "price";
    //                flip = true;
    //            } else if (sort == "Price (Low)") {
    //                var order = "price";
    //            } else if (sort == "Interests (High)") {
    //                var order = "interests_count";
    //                flip = true;
    //            } else if (sort == "Interests (Low)") {
    //                var order = "interest_count";
    //            } else if (sort == "Completed (High)") {
    //                var order = "completed_count";
    //                flip = true;
    //            } else if (sort == "Completed (Low)") {
    //                var order = "completed_count";
    //            }
    //
    //            if (flip) {
    //                var itemsPromise = database().ref().child('items').orderByChild(sort).limitToLast(20 * more).once('value');
    //
    //            } else {
    //                var itemsPromise = database().ref().child('items').orderByChild(sort).limitToFirst(20 * more).once('value');
    //            }
    // DESIGN
    //we will display X more than the current number displayed. Which should be X.
    //Define display clip capacity
    var btnShowMoreMainFeed = '#showMoreMainFeed';
    var clipCapacity = 5;
    sort = 'time';
    flip = true;
    search = "";
    itemsToAquire = 100;
    //Get the items that we need 
    //this is pulling from the most recent since we 'limit to last'
    var itemsPromise = database.ref().child('items').orderByChild(sort).limitToLast(itemsToAquire).once('value');
    itemsPromise.then(displayItems);

    function displayItems(snapItems) {
        //Pass 500 posts into here.
        //Data overload is in images we render, not posts info
        //We dice posts up and listen in here
        //filter first
        var mainItemsObj = snapItems.val();
        //only get active items
        //roughly 500 active items sorted by reverse time
        mainItemsObj = filterObj(mainItemsObj, ["status"], ["active"]);
        //ordered by reverse chronological. We resort keys later, but we need to pull from the back of the gathered 
        displayClip(mainItemsObj);
        //this function runs initially and on "show more" click 
        function displayClip(mainItemsObj) {
            $(btnShowMoreMainFeed).on('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                displayClip(mainItemsObj);
            });
            var postsDisplayed = $(displayDiv).children().length;
            mainItemsCount = Object.keys(mainItemsObj).length;
            index1 = mainItemsCount - postsDisplayed - clipCapacity - 1;
            if (index1 < 0) {
                index1 = 0;
            }
            index2 = mainItemsCount - postsDisplayed - 1;
            if (index2 <= 0) {
                $(btnShowMoreMainFeed).hide();
                index2 = 0;
            } else {
                console.log
                itemsObj = sliceObj(mainItemsObj, index1, index2);
            }
            //slicing from back of object
            if (itemsObj) {
                itemKeys = Object.keys(itemsObj);
                itemsLength = itemKeys.length;
                if (flip) {
                    itemKeys = itemKeys.reverse();
                }
                interestColor = "#9a9fbf";
                facebookColor = "#2f5b9d";
                instagramColor = "#f74881";
                twitterColor = "#38bff1";
                linkedinColor = "#0077B5";
                sharedColor = "#9389FF";
                //    getItem($("#newsfeed-items-grid").length);
                //start off the overall item retrievel and display
                ///this only gets called again after the display
                $(btnShowMoreMainFeed).show();
                getItem(0);
            } else {
                $(btnShowMoreMainFeed).hide();
                if ($(displayDiv).html() == "") {
                    $(displayDiv).html("<br><h6 align='center'>No posts to display</h6><br>");
                } else {
                    $(displayDiv).append("<br><h6 align='center'>No posts to display</h6><br>");
                }
            }

            function getItem(i) {
                var go = true;
                $(btnShowMoreMainFeed).hide();
                if (i < itemsLength) { //clip almost dont
                    var itemObj = itemsObj[itemKeys[i]];
                    if (itemObj["status"] == 'active') {
                        go = true;
                    } else {
                        go = false;
                    }
                } else {
                    //end of clip
                    if ($(displayDiv).children().length == mainItemsCount) {
                        $(btnShowMoreMainFeed).hide();
                        $(displayDiv).append("<br><h6 align='center'>No posts to display</h6><br>");
                    } else {
                        $(btnShowMoreMainFeed).show();
                    }
                    return;
                }
                if (go == true) {
                    if (search != "") {
                        var go = false;
                        var propertiesArray = [username, brand, caption];
                        for (i = 0; i <= propertiesArray.length; i++) {
                            var property = itemObj[propertiesArray[i]];
                            if (search.toLowerCase().includes(property.toLowerCase()) || property.toLowerCase().includes(search.toLowerCase())) {
                                go = true;
                            }
                        }
                    }
                    if (go == false) {
                        getItem(i + 1);
                    } else {
                        display(itemObj, i);
                    }
                } else {
                    getItem(i + 1);
                }
            }

            function display(itemObj, itemCount) {
                database.ref().child('users/' + itemObj["uid"]).once('value', function (snapHost) {
                    userObj = snapHost.val();
                    var key = itemKeys[itemCount];
                    interestObj = itemObj["interests"];
                    interestKeys = Object.keys(interestObj);
                    interests = interestKeys.length;
                    sharesObj = itemObj["shares"];
                    if (sharesObj) {
                        shareKeys = Object.keys(sharesObj);
                    } else {
                        shareKeys = [];
                    }
                    var before = ["{{uid}}", "{{src}}", "{{username}}", "{{time}}", "{{icon}}", "{{caption}}", "{{media}}", "{{interests_count}}", "{{friends_harmonic}}", "{{names_people_likes}}", "{{comments_count}}", "{{shares_count}}", "{{interest_display}}", "{{interested}}", "{{facebook_display}}", "{{instagram_display}}", "{{twitter_display}}", "{{linkedin_display}}", "{{facebook_color}}", "{{instagram_color}}", "{{twitter_color}}", "{{linkedin_color}}", "{{shares_color}}", "{{disabled}}", "{{more_display}}"];
                    var after = new Array(before.length);
                    after[0] = uid = itemObj["uid"]; //uid
                    after[1] = (userObj["photo_url"]);
                    after[2] = (userObj["username"]);
                    after[3] = (timeDisplay(itemObj["time"]));
                    if (itemObj["compensation"] == "money") {
                        after[4] = 'card-outline';;
                    } else {
                        after[4] = 'gift-outline';
                    }
                    after[5] = (itemObj["caption"]);
                    after[6] = getMedia();
                    after[7] = itemObj["interests_count"];
                    after[10] = itemObj["comments_count"];
                    after[11] = itemObj["shares_count"];
                    after = buttonsShown(after);
                    after = interestShown(after);
                    after = shared(after);
                    //                if (useri == uid) {
                    //                    after[12] = after[13] = after[14] = after[15] = 'none';
                    //                }
                    if (role == "influencer") {
                        after[12] = "";
                        after[23] = "";
                    } else {
                        after[12] = "hide";
                        after[23] = "disabled";
                    }
                    if (useri == uid) {
                        after[24] = "";
                    } else {
                        after[24] = "none";
                    }
                    friendsHarmonicHTML();

                    function getMedia() {
                        var fb = twitter = instagram = linkedin = "none";
                        var mediaType = itemObj["media_type"];
                        if (mediaType) {
                            var template = $("#" + itemObj["media_type"] + "Template").html();
                        } else {
                            return "";
                        }
                        if (mediaType == "image") {
                            mediaBefore = ["{{src}}"];
                            mediaAfter = [itemObj["photo_url"]];
                        } else if (mediaType == "video") {
                            mediaBefore = ["{{video_src}}", "{{photo_src}}", "{{photo_src}}", "{{video_src}}"];
                            mediaAfter = [itemObj["video_url"], itemObj["photo_url"], itemObj["photo_url"], itemObj["video_url"]];
                        } else {
                            return "";
                        }
                        text = replaceText(template, mediaBefore, mediaAfter);
                        return text;
                    }

                    function buttonsShown(after) {
                        facebook = twitter = instagram = linkedin = "none";
                        if (itemObj["facebook"]) {
                            facebook = null;
                        }
                        if (itemObj["instagram"]) {
                            instagram = null;
                        }
                        if (itemObj["twitter"]) {
                            twitter = null;
                        }
                        if (itemObj["linkedin"]) {
                            linkedin = null;
                        }
                        after[14] = facebook;
                        after[15] = instagram;
                        after[16] = twitter;
                        after[17] = linkedin;
                        return after;
                    }

                    function interestShown(after) {
                        var platforms = [];
                        for (i = 0; i < interestKeys.length; i++) {
                            if (interestObj[interestKeys[i]]["uid"] == useri) {
                                platforms.push(interestObj[interestKeys[i]]["platform"]);
                                after[13] = "interested";
                            }
                        }
                        if (!platforms.includes("facebook")) {
                            after[18] = interestColor;
                        }
                        if (!platforms.includes("instagram")) {
                            after[19] = interestColor;
                        }
                        if (!platforms.includes("twitter")) {
                            after[20] = interestColor;
                        }
                        if (!platforms.includes("linkedin")) {
                            after[21] = interestColor;
                        }
                        return after;
                    }

                    function shared(after) {
                        for (i = 0; i < shareKeys.length; i++) {
                            if (sharesObj[shareKeys[i]]["uid"] == useri) {
                                after[22] = sharedColor;
                                return after;
                            }
                        }
                        return after;
                    }

                    function friendsHarmonicHTML() {
                        usernames = [];
                        after[8] = after[9] = "";
                        if (!interestKeys.length || interestKeys.length == 0) {
                            checkComments(after);
                        } else {
                            getInterest(0, "", []);
                        }

                        function getInterest(i, html, usernames) {
                            if (i < interestKeys.length) {
                                database.ref().child('items/' + key + '/interests/' + interestKeys[i]).once('value', function (snap) {
                                    uid = snap.val().uid;
                                    getUser(uid, i, html, usernames);
                                });
                            } else {
                                after[8] = html;
                                checkComments(after);
                            }
                        }

                        function getUser(uid, i, html, usernames) {
                            database.ref().child('users/' + uid).once('value', function (snap) {
                                if (!snap.val()) {
                                    getInterest(i + 1, html, usernames);
                                } else {
                                    if (usernames.length < 4) {
                                        if (!usernames.includes(snap.val().username)) {
                                            usernames.push(uid);
                                            usernames.push(snap.val().username);
                                        }
                                    } else if (usernames.length == 4) {
                                        after[9] = replaceText($("#friendInterestCountTemplate").html(), ["{{user_key1}}", "{{username1}}", "{{user_key2}}", "{{username2}}"], usernames);
                                    }
                                    if (i > interests || i > 10) {
                                        after[8] = html;
                                        checkComments(after);
                                    } else {
                                        if (!html.includes(snap.key)) {
                                            html += replaceText($("#harmonicFriendTemplate").html(), ["{{uid}}", "{{src}}"], [snap.key, snap.val().photo_url]);
                                        }
                                        getInterest(i + 1, html, usernames);
                                    }
                                }
                            });
                        }
                    }

                    function allCommentsHTML(articleHTML) {
                        removeDisplay = "none";
                        var commentbefore = ["{{remove_display}}", "{{key}}", "{{uid}}", "{{src}}", "{{username}}", "{{time}}", "{{caption}}"];
                        var after = new Array(5);
                        commentKeys = Object.keys(itemObj["comments"]);
                        comments = itemObj["comments_count"];
                        var viewAll = false;
                        if (comments > 2) {
                            viewAll = true
                        }
                        getComment(0, "");

                        function getComment(i, html) {
                            if (i < comments && i < 2) {
                                database.ref().child('items/' + key + '/comments/' + commentKeys[i]).once('value', function (snap) {
                                    if (snap.val() && snap.val()["uid"]) {
                                        getUser(snap.key, snap.val().uid, snap.val().time, snap.val().comment, i, html);
                                    } else {
                                        getComment(i + 1, html)
                                    }
                                });
                            } else {
                                commentsHTML = replaceText($("#commentsWrapperTemplate").html(), ["{{comments_HTML}}"], [html]);
                                finalize(articleHTML + commentsHTML, viewAll);
                            }
                        }

                        function getUser(key, uid, time, comment, i, html) {
                            database.ref().child('users/' + uid).once('value', function (snap) {
                                if (snap.val()) {
                                    if (snap.key == snapVisitor.key) {
                                        removeDisplay = "";
                                    }
                                    html += replaceText($("#commentTemplate").html(), commentbefore, [removeDisplay, key, uid, snap.val().photo_url, snap.val().username, timeDisplay(time), comment]);
                                }
                                getComment(i + 1, html);
                            });
                        }
                    }

                    function checkComments(after) {
                        articleHTML = replaceText($("#articleTemplate").html(), before, after);
                        if (itemObj["comments"] && Math.floor(Math.random() * 10) > 5) {
                            allCommentsHTML(articleHTML);
                        } else {
                            finalize(articleHTML, false);
                        }
                    }

                    function finalize(html, viewAll) {
                        if (viewAll) {
                            html += $("#moreCommentsTemplate").html();
                        }
                        if (Math.floor(Math.random() * 10) == 5) {
                            html += replaceText($("#postCommentTemplate").html(), ["{{src}}"], [photoUrl]);
                        }
                        uiHTML = replaceText($("#uiblockTemplate").html(), ["{{item_key}}", "{{contents}}"], [key, html]);
                        $(displayDiv).append(uiHTML);
                        postListeners(snapVisitor, snapHost);
                        getItem(itemCount + 1);
                    }
                });
            }
        }
    }
}
//function deactivatePost(snapUser, el) {
//    var key = $(el).closest(".ui-block").attr("id");
//    var uid = $(el).closest("article").attr("id");
//    database.ref().child('items/' + key).update({
//        status: "inactive"
//    });
//    window.location.reload();
//}
//
//function createRepliesHTML(i, html) {
//    replybefore["{{src}}", "{{username}}", "{{time}}", "{{caption}}"];
//    commentKey = Object.keys(itemObj["comments"])[i];
//    replyKeys = Object.keys(itemObj["comments"][commentKey]["replies"]);
//    replies = replyKeys.length;
//    getReply(ri, i, html);
//
//    function getReply(ri, i, html) {
//        if (replyKeys[ri]) {
//            database().ref().child('items/' + key + '/comments/' + commentKeys[i] + '/replies/' + replyKeys[ri]).on('child_added', function (snap) {
//                uid = snap.val().uid;
//                time = snap.val().time;
//                comment = snap.val().comment;
//                getUser(uid, time, comment, ri, i, html);
//            });
//        } else {
//            getComment(i + 1, html);
//        }
//    }
//
//    function getUser(uid, time, comment, ri, i, html) {
//        database().ref().child('users/' + uid).once('value', function (snap) {
//            html += replaceText($("#commentReplyTemplate").html(), replybefore, [snap.val().photo_url, snap.val().username, time, caption]);
//            if (i > comments || i > 2) {
//                getComment(i + 1, html);
//            } else {
//                getReply(ri + 1, i, html);
//            }
//        });
//    }
//}