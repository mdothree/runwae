//    1 = "Proposal Requested";
//    2 = "Proposal Submitted";
//    3 = "Proposal Declined";
//    4 = "Payment Sent";
//    5 = "Post Completed";
//    6 = "Post Verified";
//    7 = "Payment Accepted";
var dNow = new Date();
var dNow = dNow.getTime();
firebase.auth().onAuthStateChanged(function (user) {
    var user = firebase.auth().currentUser;
    if (user) {
        useri = user.uid;
        email = user.email;
        //itemkey =>  items/ itemkey/ influencers/ gigkey
        database.ref().child('users/' + useri).once('value', function (snapUser) {
            var role = snapUser.val().role;
            var path = snapUser.val().current_gig;
            var itemKey = path.split("/")[1];
            database.ref().child('items/' + itemKey).once('value', function (snapItem) {
                database.ref().child(path).once('value', function (snapGig) {
                    database.ref().child('users/' + snapItem.val().uid).once('value', function (snapMarketer) {
                        database.ref().child('users/' + snapGig.val().uid).once('value', function (snapInfluencer) {
                            displayDetails(snapMarketer, snapInfluencer, snapItem, snapGig, role);
                            compensationDisplay(snapItem.val().compensation);
                            progressDisplay(snapGig.val().status);
                            stateDisplay(snapGig.val().status, role);
                            disputeHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path, role);
                            declineHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path, role);
                            displayHistory(path);
                            if (snapGig.val().status == 1 || snapGig.val().status == 3) {
                                if (role == "influencer") {
                                    writeProposalAssist(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                                } else if (role == "marketer") {
                                    handleSkipProposalSubmission(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                                }
                            } else if (snapGig.val().status > 1) {
                                displayProposal(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                            }
                            if (snapGig.val().status == 2) {
                                if (role == "marketer") {
                                    proposalResponseHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                                    marketerPaymentHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                                }
                            }
                            if (snapGig.val().status > 3) {
                                if (role == "marketer") {
                                    displayMarketerPayment(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                                }
                            }
                            if (snapGig.val().status == 4) {
                                if (role == "influencer") {
                                    influencerPostHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                                } else if (role == "marketer") {
                                    handleSkipPostVerification(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                                }
                            }
                            if (snapGig.val().status == 5) {
                                if (role == "marketer") {
                                    marketerVerificationHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                                }
                            }
                            if (snapGig.val().status == 6) {
                                if (role == "influencer") {
                                    influencerAcceptHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                                }
                            }
                            if (snapGig.val().status == 7) {
                                if (role == "influencer") {
                                    displayInfluencerPayment(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                                }
                            }
                            if (role != "influencer") {
                                partnerID = snapInfluencer.key;
                            } else {
                                partnerID = snapMarketer.key;
                            }
                            $("#btnMessage").click(function () {
                                openUserConversation(snapUser, partnerID);
                            });
                        });
                    });
                });
            });
        });
    }
});
/////////////////////////////////UTIL/////////////////////////////////////
function writeDispute(marketerID, influencerID, path, dispute) {
    key = database.ref().child('disputes').push().key;
    database.ref().child(path + '/disputes/' + key).set({
        "time": dNow,
        "description": dispute,
        "status": "open"
    });
    database.ref().child('disputes/' + key).set({
        "time": dNow,
        "marketerID": marketerID,
        "influencerID": influencerID,
        "path": path,
        "description": dispute,
        "status": "open"
    });
}

function progressDisplay(status) {
    if (status > 2) {
        status = status - 1;
    }
    for (i = status + 1; i <= 6; i++) {
        $("#step-" + i).attr('disabled', true);
    }
    if (status <= 4) {
        $("#step-" + status).attr('checked', true);
    } else {
        $("#step-5").attr('checked', true);
    }
}

function stateDisplay(status, role) {
    if (role == "marketer") {
        $(".influencer").remove();
        $(".marketer").show();
    } else if (role == "influencer") {
        $(".marketer").remove();
        $(".influencer").show();
    }
    if (0 < status < 4) {
        $("#collapseTwo").removeClass("show");
        $("#collapseOne").addClass("show");
    } else if (3 < status < 7) {
        $("#collapseOne").removeClass("show");
        $("#collapseTwo").addClass("show");
    }
    hideStates();
    $('.' + status).show();
    tabControl(status);
}

function hideStates() {
    for (i = 1; i < 8; i++) {
        $('.' + i).not('a').hide();
    }
}

function tabControl(status) {
    $('#gigNavigationIcons a').click(function () {
        $(".progress input").attr('checked', false);
        id = $(this).attr('id');
        id = id.slice(3);
        id = id[0].toLowerCase() + id.slice(1);
        $(".moreContainer").hide();
        $("#" + id).show();
    });
    $(".progress input").click(function () {
        $(".moreContainer").hide();
    });
}

function titleDisplay(compensation) {
    if (compensation == "money") {
        $('.gift').remove();
    } else {
        $('.money').remove();
    }
    $('.' + compensation).show();
}

function compensationDisplay(compensation) {
    if (compensation == "money") {
        $('.gift').remove();
    } else {
        $('.money').remove();
    }
    $('.' + compensation).show();
}

function displayDetails(snapMarketer, snapInfluencer, snapItem, snapGig, role) {
    if (role == "influencer") {
        var partnerName = snapMarketer.val().name;
    } else {
        var partnerName = snapInfluencer.val().name;
    }
    $("#partnerName").html(partnerName);
    $("#marketer").html(snapMarketer.val().name);
    $("#influencer").html(snapInfluencer.val().name);
    $("#caption").val(snapItem.val().caption);
    $("#compensation").html(snapItem.val().compensation);
    $(".platform").html(snapGig.val().platform);
    if (compensation == "gift") {
        $("#price").closest('.form-group').remove();
        $("textarea#giftDescription").val(snapItem.val().gift_description);
    } else {
        $("textarea#giftDescription").closest('.form-group').remove();
        $("#price").val(snapItem.val().price);
    }
    $('.form-group').removeClass('is-empty');
}
/////////////////////////////////WRITE PROPOSAL/////////////////////////////////////
function writeProposalAssist(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    $("textarea#proposalCaptionInput").on('input', function () {
        $("#proposalPreviewCaption").html($("textarea#proposalCaptionInput").val());
    });
    $("#proposalPreviewInfluencerName").html(snapInfluencer.val().username);
    $("#proposalPreviewBrandName").html(snapMarketer.val().username);
    $("#btnWriteProposal").click(function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (checkFields()) {
            var file = document.getElementById('btnPhoto').files[0];
            if (fileOk(file)) {
                $("#btnWriteProposal").hide();
                $("#writeProposalAlert").html("Submitting Proposal...");
                writeProposal(snapMarketer, snapInfluencer, snapItem, snapGig, path, file);
            }
        }
    });
}

function handleSkipProposalSubmission(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    $("#skipProposalSubmission").click(function (event) {
    // analytics.logEvent('proposal_bypassed', {
    //     category: 'agreement',
    //     platform: platform,
    //     price: snapItem.val().price,
    //     actor_industry: snapHost.val().industry,
    //     actor_id: useri,
    //     recipient_industry: snapInfluencer.val().industry,
    //     recipeint_id: uid,
    //     response_time: responseTime,
    //     gig_id: gigKey,
    //     interest_id: interestKey
    // });
    // database.ref(path + '/proposal').update({
    //     "caption": "Marketer selected to pay immediately",
    //     "photo_url": false,
    //     "time": dNow
    // });
    // event = "Marketer chose to pay immediately";
    // type = "proposal bypassed";
    // writeToLedger(path, type, event);
    // updateGigStatus(path, 2);
    
    //must write bypass proposal to ledger somewhere or check for proposal requested time in transaction
    $("#step-2").attr('disabled', false);
    document.getElementById("step-1").checked = false;
    document.getElementById("step-2").checked = true;
    $('.2').show();
    $("#marketerSubmitPayment").show();
    marketerPaymentHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path);
    });
}

function checkFields() {
    if (!$("textarea#proposalCaptionInput").val()) {
        $("#writeProposalAlert").html("*Caption required");
        return false;
    } else {
        return true;
    }
}
document.getElementById('btnPhoto').addEventListener('change', e => {
    var file = e.target.files[0];
    if (fileOk(file)) {
        $("#btnWriteProposal").hide();
        $("#writeProposalAlert").html("Uploading image...");
        var oldStorageRef = firebase.storage().ref('users/' + useri + '/temp/photo');
        if (oldStorageRef != null && oldStorageRef) {
            oldStorageRef.delete().then(function () {}).catch(function (error) {});
        }
        var storageRef = firebase.storage().ref('users/' + useri + '/temp/photo');
        var task = storageRef.put(file);
        task.on('state_changed', function (snapshot) {
            // Observe state change events such as progress, pause, and resume
            // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
            var progress = Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            $("#writeProposalAlert").html("Uploading image: " + progress + "%");
            switch (snapshot.state) {
                case firebase.storage.TaskState.PAUSED: // or 'paused'
                    break;
                case firebase.storage.TaskState.RUNNING: // or 'running'
                    break;
            }
        }, function (error) {
            $("#writeProposalAlert").html("Error uploading image!");
        }, function () {
            showPhotoField(useri);
        });
    }
});

function fileOk(file) {
    sizeok = false;
    typeok = false;
    if (file.size < 100 * Math.pow(10, 6)) {
        sizeok = true;
    } else {
        $("#writeProposalAlert").html("File size larger than 100 KB...");
    }
    var ext = file.name.split('.').pop().toLowerCase();
    image = ["jpg", "png", "jpeg"];
    video = ["gif", "mp4"];
    if (image.includes(ext) || video.includes(ext)) {
        typeok = true;
    } else {
        $("#writeProposalAlert").html("File type not supported...");
        typeok = false;
    }
    return sizeok && typeok;
}

function showPhotoField(useri) {
    firebase.storage().ref().child('users/' + useri + '/temp/photo').getDownloadURL().then(function (url) {
        $("#proposalPreviewImg").attr('src', url);
        $("#writeProposalAlert").html("Image uploaded!");
        $("#btnWriteProposal").show();
    }).catch(function (error) {});
}

function writeProposal(snapMarketer, snapInfluencer, snapItem, snapGig, path, file) {
    itemKey = snapItem.key;
    firebase.storage().ref().child(path + '/proposal/photo').put(file).then(function (snapshot) {
        firebase.storage().ref().child(path + '/proposal/photo').getDownloadURL().then(function (url) {
            watermarkedPhotoUrl = false;
            // watermarkedDataUrl = convertToWatermarkedImage(url);
            // firebase.storage().ref().child('items/' + itemKey + '/watermarked_photo').putString(watermarkedDataUrl, 'base64url').then(function (snapshot) {
            //     firebase.storage().ref().child('items/' + itemKey + '/watermarked_photo').getDownloadURL().then(function (watermarkedPhotoUrl) {
                    database.ref().child(path + '/ledger').once('value', function (snap) {
                        obj = snap.val();
                        ledgerKeys = Object.keys(obj);
                        events = ledgerKeys.length;
                        ledgerKeys = sortProperties(obj, "time");
                        for (i = 0; i < events; i++) {
                            if (obj[ledgerKeys[i]]["type"] == "proposal requested") {
                                proposalRequestTime = obj[ledgerKeys[i]]["time"]
                            }
                        }
                        if(proposalRequestTime){
                        responseTime = timeDifference(proposalRequestTime);
                        analytics.logEvent('propsal_submitted', {
                            category: 'agreement',
                            platform: snapItem.val().platform,
                            price: snapItem.val().price,
                            actor_industry: snapInfluencer.val().industry,
                            actor_id: snapInfluencer.key,
                            recipient_industry: snapMarketer.val().industry,
                            recipeint_id: snapMarketer.key,
                            response_time: responseTime,
                            gig_id: snapGig.key
                        });
                        
                        database.ref().child('users/' + snapInfluencer.key).update({
                            "total_response_time": snapInfluencer.val().total_response_time + responseTime,
                            "responses": snapInfluencer.val().responses + 1
                        });
                        }
                    });
                                            database.ref(path + '/proposal').update({
                            "caption": $("textarea#proposalCaptionInput").val(),
                            "photo_url": url,
                            "watermarked_photo_url": watermarkedPhotoUrl,
                            "time": dNow
                        });
                        writeNotification(snapInfluencer.key, snapMarketer.key, snapInfluencer.val().username, "submitted a proposal for", "your post", path);
                        event = "Influencer submitted a proposal";
                        type = "proposal submitted";
                        writeToLedger(path, type, event);
                        updateGigStatus(path, 2);
                        window.location.href = "gig";
            //     });
            // });
        });
    });
}

function displayProposal(snapMarketer, snapInfluencer, snapItem, snapGig, path, file) {
    database.ref().child(path + '/proposal').once('value', function (snapProposal) {
        if (snapProposal.val()) {
            if (snapProposal.val().photo_url) {
                if (snapGig.val().status < 4) {
                    if (snapProposal.val().watermarked_photo_url) {
                        $("#proposalImg").attr("src", snapProposal.val().watermarked_photo_url);
                    } else {
                        $("#proposalImg").attr("src", snapProposal.val().photo_url);
                    }
                } else {
                    $("#proposalImg").attr("src", snapProposal.val().photo_url);
                }
                $("#proposalInfluencerName").html(snapInfluencer.val().username);
                $("#proposalBrandName").html(snapMarketer.val().username);
                $("#proposalTime").html(timeDisplay(snapProposal.val().time));
                $("#proposalCaption").html(snapProposal.val().caption);
            } else {
                $("#proposalSubmissionContainer").remove();
            }
                    $("#btnInfluencerDownloadProposal").attr("download", snapInfluencer.val().name + "'s content");
        $("#btnMarketerDownloadProposal").attr("href", snapProposal.val().photo_url);
        } else {
            $("#proposalSubmissionContainer").remove();
            $("#btnInfluencerDownloadProposal").remove();
            $("#btnMarketerDownloadProposal").remove();
        }
    });
}
/////////////////////////////////PROPOSAL RESPONSE & MARKETER PAYMENT/////////////////////////////////////
function proposalResponseHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    $("#btnDeclineProposal").click(function () {
        database.ref().child(path + '/ledger').once('value', function (snap) {
            obj = snap.val();
            ledgerKeys = Object.keys(obj);
            events = ledgerKeys.length;
            ledgerKeys = sortProperties(obj, "time");
            for (i = 0; i < events; i++) {
                if (obj[ledgerKeys[i]]["type"] == "proposal submitted") {
                    lastProposalSubmissionTime = obj[ledgerKeys[i]]["time"]
                }
            }
            if (lastSubmissionTime){
            responseTime = timeDifference(lastSubmissionTime);
            analytics.logEvent('propsal_declined', {
                category: 'agreement',
                platform: snapItem.val().platform,
                price: snapItem.val().price,
                actor_industry: snapMarketer.val().industry,
                actor_id: snapMarketer.key,
                recipient_industry: snapInfluencer.val().industry,
                recipeint_id: snapInfluencer.key,
                response_time: responseTime,
                gig_id: snapGig.key
            });
            database.ref().child('users/' + snapMarketer.key).update({
                "total_response_time": snapMarketer.val().total_response_time + responseTime,
                "responses": snapMarketer.val().responses + 1
            });
            }
        });
        writeNotification(snapMarketer.key, snapInfluencer.key, snapMarketer.val().username, "declined", "your proposal", path);
        event = "Marketer declined the proposal";
        type = "proposal declined";
        writeToLedger(path, type, event);
        updateGigStatus(path, 3);
        window.location.href = "gig";
    });
    $("#btnAcceptProposal").click(function () {
        document.getElementById("step-1").checked = false;
        document.getElementById("step-2").checked = true;
        $("#marketerSubmitPayment").show();
        marketerPaymentHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path);
    });
}
/////////////////////////////////TRANSACTION HANDLERS/////////////////////////////////////
function marketerPaymentHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    if (snapItem.val().compensation == "money") {
        chargeMarketer(snapMarketer, snapInfluencer, snapItem, snapGig, path);
    } else {
        $("#btnSubmitGiftPayment").click(function () {
            if ($("#trackingNumberInput").val()) {
                submitGiftPayment(snapMarketer, snapInfluencer, snapItem, snapGig, path);
            }
        });
    }
}

