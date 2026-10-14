// Subscribe + guide capture. The address is stored in Firebase; no email is sent
// from this page (email.php is not deployed), so the guide is handed over directly.
$("#btnSubscribe").click(function () {
    var errBool = $(this).closest('form').find('.form-group').hasClass('has-error');
    if ($("#subscribeEmailInput").val() && !errBool) {
        database.ref().child('subscriptions').push().update({
            email: $("#subscribeEmailInput").val(),
            time: new Date().getTime()
        });
        displaySubscriberSuccess();
    }
});

$("#btnMarketerGuide").click(function () {
    var errBool = $(this).closest('form').find('.form-group').hasClass('has-error');
    if ($("#marketerGuideEmailInput").val() && !errBool) {
        database.ref().child('guides').push().update({
            email: $("#marketerGuideEmailInput").val(),
            time: new Date().getTime(),
            type: "marketer"
        });
        displayMarketerGuideSuccess();
        openGuide("/guides/InfluencerMarketingGuide.pdf");
    }
});

$("#btnInfluencerGuide").click(function () {
    var errBool = $(this).closest('form').find('.form-group').hasClass('has-error');
    if ($("#influencerGuideEmailInput").val() && !errBool) {
        database.ref().child('guides').push().update({
            email: $("#influencerGuideEmailInput").val(),
            time: new Date().getTime(),
            type: "influencer"
        });
        displayInfluencerGuideSuccess();
        openGuide("/guides/BecomingAnInfluencerGuide.pdf");
    }
});

function openGuide(url) {
    // Popup blockers may stop this; the success block also carries a download link.
    try { window.open(url, "_blank", "noopener"); } catch (e) { /* link below still works */ }
}

function displaySubscriberSuccess() {
    $('.subscribeSubmit').hide();
    $('.subscribeSuccess').show();
}

function displayInfluencerGuideSuccess() {
    $('.influencerGuideSubmit').hide();
    $('.influencerGuideSuccess').show();
}

function displayMarketerGuideSuccess() {
    $('.marketerGuideSubmit').hide();
    $('.marketerGuideSuccess').show();
}
