var dNow = new Date();
var dNow = dNow.getTime();
$("#btnSubscribe").click(function () {
    errBool = $(this).closest('form').find('.form-group').hasClass('has-error');
    if ($("#subscribeEmailInput").val() && !errBool) {
        sendEmail($("#subscribeEmailInput").val(), "Thanks for Subscribing!", ["Welcome to Runwae!", "We're a small team of college students around the country with the goal of developing the best platform for meaningful partnerships. We noticed the trend in influencer marketing a while back and decided the real excitement would be in servicing microinfluencers and small brands, so that is who we aim to please. But enough about us. We can't wait to get to know you! Don't be a stranger!", "We're always within reach! Get in touch with us on the Runwae platform or on social media", "Runwae.com", "Visit Runwae"]);
        database.ref().child('subscriptions').push().update({
            email: $("#subscribeEmailInput").val(),
            time: new Date().getTime()
        });
        displaySuccess();
    }
});

$("#btnMarketerGuide").click(function () {
    errBool = $(this).closest('form').find('.form-group').hasClass('has-error');
    if ($("#marketerGuideEmailInput").val() && !errBool) {
        sendEmail($("#marketerGuideEmailInput").val(), "Here's Your Guide!", ["Welcome to Runwae!", "At Runwae we strive to empower brands and influencers while serving them as a trustworthy resource. We believe in protecting our users and forming profitable connections between them above all else.", "We're always within reach! Get in touch with us on the Runwae platform or on social media", "runwae.com/guides/InfluencerMarketingGuide.pdf", "Open Guide"]);
        database.ref().child('guides').push().update({
            email: $("#marketerGuideEmailInput").val(),
            time: new Date().getTime(),
            type : "marketer"
        });
        displayMarketerGuideSuccess();
    }
});

$("#btnInfluencerGuide").click(function () {
    errBool = $(this).closest('form').find('.form-group').hasClass('has-error');
    if ($("#influencerGuideEmailInput").val() && !errBool) {
        sendEmail($("influencerGuideEmailInput").val(), "Here's Your Guide!", ["Welcome to Runwae!", "At Runwae we strive to empower brands and influencers while serving them as a trustworthy resource. We believe in protecting our users and forming profitable connections between them above all else.", "We're always within reach! Get in touch with us on the Runwae platform or on social media", "runwae.com/guides/BecomingAnInfluencerGuide.pdf", "Open Guide"]);
        database.ref().child('guides').push().update({
            email: $("#influencerGuideEmailInput").val(),
            time: new Date().getTime(),
            type : "influencer"
        });
        displayInfluencerGuideSuccess();
    }
});

function sendEmail(emailAddress, subject, payload) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log(this.responseText);
        }
    };
    var params = "emailAddress=" + emailAddress + "&subject=" + subject + "&payload=" + payload;
    xmlhttp.open("GET", "email.php?" + params, true);
    xmlhttp.send();
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