function displayInterests(snapVisitor, snapHost, el) {
    var key = $(el).closest(".ui-block").attr("id");
    $("#open-post .close").click();
    $("#triggerInterestModal").click();
    render();
    $("#filterInterestsInput").on('input focus', function () {
        render();
    });

    function render() {
        filter = $("#filterInterestsInput").val();
        $("#interestsDisplay").html("");
        var i = 0;
        limit = 100;
        $("#open-interests #interestsDisplay").hide();
        $("#open-interests .modal-body").attr("id", key);
        var before = ["{{engaged}}", "{{uid}}", "{{platform}}", "{{src}}", "{{username}}", "{{interestid}}", "{{icon}}", "{{check_style}}"];
        var dbRefItem = firebase.database().ref().child('items/' + key);
        dbRefItem.once('value', function (snap) {
            var itemObj = snap.val();
            var obj = snap.val().interests;
            interestKeys = Object.keys(obj);
            interestKeys = interestKeys.reverse();
            if (obj) {
                var interests = Object.keys(obj).length;
                getInterest(0);

                function getInterest(n) {
                    if (n < limit && n < interests) {
                        var interestKey = interestKeys[n];
                        var interestObj = obj[interestKey];
                        if (interestObj) {
                            displayInterest(interestObj, interestKey, n);
                        }
                    } else {
                        if ($("#interestsDisplay").html() == "") {
                            $("#interestsDisplay").html("<h6 align='center' style='width:100%'>No Interests to display</h6>");
                        }
                        $("#open-interests #interestsDisplay").show();
                    }
                }

                function displayInterest(interestObj, interestKey, n) {
                    var platform = interestObj["platform"];
                    iconHTML = $("#" + platform + "IconTemplate").html();
                    checkStyle = "";
                    engaged = "";
                    database.ref().child('users/' + interestObj["uid"]).once('value', function (snapSender) {
                        //                    database().ref().child('items/' + key + '/influencers').once('value', function (snap) {
                        userObj = snapSender.val();
                        if (filter != "") {
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
                        if ($('.interestLi#' + snapSender.key + " a#" + platform).length > 0) {
                            go = false;
                        }
                        if (go == true) {
                            gigKeys = Object.keys(itemObj["influencers"]);
                            if (snapVisitor.key == snapHost.key) {
                                if (snap.val()) {
                                    for (i = 0; i < gigKeys.length; i++) { //interest already engaged
                                        if (itemObj["influencers"][gigKeys[i]]["platform"] == platform && itemObj["influencers"][gigKeys[i]]["uid"] == interestObj["uid"]) {
                                            checkStyle = "display: inline-block; position: absolute; right: 15px; top: 12px;";
                                            engaged = "engaged";
                                            //                                    selectedCheck="selectedCheck";
                                        }
                                    }
                                }
                            }
                            var after = [engaged, snapSender.key, platform, snapSender.val().photo_url, snapSender.val().username, interestKey, iconHTML, checkStyle];
                            displayHTML("#interestTemplate", "#interestsDisplay", before, after);
                            if (snapVisitor.key == snapHost.key) {
                                $('li.interestLi').not('.author-thumb').not('.author-title').click(function (event) {
                                    event.stopImmediatePropagation();
                                    if (!$(this).closest("li.interestLi").hasClass("engaged")) {
                                        if ($(this).closest("li.interestLi").hasClass("selected")) {
                                            //if prev selected or if permenant check
                                            $(this).closest("li.interestLi").removeClass("selected");
                                            $("#btnEngage").hide();
                                            $("#btnPay").hide();
                                        } else {
                                            $('li.selected').removeClass('selected');
                                            $(this).closest("li.interestLi").addClass("selected");
                                            $("#btnEngage").show();
                                            $("#btnPay").show();
                                            $("#btnEngage").click(function (event) {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                event.stopImmediatePropagation();
                                                writeEngage(snapHost, this, 1);
                                            });
                                            $("#btnPay").click(function (event) {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                event.stopImmediatePropagation();
                                                writeEngage(snapHost, this, 2);
                                            });
                                        }
                                    }
                                });
                            }
                            //open user name
                            $(".interestLi .author-thumb, .interestLi .author-title").click(function (e) {
                                event.preventDefault();
                                                event.stopPropagation();
                                                event.stopImmediatePropagatio
                                var uid = $(this).closest("li.interestLi").attr("id");
                                profileRelocate(snapVisitor, uid);
                            });
                        }
                        getInterest(n + 1);
                    });
                }
            }
        });
    }
}

function handleInterest(snapUser, el) {
    var platform = $(el).attr("id");
    var key = $(el).closest(".ui-block").attr("id");
    var uid = $(el).closest("article").attr("id");
    useri = snapUser.key;
    database.ref().child('items/' + key + '/interests').once('value', function (snap) {
        interestsObj = snap.val();
        if (!interestsObj) {
            $(el).css('background-color', "");
            $(el).parent().parent().find('.btn-interest').addClass("interested");
            writeInterest(snapUser, uid, key, platform);
        } else {
            interestKeys = Object.keys(interestsObj);
            interests = interestKeys.length;
            interestShown = false;
            for (i = 0; i < interests; i++) {
                if (interestsObj[interestKeys[i]]["uid"] == useri) {
                    if (interestsObj[interestKeys[i]]["platform"] == platform) {
                        interestShown = true;
                    }
                }
            }
            if (!interestShown) {
                $(el).css('background-color', "");
                $(el).parent().parent().find('.btn-interest').addClass("interested");
                writeInterest(snapUser, uid, key, platform);
            } else {}
        }
    });
}

function writeInterest(snapUser, uid, key, platform) {
    useri = snapUser.key;
    interestKey = database.ref().child('items/' + key + '/interests').push().key
    database.ref().child('items/' + key + '/interests/' + interestKey).update({
        "time": dNow,
        "platform": platform,
        "uid": useri
    });
    database.ref().child('users/' + snapUser.key + '/interests/' + interestKey).update({
        "time": dNow,
        "platform": platform,
        "key": key
    });
    database.ref().child("items/" + key).once('value', function (snapItem) {
        database.ref().child('users/' + uid).once('value', function (snapInfluencer) {
            analytics.logEvent('interest', {
                category: 'engagement',
                platform: platform,
                price: snapItem.val().price,
                actor_industry: snapInfluencer.val().industry,
                actor_id: snapInfluencer.key,
                recipient_industry: snapUser.val().industry,
                recipeint_id: snapUser.key,
                interest_id: interestKey
            });
        });
    });
    writeNotification(useri, uid, snapUser.val().username, "showed interest in", "your post", key);
    writeActivity(useri, uid, "showed interest in", "post", key);
    updateInterestCount(key);
}

function updateInterestCount(key) {
    firebase.database().ref().child('items/' + key + '/interests').once('value', function (snap) {
        var obj = snap.val();
        if (obj) {
            interestsCount = Object.keys(obj).length;
        } else {
            interestsCount = 0;
        }
        database.ref().child('items/' + key).update({
            "interests_count": Number(interestsCount)
        });
        refreshInterestsCount(key, interestsCount)
    });
}

function writeEngage(snapHost, el, status) {
    useri = snapHost.key;
    var key = $("#open-interests .modal-body").attr("id");
    var platform = $("#open-interests .interestLi.selected .dropdown-item").attr("id");
    var uid = $("#open-interests .interestLi.selected").attr("id");
    gigKey = database.ref().child('items/' + key + '/influencers').push().key;
    interestKey = $("#open-interests .interestLi.selected .inline-items").attr("id");
    path = "items/" + key + '/influencers/' + gigKey;
    database.ref().child("items/" + key).once('value', function (snapItem) {
        database.ref().child("items/" + key + '/interests/' + interestKey).once('value', function (snapInterest) {
            database.ref().child('users/' + uid).once('value', function (snapInfluencer) {
                database.ref().child(path).update({
                    "status": 0,
                    "uid": uid,
                    "time": dNow,
                    "platform": platform
                });
                database.ref().child('users/' + uid + "/gigs/" + gigKey).set({
                    "path": path,
                    "time": dNow,
                    "platform": platform,
                    "status": "open",
                    "uid": snapHost.key
                });
                database.ref().child('users/' + snapHost.key + "/gigs/" + gigKey).set({
                    "path": path,
                    "time": dNow,
                    "platform": platform,
                    "status": "open",
                    "uid": uid
                });
                database.ref().child('users/' + snapHost.key).update({
                    "current_gig": path
                });
                responseTime = timeDifference(snapInterest.val().time);
                totalResponseTime = snapHost.val().total_response_time;
                responses = snapHost.val().responses;
                if(responseTime && totalResponseTime && responses){
                    database.ref().child('users/' + snapHost.key).update({
                        "total_response_time": totalResponseTime + responseTime,
                        "responses": responses + 1
                    });
                    if (status == 1) {
                        analytics.logEvent('proposal_requested', {
                            category: 'agreement',
                            platform: platform,
                            price: snapItem.val().price,
                            actor_industry: snapHost.val().industry,
                            actor_id: useri,
                            recipient_industry: snapInfluencer.val().industry,
                            recipeint_id: uid,
                            response_time: responseTime,
                            gig_id: gigKey,
                            interest_id: interestKey
                        });
                    }else {
                        analytics.logEvent('proposal_bypassed', {
                            category: 'agreement',
                            platform: platform,
                            price: snapItem.val().price,
                            actor_industry: snapHost.val().industry,
                            actor_id: useri,
                            recipient_industry: snapInfluencer.val().industry,
                            recipeint_id: uid,
                            response_time: responseTime,
                            gig_id: gigKey,
                            interest_id: interestKey
                        });
                    }
                }
                if (status == 1) {
                    writeNotification(useri, uid, snapHost.val().username, "requested a proposal for", "a gig", path);
                    writeToLedger(path, "proposal requested", "Marketer requested a proposal");
                    updateGigStatus(path, 1);
                    // displayInterests(snapHost, snapHost, $('.ui-block#' + key + ' article'));
                } else {
                    database.ref(path + '/proposal').update({
                        "caption": "Marketer selected to pay immediately",
                        "photo_url": false,
                        "time": dNow
                    });
                    event = "Marketer chose to pay immediately";
                    type = "proposal bypassed";
                    writeToLedger(path, type, event);
                    updateGigStatus(path, 2);
                }
            });
        });
    });

}

function refreshInterestsCount(key, interestsCount) {
    $(".ui-block#" + key + " .allInterests span").html(interestsCount);
    $("#postInterestsCount").html(interestsCount);
}