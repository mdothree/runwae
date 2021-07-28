var dNow = new Date();
var dNow = dNow.getTime();

function submitGiftPayment(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    database.ref().child(path).update({
        "tracking_number": $("#trackingNumberInput").val()
    });
    subject = "Your Order Summary!";
    title = "Payment Details";
    body = "Hey " + snapMarketer.val().name.split(" ")[0] + "! Congrats on the new partnership! The details of your transaction are as follows: You shipped to " + snapInfluencer.val().name + " with tracking No. " + $("#trackingNumberInput").val() + " for a " + snapGig.val().platform + " agreement";
    bodyNote = "You can also keep track of your transactions on your dashbaord. Please don't hesitate to email us if there's anything you think we can do better!";
    moreLink = "Runwae.com/account";
    actionText = "Review Order";

    sendEmail(snapMarketer.val().email, subject, [title, body, bodyNote, moreLink, actionText]);
    recordMarketerPaymentAnalytics(snapMarketer, snapInfluencer, snapItem, snapGig, path, false)
    writeNotification(snapMarketer.key, snapInfluencer.key, snapMarketer.val().username, "paid you for", "a post", path);
    writeToLedger(path, "payment submitted", "Marketer shipped an item");
    updateGigStatus(path, 4);
}


function chargeMarketer(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    price = Number(snapItem.val().price).toFixed(0);

    subject = "Your Order Summary!";
    title = "Payment Details";
    body = "Hey " + snapInfluencer.val().name.split(" ")[0] + "! Congrats on the new partnership! The details of your transaction are as follows: You paid " + snapInfluencer.val().name + " $" + price + " for a " + snapGig.val().platform + " agreement";
    bodyNote = "You can also keep track of your transactions on your dashbaord. Please don't hesitate to email us if there's anything you think we can do better!";
    moreLink = "Runwae.com/account";
    actionText = "Review Campaign";

    $("#btnSubmitStripePayment").show();
    $("#btnAboutStripe").show();
    var stripe = Stripe('pk_live_c7ZMfvUAwnPROKI545UOYYGg');
    // var stripe = Stripe('pk_test_tF7iq07rv4Sz7VcnzG2L5X4Z');

    // Create an instance of Elements.
    var elements = stripe.elements();
    // Custom styling can be passed to options when creating an Element.
    // (Note that this demo uses a wider set of styles than the guide below.)
    var style = {
        base: {
            color: '#32325d',
            lineHeight: '18px',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                color: '#aab7c4'
            }
        },
        invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
        }
    };

    // Create an instance of the card Element.
    var card = elements.create('card', {
        style: style
    });

    // Add an instance of the card Element into the `card-element` <div>.
    card.mount('#card-element');

    // Handle real-time validation errors from the card Element.
    card.addEventListener('change', function (event) {
        var displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
        } else {
            displayError.textContent = '';
        }
    });

    // Handle form submission.
    var form = document.getElementById('payment-form');
    form.addEventListener('submit', function (event) {
        event.preventDefault();

        stripe.createToken(card).then(function (result) {
            if (result.error) {
                // Inform the user if there was an error.
                var errorElement = document.getElementById('card-errors');
                errorElement.textContent = result.error.message;
            } else {
                // Send the token to your server.
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.onreadystatechange = function () {
                    if (this.readyState == 4 && this.status == 200) {
                        var transactionID = this.responseText.split("JSON:")[1];
                        transactionID = JSON.parse(transactionID).id;
                        if (transactionID) {
                            sendEmail(snapMarketer.val().email, subject, [title, body, bodyNote, moreLink, actionText]);
                            recordMarketerPaymentAnalytics(snapMarketer, snapInfluencer, snapItem, snapGig, path, transactionID);
                            writeNotification(snapMarketer.key, snapInfluencer.key, snapMarketer.val().username, "paid you for", "a post", path);
                            writeToLedger(path, "payment submitted", "Marketer paid $" + price);
                            recordTransaction(snapMarketer, snapInfluencer, snapItem, snapGig, path, transactionID);
                            updateGigStatus(path, 4);
                        } else {
                            errorElement.textContent = "Error sending payment";
                            alert('Error sending payment.');
                        }
                    }
                };

                var params = "stripeToken=" + result.token.id + "&price=" + price * 100 + "&type=chargeMarketer";

                xmlhttp.open("GET", "transaction.php?" + params, true);

                xmlhttp.send();
            }
        });
    });

}