function displayMarketerPayment(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    if (snapItem.val().compensation == "gift") {
        $(".trackingNumber").html(snapGig.val().tracking_number);
    }
    database.ref().child(path + '/proposal').once('value', function (snapProposal) {
        if (snapProposal.val()) {
            $("#btnMarketerDownloadProposal").attr("download", snapInfluencer.val().name + "'s content");
            $("#btnMarketerDownloadProposal").attr("href", snapProposal.val().photo_url);
        }
    });
}

function influencerPostHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    $("#influencerPostCompleted").click(function () {
        database.ref().child(path + '/ledger').once('value', function (snap) {
            obj = snap.val();
            ledgerKeys = Object.keys(obj);
            events = ledgerKeys.length;
            ledgerKeys = sortProperties(obj, "time");
            for (i = 0; i < events; i++) {
                if (obj[ledgerKeys[i]]["type"] == "payment submitted") {
                    paymentTime = obj[ledgerKeys[i]]["time"]
                }
            }
            if(paymentTime){
            responseTime = timeDifference(paymentTime);
            analytics.logEvent('post_completed', {
                category: 'agreement',
                platform: snapItem.val().platform,
                price: snapItem.val().price,
                actor_industry: snapInfluencer.val().industry,
                actor_id: snapInfluencer.key,
                recipient_industry: snapMarketer.val().industry,
                recipeint_id: snapMarketer.key,
                response_time: responseTime,
                gig_id: snapGig.key
            });
            database.ref().child('users/' + snapInfluencer.key).update({
                "total_response_time": snapInfluencer.val().total_response_time + responseTime,
                "responses": snapInfluencer.val().responses + 1
            });
            }
        });
        writeNotification(snapInfluencer.key, snapMarketer.key, snapInfluencer.val().username, "posted for", " your brand", path);
        event = "Influencer posted on " + snapGig.val().platform;
        type = "post completed";
        writeToLedger(path, type, event);
        updateGigStatus(path, 5);
        window.location.href = "gig";
    });
}

