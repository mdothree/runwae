firebase.auth().onAuthStateChanged(function (user) {
    var user = firebase.auth().currentUser;
    if (user) {
        useri = user.uid;
        email = user.email;
        database.ref().child('users/' + useri).once('value', function (snap) {
            handleMessagePreference();
            displayAccountInfo();
            profilePhotos(snap);
            whoToFollow(snap, 6, "#influencersToFollowDisplay", "influencer");
            whoToFollow(snap, 6, "#brandsToFollowDisplay", "marketer");
            displayActivity(snap, 20);
            $("#btnResetPassword").click(function () {
                sendResetPassword(email);
            });
            $("#btnDeactivateAccount").click(function () {
                analytics.logEvent('account_deactivated', {
                    category: 'authentication'
                });
                deactivateAccount(snap);
            });
            if (user.emailVerified == false) {
                $("#btnVerifyEmail").show();
                $("#btnVerifyEmail").click(function () {
                    sendVerifyEmail(user);
                });
            } else {
                $("#btnVerifyEmail").remove();
            }
            $("#btnSave").click(function () {
                database.ref().child('users/' + useri).once('value', function (snap) {
                    //pass through the current user snap so we can compare it to the info to be updated
                    updateInfo(snap);
                });
            });

            function displayAccountInfo() {
                displayMessagePreference(snap.val().messaging_preference);
                var ids = ["email", "role", "name", "username", "description", "website", "instagram", "twitter", "facebook", "linkedin", "country", "region", "city", "location", "industry"];
                var platforms = ["instagram", "twitter", "facebook", "linkedin"]
                for (i = 0; i <= ids.length; i++) {
                    if (snap.val()[ids[i]] == "" || !snap.val()[ids[i]]) {
                        $("#" + ids[i]).closest('.label-floating').addClass("is-empty");
                    } else {
                        $("#" + ids[i]).closest('.label-floating').removeClass("is-empty");
                        if (platforms.includes(ids[i])) {
                            str = snap.val()[ids[i]];
                            var n = str.lastIndexOf("/");
                            $("#" + ids[i]).val(str.substring(n + 1, str.length));
                        } else {
                            $("#" + ids[i]).val(snap.val()[ids[i]]);
                        }
                    }
                }
            }

            function displaySuccess(snap) {
                var ids = ["email", "role", "name", "username", "description", "website", "instagram", "twitter", "facebook", "linkedin"];
                for (i = 0; i < ids.length; i++) {
                    //if snap doesn't exist and the field is blank then don't display success
                    if (!snap.val()[ids[i]] && ($("#" + ids[i]).val() == "")) {
                        $("#" + ids[i]).closest('.label-floating').removeClass("has-success");
                    } else {
                        if (snap.val()[ids[i]] != $("#" + ids[i]).val()) {
                            //the value has changed
                            $("#" + ids[i]).closest('.label-floating').addClass("has-success");
                        } else {
                            $("#" + ids[i]).closest('.label-floating').removeClass("has-success");
                        }
                    }
                }
            }

            function updateInfo(snap) {
                var city = $("#city").val();
                var region = $("#region").val();
                var country = $("#country").val();
                var location = $("#location").val();
                var industry = $("#industry").val();
                var name = $("#name").val();
                var username = $("#username").val();
                var description = $("#description").val();
                var website = $("#website").val();
                if ($("#instagram").val()) {
                    var instagram = 'https://www.instagram.com/' + $("#instagram").val().replace('@', '');
                } else {
                    var instagram = '';
                }
                if ($("#twitter").val()) {
                    var twitter = 'https://www.twitter.com/' + $("#twitter").val().replace('@', '');
                } else {
                    var twitter = '';
                }
                if ($("#linkedin").val()) {
                    var linkedin = 'https://www.linkedin.com/in/' + $("#linkedin").val().replace('@', '');
                } else {
                    var linkedin = '';
                }
                if ($("#facebook").val()) {
                    var facebook = 'https://www.facebook.com/' + $("#facebook").val().replace('@', '');
                } else {
                    var facebook = '';
                }
                console.log(getMessagePreference())
                var complete = name && username && description && instagram && twitter && linkedin && facebook;
                database.ref().child('users/' + useri).update({
                    "name": name,
                    "username": username,
                    "description": description,
                    "website": website,
                    "instagram": instagram,
                    "twitter": twitter,
                    "linkedin": linkedin,
                    "facebook": facebook,
                    "city": city,
                    "region": region,
                    "country": country,
                    "location": location,
                    "industry": industry,
                    "messaging_preference": getMessagePreference()
                });
                displaySuccess(snap);
                //                displayAccountInfo();
            }
        });
    }
});