function payInfluencer(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    subject = "Your Payment Summary!";
    title = "Payment Details";
    body = "Hey " + snapInfluencer.val().name.split(" ")[0] + "! Congrats on the gig! The details of your transaction are as follows: " + snapMarketer.val().name + " paid you $" + snapItem.val().price + " for a " + snapGig.val().platform + " agreement";
    bodyNote = "You can also keep track of your transactions on your dashbaord. Please don't hesitate to email us if there's anything you think we can do better!";
    moreLink = "Runwae.com/account";
    actionText = "Review Gig";

    getAccountID();

    function getAccountID() {
        if (window.location.href.includes("code")) {
            var url = window.location.href;
            var code = url.split("code")[1];
            code = code.split("=")[1];
            var xmlhttp = new XMLHttpRequest();
            var address = "transaction.php?";
            xmlhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    var parse = JSON.parse(this.responseText);
                    if (parse.error) {
                        $('#acceptError').html(parse.error_description);
                        alert('Error accepting payment.');
                    } else {
                        var stripe_user_id = parse.stripe_user_id;
                        var refresh_token = parse.refresh_token;
                        var access_token = parse.access_token;
                        payment(stripe_user_id);
                    }
                }
            };
            var params = "code=" + code + "&type=stripeId";
            xmlhttp.open("POST", address + params, true);
            xmlhttp.send();

        } else if (window.location.href.includes("error")) {
            alert('Error accepting payment');
        }
    }

    //+ "&price=" + price * 100 + "&type=stripeId" + "&title=" + title;

    function payment(stripeId) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                sendEmail(snapInfluencer.val().email, subject, [title, body, bodyNote, moreLink, actionText]);
                recordInfluencerPaymentAnalytics(snapMarketer, snapInfluencer, snapItem, snapGig, path, this.responseText);
                writeNotification(snapInfluencer.key, snapMarketer.key, snapInfluencer.val().username, "accepted", "your payment", path);
                writeToLedger(path, "payment accepted", "Influencer accepted payment");
                finalizeTransaction(snapMarketer, snapInfluencer, snapItem, snapGig, path, this.responseText);
                incrementGigs(snapMarketer, snapInfluencer, snapItem, path);
                writeCloseGig(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                updateGigStatus(path, 7);
            } else if (this.status == 500) {
                $('#acceptError').html('Error sending payment.');
                alert('Error sending payment.');
            }
        };
        var params = "stripeId=" + stripeId + "&price=" + snapItem.val().price * 100 + "&type=payInfluencer";
        xmlhttp.open("GET", "transaction.php?" + params, true);
        xmlhttp.send();
    }
}

function recordTransaction(snapMarketer, snapInfluencer, snapItem, snapGig, path, transactionID) {
    key = database.ref().child('transactions').push().key;
    if(snapItem.val().compensation == "gift"){
        tracking_number = snapGig.val().tracking_number;
    }
    else{
        tracking_number = "";
    }
    //write to main transaction
    database.ref().child('transactions/' + key).update({
        "path": path,
        "status": "incomplete",
        "marketer_transactionID": transactionID,
        "influencer_TransactionID": "",
        "price": price = Number(snapItem.val().price).toFixed(0),
        "tracking_number": tracking_number,
        "marketerID": snapMarketer.key,
        "influencerID": snapInfluencer.key,
        "marketer_time": dNow,
        "platform": snapGig.val().platform,
        "compensation": snapItem.val().compensation
    });
    //write transaction key to marketer
    database.ref().child('users/' + snapMarketer.key + '/transactions/' + key).set({
        "path": path,
        "time": dNow,
    });
    database.ref().child('users/' + snapInfluencer.key + '/transactions/' + key).set({
        "path": path,
        "time": dNow,
    });
    //write transaction key to gig
    database.ref().child(path).update({
        "transaction_key": key
    });

}