function handleSkipPostVerification(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    $("#skipPostVerification").click(function () {
        database.ref().child(path + '/ledger').once('value', function (snap) {
            obj = snap.val();
            ledgerKeys = Object.keys(obj);
            events = ledgerKeys.length;
            ledgerKeys = sortProperties(obj, "time");
            for (i = 0; i < events; i++) {
                if (obj[ledgerKeys[i]]["type"] == "payment submitted") {
                    postTime = obj[ledgerKeys[i]]["time"]
                }
            }if(postTime){
            responseTime = timeDifference(postTime);
            analytics.logEvent('post_verified', {
                category: 'agreement',
                platform: snapItem.val().platform,
                price: snapItem.val().price,
                actor_industry: snapMarketer.val().industry,
                actor_id: snapMarketer.key,
                recipient_industry: snapInfluencer.val().industry,
                recipeint_id: snapInfluencer.key,
                response_time: responseTime,
                gig_id: snapGig.key
            });
                    database.ref().child('users/' + snapMarketer.key).update({
            "total_response_time": snapMarketer.val().total_response_time + responseTime,
            "responses": snapMarketer.val().responses + 1
        });
            }
        });
        writeNotification(snapMarketer.key, snapInfluencer.key, snapMarketer.val().username, "verified", "your post", path);
        event = "Marketer verified the post";
        type = "post verified";
        writeToLedger(path, type, event);
        updateGigStatus(path, 6);
        window.location.href = "gig";
    });
}

function marketerVerificationHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    $("#marketerPostCompleted").click(function () {
        database.ref().child(path + '/ledger').once('value', function (snap) {
            obj = snap.val();
            ledgerKeys = Object.keys(obj);
            events = ledgerKeys.length;
            ledgerKeys = sortProperties(obj, "time");
            for (i = 0; i < events; i++) {
                if (obj[ledgerKeys[i]]["type"] == "post completed") {
                    postTime = obj[ledgerKeys[i]]["time"]
                }
            }
            responseTime = timeDifference(postTime);
            analytics.logEvent('post_verified', {
                category: 'agreement',
                platform: snapItem.val().platform,
                price: snapItem.val().price,
                actor_industry: snapMarketer.val().industry,
                actor_id: snapMarketer.key,
                recipient_industry: snapInfluencer.val().industry,
                recipeint_id: snapInfluencer.key,
                response_time: responseTime,
                gig_id: snapGig.key
            });
            database.ref().child('users/' + snapMarketer.key).update({
                "total_response_time": snapMarketer.val().total_response_time + responseTime,
                "responses": snapMarketer.val().responses + 1
            });
        });
        writeNotification(snapMarketer.key, snapInfluencer.key, snapMarketer.val().username, "verified", "your post", path);
        event = "Marketer verified the post";
        type = "post verified";
        writeToLedger(path, type, event);
        updateGigStatus(path, 6);
        window.location.href = "gig";
    });
}

function influencerAcceptHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    if (snapItem.val().compensation == "money") {
        payInfluencer(snapMarketer, snapInfluencer, snapItem, snapGig, path);
    } else {
        $("#btnAcceptGiftPayment").click(function () {
            subject = "Your Payment Summary!";
            title = "Payment Details";
            body = "Hey " + snapInfluencer.val().name.split(" ")[0] + "! Congrats on the gig! The details of your transaction are as follows: " + snapMarketer.val().name + " paid you with tracking No. " + snapGig.val().tracking_number + " for a " + snapGig.val().platform + " agreement";
            bodyNote = "You can also keep track of your transactions on your dashbaord. As usual, please don't hesitate to email us if there's anything you think we can do better!";
            moreLink = "Runwae.com/account";
            actionText = "Review Gig";
            sendEmail(snapMarketer.val().email, subject, [title, body, bodyNote, moreLink, actionText]);
            recordInfluencerPaymentAnalytics(snapMarketer, snapInfluencer, snapItem, snapGig, path, false)
            writeNotification(snapInfluencer.key, snapMarketer.key, snapInfluencer.val().username, "accepted", " your payment", path);
            event = "Influencer accepted the payment";
            recordTransaction(snapMarketer, snapInfluencer, snapItem, snapGig, path, 0);
            type = "payment accepted";
            writeToLedger(path, type, event);
            writeCloseGig(snapMarketer, snapInfluencer, snapItem, snapGig, path);
            incrementGigs(snapMarketer, snapInfluencer, snapItem, path);
            updateGigStatus(path, 7);
            window.location.href = "gig";
        });
    }
}

