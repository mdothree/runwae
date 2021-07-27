function tabAction() {
    $(".startCampaign").click(function () {
        $("#startACampaignForm").hide();
        $("#writePostForm").show();
    });
    $(".nav.nav-tabs li").click(function () {
        var id = $(this).attr("id");
        if (id) {
            var form = id.split("Tab")[0];
            $(".form-group.with-icon").hide();
            $("#" + form + "Form").show();
        }
    });
    $("#compensationToggle").click(function () {
        if ($("#compensationCheckbox").is(':checked') == true) {
            $("#compensationInput").html("Money");
            $("#giftDescriptionDiv").hide();
            $("#moneyInputDiv").show();
        } else {
            $("#compensationInput").html("Gift");
            $("#moneyInputDiv").hide();
            $("#giftDescriptionDiv").show();
        }
    });
    $('#checkboxGiftShipDirectly').change(function () {
        if ($("#checkboxGiftShipDirectly").is(':checked') == true) {
            $("#checkboxGiftAffiliateLink").prop('checked', false);
        } else {
            $("#checkboxGiftAffiliateLink").prop('checked', true);
        }
    });
    $('#checkboxGiftAffiliateLink').change(function () {
        if ($("#checkboxGiftAffiliateLink").is(':checked') == true) {
            $("#checkboxGiftShipDirectly").prop('checked', false);
        } else {
            $("#checkboxGiftShipDirectly").prop('checked', true);
        }
    });
}

function giftMethod() {
    if ($("#checkboxGiftAffiliateLink").is(':checked') == true) {
        return "affiliate link"
    } else {
        return "direct shipment"
    }
}

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
                            writePost(snapUser, file, compensation);
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
            if (!($("#priceInput").val() >= 10) || !($("#priceInput").val() <= 40)) {
                $("#priceInput").val(10);
                $("#alert").html("Price must be between $10 and $40");
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
                var task = storageRef.put(file);
                // .then(function (snapshot) {
                //     showPhotoField(useri);
                // });
                // Register three observers:
                // 1. 'state_changed' observer, called any time the state changes
                // 2. Error observer, called on failure
                // 3. Completion observer, called on successful completion
                task.on('state_changed', function (snapshot) {
                    // Observe state change events such as progress, pause, and resume
                    // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                    var progress = Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    $("#alert").html("Uploading image: " + progress + "%");
                    switch (snapshot.state) {
                        case firebase.storage.TaskState.PAUSED: // or 'paused'
                            break;
                        case firebase.storage.TaskState.RUNNING: // or 'running'
                            break;
                    }
                }, function (error) {
                    $("#alert").html("Error uploading image!");
                    // Handle unsuccessful uploads
                }, function () {
                    showPhotoField(useri);
                    // Handle successful uploads on complete
                    // For instance, get the download URL: https://firebasestorage.googleapis.com/...
                    //   task.snapshot.ref.getDownloadURL().then(function(downloadURL) {
                    //     console.log('File available at', downloadURL);
                    //   });
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
    } else {
        $("#previewInstagram").hide();
    }
    if ($("#twitterEnabled").is(':checked')) {
        $("#previewTwitter").show();
    } else {
        $("#previewTwitter").hide();
    }
    if ($("#facebookEnabled").is(':checked')) {
        $("#previewFacebook").show();
    } else {
        $("#previewFacebook").hide();
    }
    if ($("#linkedinEnabled").is(':checked')) {
        $("#previewLinkedin").show();
    } else {
        $("#previewLinkedin").hide();
    }
    var file = document.getElementById('btnPhoto').files[0];
    if (file) {
        firebase.storage().ref().child('users/' + snapUser.key + '/temp/photo').getDownloadURL().then(function (url) {
            $("#previewPhotoUrl").attr("src", url);
            $("#open-preview .open-photo-thumb").show();
            // $("#open-preview .open-photo-content").css("width", "unset");
            // $("#open-post .open-photo-content").css("width", "null");
            $("#open-post .open-photo-content").css("width", "");
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

function writePost(snapUser, file, compensation) {
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
                    write(type, snapUser, compensation, url);
                });
            });
        }
    } else {
        write(false, snapUser, compensation, "");
    }

    function write(mediaType, snapUser, compensation, url) {
        useri = snapUser.key;
        database.ref().child('items/' + itemKey).update({
            "caption": $("textarea#postCaption").val(),
            "time": dNow,
            "media_type": mediaType,
            "duration": Number($("#postDuration").html()),
            "photo_url": url,
            "video_url": "",
            "interests": "",
            "influencers": "",
            "shares": "",
            "comments": "",
            "uid": useri,
            "compensation": compensation,
            "gift_method": giftMethod(),
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
        analytics.logEvent('post', {
            category: 'activity',
            media_type: mediaType,
            price: $("#priceInput").val(),
            actor_industry: snapUser.val().industry,
            facebook: $("#facebookEnabled").is(':checked'),
            instagram: $("#instagramEnabled").is(':checked'),
            twitter: $("#twitterEnabled").is(':checked'),
            linkedin: $("#linkedinEnabled").is(':checked')
        });
        writeActivity(useri, "", "posted an item", "", itemKey);
        notifyAll(snapUser.key, snapUser.val().username, "posted an", "opportunity", 'items/' + itemKey);
        profileRelocate(useri, useri);
}
}