function finalizeTransaction(snapMarketer, snapInfluencer, snapItem, snapGig, path, transactionID) {
    key = snapGig.val().transaction_key;
    //update main transaction
    database.ref().child('transactions/' + key).update({
        "status": "complete",
        "influencer_transactionID": transactionID,
        "influencer_time": dNow
    });
    //write transaction key to influencer
    database.ref().child('users/' + snapInfluencer.key + '/transactions/' + key).set({
        "path": path,
        "time": dNow,
    });

}

function incrementGigs(snapMarketer, snapInfluencer, snapItem, path) {
    firebase.database().ref().child('items/' + snapItem.key).once('value', function (snap) {
        gigs = snap.val().gigs_count;
        database.ref().child('items/' + snapItem.key).update({
            "gigs_count": Number(gigs + 1)
        });
    });
    firebase.database().ref().child('users/' + snapMarketer.key).once('value', function (snap) {
        gigs = snap.val().gigs_count;
        database.ref().child('users/' + snapMarketer.key).update({
            "gigs_count": Number(gigs + 1)
        });
    });
    firebase.database().ref().child('users/' + snapInfluencer.key).once('value', function (snap) {
        gigs = snap.val().gigs_count;
        database.ref().child('users/' + snapInfluencer.key).update({
            "gigs_count": Number(gigs + 1)
        });
    });
}

function displayTransactions(userSnap, limit) {
    transactionBefore = ["{{path}}", "{{time}}", "{{uid}}", "{{name}}", "{{payment}}", "{{platform}}"];
    role = userSnap.val().role;
    obj = userSnap.val().transactions;
    if (obj) {
        transactionKeys = Object.keys(obj);
        transactions = transactionKeys.length;
        transactionKeys = sortProperties(obj, "time");
        getTransaction(0);
    } else {
        if ($("#transactionsDisplay li").length == 1) {
            $("#transactionsDisplay").html("<h3 align='center' style='width:100%'>No transactions to Display</h3>");
        }
    }

    function getTransaction(n) {
        if (n < limit && n < transactions) {
            var transactionKey = transactionKeys[n];
            var transactionObj = obj[transactionKey];
            if (transactionObj) {
                displayTransaction(transactionObj, n);
            } else {
                getTransaction(n + 1);
            }
        } else {
            if ($("#transactionsDisplay li").length == 1) {
                $("#transactionsDisplay").html("<h3 align='center' style='width:100%'>No transactions to Display</h3>");
            }
            return true;
        }
    }

    function displayTransaction(transactionObj, n) {
        key = transactionKeys[n];
        database.ref().child('transactions/' + key).once('value', function (snapTransaction) {
            if (snapTransaction.val()) {
                if (role == "influencer") {
                    var partnerID = snapTransaction.val().marketerID;
                } else if (role == "marketer") {
                    var partnerID = snapTransaction.val().influencerID;
                }
                if (snapTransaction.val().compensation == "money") {
                    payment = "$" + snapTransaction.val().price;
                } else {
                    payment = snapTransaction.val().tracking_number;
                }
                database.ref().child('users/' + partnerID).once('value', function (snapPartner) {
                    if (snapPartner.val()) {
                        name = snapPartner.val().name;
                        var after = [snapTransaction.val().path, timeDisplay(snapTransaction.val().influencer_time), partnerID, name, payment, snapTransaction.val().platform];
                        displayHTML("#transactionScript", "#transactionsDisplay", transactionBefore, after);
                        $(".transactionLi .openGig").click(function (event) {
                            event.preventDefault();
                            event.stopImmediatePropagation();
                            event.stopPropagation();
                            database.ref().child('users/' + useri).update({
                                current_gig: $(this).closest('.transactionLi').attr("id")
                            });
                            window.location.href = "gig";
                        });
                        $(".transactionLi .partnerName").click(function (event) {
                            event.preventDefault();
                            event.stopImmediatePropagation();
                            event.stopPropagation();
                            id = $(this).attr("id");
                            profileRelocate(userSnap, id);
                        });
                    }
                    getTransaction(n + 1);
                });
            } else {
                getTransaction(n + 1);
            }
        });
    }
}


