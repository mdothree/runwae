function displayMarketerCampaigns(snapVisitor, snapHost, displayDiv) {
    limit = 100;
    useri = snapVisitor.key;
    photoUrl = snapVisitor.val().photo_url;
    role = snapVisitor.val().role;
    postsObj = snapHost.val().posts;
    if (postsObj) {
        postKeys = Object.keys(postsObj);
        posts = postKeys.length;
        postKeys = sortProperties(postsObj, "time");
        postKeys = postKeys.reverse();
        getPost(0);
    } else {
        $(displayDiv).html("<br><h6 align='center'>No posts to display</h6><br>");
    }

    function getPost(i) {
        if (i < posts && i < limit) {
            database.ref().child('items/' + postKeys[i]).once('value', function (snapItem) {
                var itemObj = snapItem.val();
                if (itemObj) {
                    if (itemObj["status"] == 'active') {
                        display(itemObj, i);
                    } else {
                        getPost(i + 1);
                    }
                } else {
                    getPost(i + 1);
                }
            });
        } else {
            if ($(displayDiv).html() == "") {
                $(displayDiv).html("<br><h6 align='center'>No posts to display</h6><br>");
            }
            return true;
        }

    }

    function display(itemObj, itemCount) {
        database.ref().child('users/' + itemObj["uid"]).once('value', function (snapHost) {
            userObj = snapHost.val();
            var key = postKeys[itemCount];
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
                after[4] = 'dollar-sign';
            } else {
                after[4] = 'gift';
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
                getPost(itemCount + 1);
            }
        });
    }
}

function displayInfluencerGigs(snapVisitor, snapHost, displayDiv) {
    limit = 100;
    useri = snapVisitor.key;
    photoUrl = snapVisitor.val().photo_url;
    role = snapVisitor.val().role;
    gigsObj = snapHost.val().gigs;
    hostObj = snapHost.val();
    if (gigsObj) {
        gigKeys = Object.keys(gigsObj);
        gigs = gigKeys.length;
        gigKeys = sortProperties(gigsObj, "time");
        gigKeys = gigKeys.reverse();
        getPost(0);
    } else {
        $(displayDiv).html("<br><h6 align='center'>No completed gigs to display</h6><br>");
    }

    function getPost(i) {
        if (i < gigs && i < limit) {
            gigObj = gigsObj[gigKeys[i]];
            database.ref().child('items/' + gigObj["path"].split("/")[1]).once('value', function (snapItem) {
                var itemObj = snapItem.val();
                if (itemObj) {
                    if (gigObj["status"] == "closed" && itemObj["status"] == 'active') {
                        display(itemObj, gigObj, i, snapHost);
                    } else {
                        getPost(i + 1);
                    }
                } else {
                    getPost(i + 1);
                }
            });
        } else {
            if ($(displayDiv).html() == "") {
                $(displayDiv).html("<br><h6 align='center'>No completed gigs to display</h6><br>");
            }
            return true;
        }

    }

    function display(itemObj, gigObj, itemCount, snapHost) {
        itemKey = gigObj["path"].split("/")[1];
        var key = gigKeys[itemCount];
        database.ref().child('users/' + itemObj["uid"]).once('value', function (snapMarketer) {
            database.ref().child('items/' + itemKey + '/influencers/' + key).once('value', function (snapRealGig) {
                marketerObj = snapMarketer.val();
                realGigObj = snapRealGig.val();
                proposalObj = realGigObj["proposal"];
                if (itemObj && proposalObj) {
                    itemObj["influencers"][key]["proposal"];
                    ledgerKeys = Object.keys(realGigObj["ledger"]);
                    paymentAcceptedKey = ledgerKeys[ledgerKeys.length - 1];
                    time = timeDisplay(realGigObj["ledger"][paymentAcceptedKey]["time"]);
                    var before = ["{{key}}", "{{influencerid}}", "{{brandid}}", "{{influencer_name}}", "{{brand_name}}", "{{caption}}", "{{url}}", "{{time}}", "{{platform}}"];
                    var after = [key, snapHost.key, snapMarketer.key, snapHost.val().username, snapMarketer.val().username, proposalObj["caption"], proposalObj["photo_url"], time, snapRealGig.val().platform];
                    uiHTML = replaceText($("#proposalTemplate").html(), before, after);
                    $(displayDiv).append(uiHTML);
                }
                getPost(itemCount + 1);
            });
        });
    }
}


//
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