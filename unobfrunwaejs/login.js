(function () {
    auth();
    if (window.location.href.split("?")[1] == "login") {
        $('#loginPanel').addClass("active show");
    } else {
        $('#signUpPanel').addClass("active show");
    }
    $("#nameInput").on('input', function () {
        str = $("#nameInput").val();
        str = str.substring(0, 22);
        $("#nameInput").val(str);
    });
    $("#usernameInput").on('input', function () {
        str = $("#usernameInput").val();
        str = str.replace(/\s/g, '');
        str = str.substring(0, 22);
        $("#usernameInput").val(str);
    });
    $("#influencerCheckbox").click(function () {
        if ($("#marketerCheckbox").is(':checked') == true) {
            $("#marketerCheckbox").prop("checked", false);
        }
        $("#influencerCheckbox").prop("checked", true);
        $(".nameLabel").html('Name');
    });
    $("#marketerCheckbox").click(function () {
        if ($("#influencerCheckbox").is(':checked') == true) {
            $("#influencerCheckbox").prop("checked", false);
        }
        $("#marketerCheckbox").prop("checked", true);
        $(".nameLabel").html('Brand Name');
    });
    $("#btnSendEmail").click(function () {
        if ($("#forgotPasswordEmail")) {
            sendResetPassword($("#forgotPasswordEmail").val());
        }
    });
    $("#registerNow, #btnRegisterNow").click(function () {
        $("#loginPanel").removeClass("active show");
        // $(".nav-link[href='#signUpPanel']").addClass("active show");
        // $(".nav-link[href='#signUpPanel']").attr("aria-expanded", "true");
        // $(".nav-link[href='#loginPanel']").removeClass("active show");
        // $(".nav-link[href='#loginPanel']").attr("aria-expanded", "true");
        $("#signUpPanel").addClass("active show");
    });
    $("#loginNow").click(function () {
        $("#signUpPanel").removeClass("active show");
        // $(".nav-link[href='#loginPanel']").addClass("active show");
        // $(".nav-link[href='#loginPanel']").attr("aria-expanded", "true");
        // $(".nav-link[href='#signUpPanel']").removeClass("active show");
        // $(".nav-link[href='#signUpPanel']").attr("aria-expanded", "true");
        $("#loginPanel").addClass("active show");
    });
}());