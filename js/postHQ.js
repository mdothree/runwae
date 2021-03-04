function writePostAssist(snapUser) {
    useri = snapUser.key;
    $("#writePostPhotoUrl").attr("src", snapUser.val().photo_url);
    $("#priceInput").on('input', function () {
        if ($("#priceInput").val() < 0) {
            $("#priceInput").val(0);
        }
        $("#priceInput").val(Number($("#priceInput").val()).toFixed(0));
    });
    $("#btnWritePost").click(function (event) {
        if (snapUser.key) {
            event.stopPropagation();
            event.stopImmediatePropagation();
            if ($("#alert").html() != "Uploading image...") {
                if (checkFields()) {
                    if (checkCompensation() != false) {
                        var compensation = checkCompensation();
                        var file = document.getElementById('btnPhoto').files[0];
                        if (fileOk(file)) {
                            $("#alert").html("Posting item...");
                            //send type of media and media url to write post !!!
                            writePost(useri, file, compensation);
                        }
                    }
                }
            }
        }
    });
    $("#btnPreview").click(function (event) {
        if (snapUser.key) {
            event.stopPropagation();
            event.stopImmediatePropagation();
            if ($("#alert").html() != "Uploading image...") {
                if (checkFields()) {
                    if (checkCompensation() != false) {
                        var compensation = checkCompensation();
                        displayPreview(snapUser, compensation);
                    }
                }
            }
        }
    });
    function checkFields() {
        //var allFields = allFields();
        if (!$("textarea#postCaption").val()) {
            $("#alert").html("*Caption required");
            return false;
        } else {
            if ($("#priceInput").val() < 10) {
                $("#priceInput").val(10);
                $("#alert").html("Price must be atleast $10");
                return false;
            } else {
                return true;
            }
        }
    }
    function checkCompensation() {
        if (!$("#instagramEnabled").is(':checked') && !$("#twitterEnabled").is(':checked') && !$("#facebookEnabled").is(':checked') && !$("#linkedinEnabled").is(':checked')) {
            $("#alert").html("*Please select a platfrom");
            return false;
        }
        if ($("#compensationCheckbox").is(':checked') == true) {
            var compensation = "money";
        } else {
            var compensation = "gift";
            if (!$("#giftDescriptionInput")) {
                $("#alert").html("*Gift description required");
                return false;
            }
        }
        return compensation;
    }
    $('#add-photo .modal-body').click(function (event) {
        event.stopImmediatePropagation();
        $("#add-photo input").click();
    });
    document.getElementById('btnPhoto').addEventListener('change', e => {
        $("#add-photo .close").click();
        var file = e.target.files[0];
        if (fileOk(file)) {
            $("#alert").html("Uploading image...");
            database.ref().child("users/" + useri).once('value', snap => {
                var oldStorageRef = firebase.storage().ref('users/' + useri + '/temp/photo');
                if (oldStorageRef != null && oldStorageRef) {
                    oldStorageRef.delete().then(function () {
                        // File deleted successfully
                    }).catch(function (error) {
                        // Uh-oh, an error occurred!
                    });
                }
                var storageRef = firebase.storage().ref('users/' + useri + '/temp/photo');
                var task = storageRef.put(file).then(function (snapshot) {
                    showPhotoField(useri);
                });
            });
        }
    });
    function fileOk(file) {
        if (file) {
            sizeok = false;
            typeok = false;
            if (file.size < 100 * Math.pow(10, 6)) {
                sizeok = true;
            } else {
                $("#alert").html("File size larger than 100 KB...");
            }
            var ext = file.name.split('.').pop().toLowerCase();
            image = ["jpg", "png", "jpeg", "gif"];
            video = ["gif", "mp4"];
            if (image.includes(ext) || video.includes(ext)) {
                typeok = true;
            } else {
                $("#alert").html("File type not supported...");
            }
            return sizeok && typeok;
        } else {
            return true;
        }
    }
    function showPhotoField(useri) {
        firebase.storage().ref().child('users/' + useri + '/temp/photo').getDownloadURL().then(function (url) {
            $("#alert").html("Image uploaded!");
            //            $("#postImg").css("background-image", 'url("' + url + '")');
        }).catch(function (error) {});
    }
}
function displayPreview(snapUser, compensation) {
    console.log(snapUser.key);
    $("#open-preview .ui-block").hide();
    $("#triggerPreviewModal").click();
    $("#previewHostUrl, #previewCommentHostUrl").attr("src", snapUser.val().photo_url);
    $("#previewCaption").html($("textarea#postCaption").val());
    if (compensation == "money") {
        $("#previewCompensationIcon").attr("name", "card-outline");
    } else {
        $("#previewCompensationIcon").attr("class", "fa fa-gift");
    }
    $("#previewHostName").html(snapUser.val().name);
    if ($("#instagramEnabled").is(':checked')) {
        $("#previewInstagram").show();
    }
    if ($("#twitterEnabled").is(':checked')) {
        $("#previewTwitter").show();
    }
    if ($("#facebookEnabled").is(':checked')) {
        $("#previewFacebook").show();
    }
    if ($("#linkedinEnabled").is(':checked')) {
        $("#previewLinkedin").show();
    }
    var file = document.getElementById('btnPhoto').files[0];
    if (file) {
        firebase.storage().ref().child('users/' + snapUser.key + '/temp/photo').getDownloadURL().then(function (url) {
            $("#previewPhotoUrl").attr("src", url);
            $("#open-preview .open-photo-thumb").show();
            $("#open-preview .open-photo-content").css("width", null);
            $("#open-preview .ui-block").show();
        }).catch(function (error) {
            $("#alert").html("Error generating preview");
        });
    } else {
        $("#open-preview .open-photo-thumb").hide();
        $("#open-preview .open-photo-content").css("width", "100%");
        $("#open-preview .ui-block").show();
    }
}
function writePost(useri, file, compensation) {
    var itemKey = database.ref().child('items').push().key;
    if (file) {
        var ext = file.name.split('.').pop().toLowerCase();
        image = ["jpg", "png", "jpeg", "gif"];
        video = ["gif", "mp4"];
        type = false;
        if (image.includes(ext)) {
            type = "image";
        } else if (video.includes(ext)) {
            type = "video";
        }
        if (type) {
            firebase.storage().ref().child('items/' + itemKey + '/photo').put(file).then(function (snapshot) {
                firebase.storage().ref().child('items/' + itemKey + '/photo').getDownloadURL().then(function (url) {
                    write(type, useri, compensation, url);
                });
            });
        }
    } else {
        write(false, useri, compensation, "");
    }
    function write(mediaType, useri, compensation, url) {
        database.ref().child('items/' + itemKey).update({
            "caption": $("textarea#postCaption").val(),
            "time": dNow,
            "media_type": mediaType,
            "photo_url": url,
            "video_url": "",
            "interests": "",
            "influencers": "",
            "shares": "",
            "comments": "",
            "uid": useri,
            "compensation": compensation,
            "price": $("#priceInput").val(),
            "gift_description": $("textarea#giftDescriptionInput").val(),
            "interests_count": 0,
            "gigs_count": 0,
            "shares_count": 0,
            "comments_count": 0,
            "status": "active",
            "instagram": $("#instagramEnabled").is(':checked'),
            "twitter": $("#twitterEnabled").is(':checked'),
            "facebook": $("#facebookEnabled").is(':checked'),
            "linkedin": $("#linkedinEnabled").is(':checked')
        });
        database.ref().child('users/' + useri + "/posts/" + itemKey).update({
            "time": dNow,
        });
        writeActivity(useri, "", "posted an item", "", itemKey);
        window.location.href = "explore";
    }
}