function recordMarketerPaymentAnalytics(snapMarketer, snapInfluencer, snapItem, snapGig, path, transactionID) {
    //response time if the proposal was requested
    //if the proposal wasn't requested then the response time is based on influencer interest date
    //but the response time from the interest rate is already recorded in the bypass step
    //base the response time for the payment n engagement for now) {
    database.ref().child(path + '/ledger').once('value', function (snap) {
        obj = snap.val();
        ledgerKeys = Object.keys(obj);
        events = ledgerKeys.length;
        ledgerKeys = sortProperties(obj, "time");
        for (i = 0; i < events; i++) {
            if (obj[ledgerKeys[i]]["type"] == "proposal submitted") {
                lastActionTime = obj[ledgerKeys[i]]["time"]
            }
            if (obj[ledgerKeys[i]]["type"] == "proposal bypassed") {
                lastActionTime = obj[ledgerKeys[i]]["time"]
            }
        }
        if(!lastActionTime){
            for (i = 0; i < events; i++) {
                //got here form skip proposal (not pay from interest directly)
                if (obj[ledgerKeys[i]]["type"] == "proposal requested") {
                    lastActionTime = obj[ledgerKeys[i]]["time"]
                }
            }
        }
        responseTime = timeDifference(lastActionTime);
        analytics.logEvent('payment_submitted', {
            category: 'agreement',
            platform: snapItem.val().platform,
            price: snapItem.val().price,
            actor_industry: snapMarketer.val().industry,
            actor_id: snapMarketer.key,
            recipient_industry: snapInfluencer.val().industry,
            recipeint_id: snapInfluencer.key,
            response_time: responseTime,
            gig_id: snapGig.key,
            transaction_id: transactionID
        });
        database.ref().child('users/' + snapMarketer.key).update({
            "total_response_time": snapMarketer.val().total_response_time + responseTime,
            "responses": snapMarketer.val().responses + 1
        });
    });

}


function recordInfluencerPaymentAnalytics(snapMarketer, snapInfluencer, snapItem, snapGig, path, transactionID) {
    database.ref().child(path + '/ledger').once('value', function (snap) {
        obj = snap.val();
        ledgerKeys = Object.keys(obj);
        events = ledgerKeys.length;
        ledgerKeys = sortProperties(obj, "time");
        for (i = 0; i < events; i++) {
            if (obj[ledgerKeys[i]]["type"] == "post verified") {
                verifiedTime = obj[ledgerKeys[i]]["time"]
            }
        }
        responseTime = timeDifference(verifiedTime);
        analytics.logEvent('payment_accepted', {
            category: 'agreement',
            platform: snapItem.val().platform,
            price: snapItem.val().price,
            actor_industry: snapInfluencer.val().industry,
            actor_id: snapInfluencer.key,
            recipient_industry: snapMarketer.val().industry,
            recipeint_id: snapMarketer.key,
            response_time: responseTime,
            gig_id: snapGig.key,
            transaction_id: transactionID
        });
        database.ref().child('users/' + snapInfluencer.key).update({
            "total_response_time": snapInfluencer.val().total_response_time + responseTime,
            "responses": snapInfluencer.val().responses + 1
        });
    });

}