function displayInfluencerPayment(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    if (snapItem.val().compensation == "gift") {
        $(".trackingNumber").html(snapGig.val().tracking_number);
    }
}
/////////////////////////////////HISTORY & DISPUTES & MANAGE /////////////////////////////////////
function displayHistory(path) {
    //    var before = ["{{time}}", "{{event}}"];
    database.ref().child(path + '/ledger').once('value', function (snap) {
        obj = snap.val();
        if(obj){
        ledgerKeys = Object.keys(obj);
        events = ledgerKeys.length;
        ledgerKeys = sortProperties(obj, "time");
        for (i = 0; i < events; i++) {
            eventObj = obj[ledgerKeys[i]];
            eventHTML = "<h6 align='right'>" + timeDisplay(eventObj["time"]) + "</h6>" + "<h6>" + eventObj["event"] + "</h6><br>";
            $("#historyDisplay").append(eventHTML);
            //            after = [timeDisplay(eventObj["time"]), eventObj["event"]];
            //            displayHTML("#historyScript", "#historyDisplay", before, after, 0, 0);
        }
        }
    });
}

function disputeHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path, role) {
    $("#btnFileDispute").click(function () {
        if (role == "marketer") {
            event = "Marketer filed a dispute";
        } else {
            event = "Influencer filed a dispute";
        }
        dispute = $("textarea#disputeInput").val();
        if (dispute) {
            type = "dispute";
            writeToLedger(path, type, event);
            writeDispute(snapMarketer.key, snapInfluencer.key, path, dispute);
            $("#disputeBlock").hide();
            $("#disputeRecorded").show();
        }
    });
}

function declineHandler(snapMarketer, snapInfluencer, snapItem, snapGig, path, role) {
    if (snapGig.val().status > 3) {
        $("#btnDeclineGig").remove();
    } else {
        $("#btnDeclineGig").click(function () {
            writeDeclineGig(snapMarketer, snapInfluencer, snapItem, snapGig, path);
            if (role == "marketer") {
                profileRelocate(snapMarketer, snapMarketer.key);
            } else {
                profileRelocate(snapInfluencer, snapInfluencer.key);
            }
        });
    }
}

function writeDeclineGig(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    database.ref().child('users/' + snapMarketer.key + '/gigs/' + snapGig.key).remove();
    database.ref().child('users/' + snapInfluencer.key + '/gigs/' + snapGig.key).remove();
    database.ref().child(path).remove();
}

function convertToWatermarkedImage(url) {
    $("#proposalCanvasImg").attr("src", url);
    var canvas = document.getElementById('proposalCanvas'),
        ctx = canvas.getContext('2d');
    canvas.width = $('#proposalCanvasImg').width();
    canvas.crossOrigin = "Anonymous";
    canvas.height = $('#proposalCanvasImg').height();
    ctx.drawImage($('#proposalCanvasImg').get(0), 0, 0);
    ctx.font = "18pt Arial, sans-serif";
    //redraw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage($('img').get(0), 0, 0);
    //refill text
    ctx.fillStyle = "white";
    ctx.fillText("RUNWAE PROPOSAL", 10, 20);
    return canvas.toDataURL();
}