function handleMessagePreference() {
    $('#checkboxMessagesFromEveryone').change(function () {
        if ($("#checkboxMessagesFromEveryone").is(':checked') == true) {
            $("#checkboxMessagesFromFollowing").prop('checked', true);
        }
    });
    $('#checkboxMessagesFromFollowing').change(function () {
        if ($("#checkboxMessagesFromFollowing").is(':checked') == false) {
            $("#checkboxMessagesFromEveryone").prop('checked', false);
        }
    });
}

function displayMessagePreference(messagePreference) {
    if (messagePreference == "everyone") {
        $("#checkboxMessagesFromEveryone").prop('checked', true);
        $("#checkboxMessagesFromFollowing").prop('checked', true);
    } else if (messagePreference == "following") {
        $("#checkboxMessagesFromEveryone").prop('checked', false);
        $("#checkboxMessagesFromFollowing").prop('checked', true);
    } else {
        $("#checkboxMessagesFromEveryone").prop('checked', false);
        $("#checkboxMessagesFromFollowing").prop('checked', false);
    }
}

function getMessagePreference() {
    if ($("#checkboxMessagesFromEveryone").is(':checked') == true) {
        return "everyone";
    } else if ($("#checkboxMessagesFromFollowing").is(':checked') == true) {
        return "following";
    } else {
        return "collaborators";
    }
}

function showField(useri) {
    firebase.storage().ref().child('users/' + useri + '/photo').getDownloadURL().then(function (url) {
        $("#infoProfilePicture img").attr("src", url);
        $("#profilePicture, #navProfilePicture").attr("src", url);
        database.ref().child('users/' + useri).update({
            "photo_url": url
        });
    }).catch(function (error) {});
}

function showHeaderField(useri) {
    firebase.storage().ref().child('users/' + useri + '/header').getDownloadURL().then(function (url) {
        $("#infoHeaderPicture img").attr("src", url);
        database.ref().child('users/' + useri).update({
            "header_url": url
        });
    }).catch(function (error) {});
}

function profilePhotos(snap) {
    useri = snap.key;
    $("#infoProfilePicture img").attr("src", snap.val().photo_url);
    $("#infoHeaderPicture img").attr("src", snap.val().header_url);
    $("#infoProfilePicture").show();
    $("#infoHeaderPicture").show();



    document.getElementById('btnProfilePhoto').addEventListener('change', e => {
        var file = e.target.files[0];
        if (file.size < 2000000) {
            $("#infoProfilePicture img").attr("src", "https://i.gifer.com/7JXX.gif");
            var oldStorageRef = firebase.storage().ref('users/' + useri + '/photo');
            if (oldStorageRef != null) {
                oldStorageRef.delete();
            }
            var storageRef = firebase.storage().ref('users/' + useri + '/photo');
            var task = storageRef.put(file).then(function (snapshot) {
                showField(useri);
            });
        }
    });
    document.getElementById('btnHeaderPhoto').addEventListener('change', e => {
        var file = e.target.files[0];
        if (file.size < 2000000) {
            $("#infoHeaderPicture img").attr("src", "img/loadingheader.gif");
            var oldStorageRef = firebase.storage().ref('users/' + useri + '/header');
            if (oldStorageRef != null) {
                oldStorageRef.delete();
            }
            var storageRef = firebase.storage().ref('users/' + useri + '/header');
            var task = storageRef.put(file).then(function (snapshot) {
                showHeaderField(useri);
            });
        }
    });
}