var dNow = new Date();
var dNow = dNow.getTime();

// Payment records (transactions/*, users/{uid}/transactions/*) are written ONLY
// by the api/payment/* serverless functions (firebase-admin). The browser never
// writes them. Calls carry the user's Firebase ID token.
function paymentApi(endpoint, body) {
    var user = firebase.auth().currentUser;
    if (!user) return Promise.reject(new Error('Not signed in'));
    return user.getIdToken().then(function (token) {
        return fetch('/api/payment/' + endpoint, {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(body)
        });
    }).then(function (response) {
        return response.json().then(function (data) {
            data = data || {};
            data.httpStatus = response.status;
            return data;
        });
    });
}

// Gift transactions are recorded via api/payment/record-gift. gigHQ.js navigates
// away right after calling recordTransaction(), so the request is queued in
// sessionStorage and retried on the next page load until the server confirms.
var PENDING_GIFT_KEY = 'runwae_pending_gift_records';
function readPendingGifts() {
    try { return JSON.parse(sessionStorage.getItem(PENDING_GIFT_KEY) || '[]') || []; } catch (e) { return []; }
}
function writePendingGifts(list) {
    try {
        if (list.length) sessionStorage.setItem(PENDING_GIFT_KEY, JSON.stringify(list));
        else sessionStorage.removeItem(PENDING_GIFT_KEY);
    } catch (e) { /* storage unavailable */ }
}
function flushPendingGifts() {
    readPendingGifts().forEach(function (gigPath) {
        paymentApi('record-gift', { gigPath: gigPath }).then(function (data) {
            // Done (or permanently rejected): stop retrying. 5xx/network: keep.
            if (data.success || (data.httpStatus >= 400 && data.httpStatus < 500 && data.httpStatus !== 401)) {
                writePendingGifts(readPendingGifts().filter(function (p) { return p !== gigPath; }));
                if (!data.success && window.console) console.warn('record-gift: ' + (data.message || data.error));
            }
        }).catch(function () { /* retry on next load */ });
    });
}
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) flushPendingGifts();
    });
}

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
    var stripe = Stripe('pk_live_XXXX');
    // var stripe = Stripe('pk_test_XXXX');

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
                // Amount is taken from items/{id}/price on the server; the server
                // also writes transactions/{key} and users/*/transactions/{key}.
                paymentApi('charge-marketer', {
                    stripeToken: result.token.id,
                    gigPath: path
                })
                .then(function(data) {
                    if (data.success && data.chargeId) {
                        sendEmail(snapMarketer.val().email, subject, [title, body, bodyNote, moreLink, actionText]);
                        recordMarketerPaymentAnalytics(snapMarketer, snapInfluencer, snapItem, snapGig, path, data.chargeId);
                        writeNotification(snapMarketer.key, snapInfluencer.key, snapMarketer.val().username, "paid you for", "a post", path);
                        writeToLedger(path, "payment submitted", "Marketer paid $" + price);
                        updateGigStatus(path, 4);
                    } else {
                        var errorElement = document.getElementById('card-errors');
                        errorElement.textContent = data.message || "Error sending payment";
                        alert('Error sending payment.');
                    }
                })
                .catch(function(error) {
                    var errorElement = document.getElementById('card-errors');
                    errorElement.textContent = "Error sending payment";
                    alert('Error sending payment.');
                });
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

            // The server stores the connected account at stripe_accounts/{uid};
            // no Stripe tokens come back to the browser.
            paymentApi('connect-oauth', { code: code })
            .then(function(data) {
                if (!data.success) {
                    $('#acceptError').text(data.error_description || data.message || 'Error connecting to Stripe');
                    alert('Error accepting payment.');
                } else {
                    payment();
                }
            })
            .catch(function(error) {
                $('#acceptError').html('Error connecting to Stripe');
                alert('Error accepting payment.');
            });

        } else if (window.location.href.includes("error")) {
            alert('Error accepting payment');
        }
    }

    function payment() {
        // Server checks the gig, uses the recorded charge amount and the
        // connected account, and finalizes transactions/{key}.
        paymentApi('pay-influencer', { gigPath: path })
        .then(function(data) {
            if (data.success && data.transferId) {
                sendEmail(snapInfluencer.val().email, subject, [title, body, bodyNote, moreLink, actionText]);
                recordInfluencerPaymentAnalytics(snapMarketer, snapInfluencer, snapItem, snapGig, path, data.transferId);
                writeNotification(snapInfluencer.key, snapMarketer.key, snapInfluencer.val().username, "accepted", "your payment", path);
                writeToLedger(path, "payment accepted", "Influencer accepted payment");
                incrementGigs(snapMarketer, snapInfluencer, snapItem, path);
                writeCloseGig(snapMarketer, snapInfluencer, snapItem, snapGig, path);
                updateGigStatus(path, 7);
            } else {
                $('#acceptError').text(data.message || 'Error sending payment.');
                alert('Error sending payment.');
            }
        })
        .catch(function(error) {
            $('#acceptError').html('Error sending payment.');
            alert('Error sending payment.');
        });
    }
}

// Called by gigHQ.js when an influencer accepts a GIFT agreement. Money
// agreements are recorded by api/payment/charge-marketer itself.
// No client writes to transactions/*: queue + call api/payment/record-gift.
function recordTransaction(snapMarketer, snapInfluencer, snapItem, snapGig, path, transactionID) {
    if (snapItem.val().compensation != "gift") return;
    var pending = readPendingGifts();
    if (pending.indexOf(path) === -1) pending.push(path);
    writePendingGifts(pending);
    flushPendingGifts();
}

// Kept for compatibility; api/payment/pay-influencer finalizes the record.
function finalizeTransaction() {}

function incrementGigs(snapMarketer, snapInfluencer, snapItem, path) {
    var inc = firebase.database.ServerValue.increment(1);
    database.ref('items/' + snapItem.key + '/gigs_count').set(inc);
    database.ref('users/' + snapMarketer.key + '/gigs_count').set(inc);
    database.ref('users/' + snapInfluencer.key + '/gigs_count').set(inc);
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