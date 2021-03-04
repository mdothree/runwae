firebase.auth().onAuthStateChanged(function (user) {
    var user = firebase.auth().currentUser;
    if (user) {
        useri = user.uid;
        containerAction();
        database.ref().child('users/' + useri).once('value', function (snap) {
            if (snap.val().current_profile == useri) {
                displayProfile(snap);
                handleRole(snap, snap);
                handlePost(snap, snap);
                ownerRemove();
                owner(snap);
                displayReviews(snap);
                var role = snap.val().role;
                if (role == "marketer") {
                    $("#writePostBlock").show();
                    writePostAssist(snap);
                    tabAction();
                } else {
                    $("#writePostBlock").remove();
                }
            } else {
                $("#userOptions").remove();
                database.ref().child('users/' + snap.val().current_profile).once('value', function (hostSnap) {
                    if (hostSnap.val()) {
                        visitingRemove();
                        displayProfile(hostSnap);
                        handleRole(snap, hostSnap, "#newsfeed-items-grid");
                        handlePost(snap, hostSnap);
                        visitor(snap, hostSnap);
                        handleMessagePreference(snap, hostSnap);
                        displayReviews(hostSnap);
                        handleWriteReview(snap, hostSnap);
                    } else {
                        profileRelocate(snap, useri);
                    }
                });
            }
        });
    } else {
        $(document).click(function (e) {
            e.preventDefault();
            openModal('#open-RegisterOrLogin');
        });
        containerAction();
        var encrypted = window.location.search
        if (encrypted) {
            encrypted = encrypted.replace('?', '');;
        } else {
            window.location.href = "welcome";
        }
        var decrypted = CryptoJS.AES.decrypt(encrypted, "Secret Passphrase");
        key = decrypted.toString(CryptoJS.enc.Utf8);
        $("#userOptions").remove();
        database.ref().child('users/' + key).once('value', function (hostSnap) {
            displayProfile(hostSnap);
            handleRole(hostSnap, hostSnap);
            handlePost(hostSnap, hostSnap);
            visitingRemove();
            visitor(hostSnap, hostSnap);
        });
    }
});

function handlePost(visitorSnap, hostSnap) {
    if (window.location.href.includes("?post")) {
        $("#open-post .ui-block").attr("id", visitorSnap.val().current_item);
        displayPost(visitorSnap, hostSnap, $("#open-post .open-photo-thumb"));
    }
}

function handleRole(visitorSnap, hostSnap) {
    if (hostSnap.val().role == "influencer") {
        $(".marketer").remove();
        $(".influencer").show();
        displayInfluencerGigs(visitorSnap, hostSnap, "#newsfeed-items-grid");
    } else {
        $(".influencer").remove();
        $(".marketer").show();
        displayMarketerCampaigns(visitorSnap, hostSnap, "#newsfeed-items-grid");
    }
    $('#campaigns').click();
    $('#gigs').click();
}

function handleMessagePreference(visitorSnap, hostSnap) {
    hostObj = hostSnap.val();
    messagable = false;
    if (!hostSnap.val().messaging_preference) {
        messagable = true;
    } else if (hostSnap.val().messaging_preference == "everyone") {
        messagable = true;
        $('#btnMessage').show();
    } else if (hostSnap.val().messaging_preference == "following") {
        for (followKey of Object.keys(hostObj["following"])) {
            if (hostObj["following"][followKey]["uid"] == visitorSnap.key) {
                messagable = true;
                $('#btnMessage').show();
                break;
            }
        }
        if (messagable == false) {
            for (gigKey of Object.keys(hostObj["gigs"])) {
                if (hostObj["gigs"][gigKey]["uid"] == visitorSnap.key) {
                    messagable = true;
                    $('#btnMessage').show();
                    break;
                }
            }
        }
    } else {
        for (gigKey of Object.keys(hostObj["gigs"])) {
            if (hostObj["gigs"][gigKey]["uid"] == visitorSnap.key) {
                messagable = true;
                $('#btnMessage').show();
                break;
            }
        }
    }
}


function ownerRemove() {
    $("#btnFollow").remove();
    $("#btnMessage").remove();
    $('#reviewSubmissionBlock').remove();
    ///////////
    $("#btnUpdatePhoto").show();
    $("#btnUpdateHeaderPhoto").show();
    $("#btnCreateGroup").show();
    $("#btnAccount").show();
    $('.top-header.top-header-favorit').show();
}

function visitingRemove() {
    $("#current").remove();
    $("#transactions").remove();
    $("#btnUpdatePhoto").remove();
    $("#btnUpdateHeaderPhoto").remove();
    $("#btnCreateGroup").remove();
    $("#btnAccount").remove();
    //    $("[data-target*='update-photo']").remove();
    $('.top-header.top-header-favorit').show();
}

function owner(snap) {
    initFollow(snap, snap);
    displayTransactions(snap, 100);
    displayCurrent(snap, 100);
    profilePhotos();
}

function visitor(visitorSnap, hostSnap) {
    $(".ownerDisplay").remove();
    if (hostSnap.val().role == "marketer") {
        $("#groups").remove();
        $("#groupsContainer").remove();
    }
    $("#btnMessage").click(function () {
        openUserConversation(visitorSnap, hostSnap.key);
    });
    if (hostSnap.val().role == visitorSnap.val().role) {}
    $("#btnFollow").show();
    initFollow(visitorSnap, hostSnap);
}
$("#btnSubmitGroup").click(function () {
    var ids = ["groupName", "username"];
    var defined = true
    for (i = 0; i <= ids.length; i++) {
        if (!$("#" + ids[i] + "Input").val()) {
            defined = false
        }
    }
    if (defined == false) {
        $("#completeFields").show();
    } else {
        writeGroup($("#groupNameInput").val(), $("#usernameInput").val());
    }
});

function containerAction() {
    //    $('#timelineContainer').show();
    $(".profile-menu li a").click(function () {
        $(".profile-menu li a").removeClass("active");
        $(this).addClass("active");
        id = $(this).attr("id");
        $('.profPanel').hide();
        if ((id == "campaigns") || (id == "gigs") || (id == "current") || (id == "transactions")) {
            $('.timeline').hide();
            $("#timelineContainer").show();
            $('#' + id + "Block").show();
        } else {
            $('#' + id + 'Search').show();
            $('#' + id + 'Container').show();
        }
    });
}

function showField(useri) {
    firebase.storage().ref().child('users/' + useri + '/photo').getDownloadURL().then(function (url) {
        $("#profilePicture, #navProfilePicture").attr("src", url);
        database.ref().child('users/' + useri).update({
            "photo_url": url
        });
    }).catch(function (error) {});
}

function showHeaderField(useri) {
    firebase.storage().ref().child('users/' + useri + '/header').getDownloadURL().then(function (url) {
        $("#headerPicture").attr("src", url);
        database.ref().child('users/' + useri).update({
            "header_url": url
        });
    }).catch(function (error) {});
}

function profilePhotos() {
    $('.profilePictureOverlay').click(function (event) {
        $("#update-photo").addClass('show');
        $('html').append('<div class="modal-backdrop fade show"></div>');
    });
    /* click event only works on header image thumb which contains profile picture also. 
    Including this listener causes an event on both when the above is clicked, causing both popups to
    occur. */
    // $('.top-header-thumb .headerPictureOverlay').click(function (event) {
    //     $("#update-header-photo").addClass('show');
    //     $('html').append('<div class="modal-backdrop fade show"></div>');

    // });
    document.getElementById('btnProfilePhoto').addEventListener('change', e => {
        var file = e.target.files[0];
        if (file.size < 2000000) {
            $("#profilePicture, #navProfilePicture").attr("src", "https://i.gifer.com/7JXX.gif");
            var oldStorageRef = firebase.storage().ref('users/' + useri + '/photo');
            if (oldStorageRef != null) {
                oldStorageRef.delete();
            }
            var storageRef = firebase.storage().ref('users/' + useri + '/photo');
            var task = storageRef.put(file).then(function (snapshot) {
                showField(useri);
            });
            //    database.ref().child("users/" + useri).once('value', snap => {
            //        var oldStorageRef = firebase.storage().ref('users/' + useri + '/temp');
            //        if (oldStorageRef != null) {
            //            oldStorageRef.delete();
            //        }
            //        var storageRef = firebase.storage().ref('users/' + useri + '/temp');
            //        var task = storageRef.put(file).then(function (snapshot) {
            //            showField(useri);
            //        });
            //
            //    });
        }
    });
    document.getElementById('btnHeaderPhoto').addEventListener('change', e => {
        var file = e.target.files[0];
        if (file.size < 2000000) {
            $("#headerPicture").attr("src", "img/loadingheader.gif");
            var oldStorageRef = firebase.storage().ref('users/' + useri + '/header');
            if (oldStorageRef != null) {
                oldStorageRef.delete();
            }
            var storageRef = firebase.storage().ref('users/' + useri + '/header');
            var task = storageRef.put(file).then(function (snapshot) {
                showHeaderField(useri);
            });
            //    database.ref().child("users/" + useri).once('value', snap => {
            //        var oldStorageRef = firebase.storage().ref('users/' + useri + '/temp');
            //        if (oldStorageRef != null) {
            //            oldStorageRef.delete();
            //        }
            //        var storageRef = firebase.storage().ref('users/' + useri + '/temp');
            //        var task = storageRef.put(file).then(function (snapshot) {
            //            showHeaderField(useri);
            //        });
            //
            //    });
        }
    });
}

function displayCurrent(userSnap, limit) {
    before = ["{{path}}", "{{time}}", "{{uid}}", "{{name}}", "{{status}}", "{{platform}}"];
    role = userSnap.val().role;
    gigsObj = userSnap.val().gigs;
    if (gigsObj) {
        gigKeys = Object.keys(gigsObj);
        gigs = gigKeys.length;
        gigKeys = sortProperties(gigsObj, "time");
        getGig(0);
    } else {
        if ($("#currentDisplay li").length == 1) {
            $("#currentDisplay").html("<h3 align='center' style='width:100%'>No current gigs to display</h3>");
        }
    }

    function getGig(n) {
        if (n < limit && n < gigs) {
            var gigKey = gigKeys[n];
            var gigObj = gigsObj[gigKey];
            if (gigObj) {
                if (gigObj["status"] == "open") {
                    displayGig(gigObj, n);
                } else {
                    getGig(n + 1);
                }
            } else {
                getGig(n + 1);
            }
        } else {
            if ($("#currentDisplay li").length == 1) {
                $("#currentDisplay").html("<h3 align='center' style='width:100%'>No current gigs to display</h3>");
            }
            return true;
        }
    }

    function displayGig(gigObj, n) {
        key = gigKeys[n];
        database.ref().child('users/' + gigObj["uid"]).once('value', function (snapPartner) {
            database.ref().child(gigObj["path"]).once('value', function (snapGig) {
                if (snapPartner.val() && snapGig.val()) {
                    name = snapPartner.val().name;
                    status = getStatus(snapGig.val().status);
                    var after = [gigObj["path"], timeDisplay(gigObj["time"]), snapPartner.key, name, status, gigObj["platform"]];
                    displayHTML("#currentScript", "#currentDisplay", before, after);
                    $(".currentLi .openGig").click(function (event) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        event.stopPropagation();
                        database.ref().child('users/' + useri).update({
                            current_gig: $(this).closest('.currentLi').attr("id")
                        });
                        window.location.href = "gig";
                    });
                    $(".currentLi .partnerName").click(function (event) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        event.stopPropagation();
                        id = $(this).attr("id");
                        profileRelocate(userSnap, id);
                    });
                }
                getGig(n + 1);
            });
        });
    }
}

function getStatus(status) {
    switch (status) {
        case 1:
            text = "Proposal Requested";
            break;
        case 2:
            text = "Proposal Submitted";
            break;
        case 3:
            text = "Proposal Declined";
            break;
        case 4:
            text = "Awaiting Post by Influencer";
            break;
        case 5:
            text = "Awaiting Confirmation by Marketer";
            break;
        case 6:
            text = "Awaiting Payment Acceptance";
            break;
        case 7:
            text = "Payment Accepted";
            break;
        default:
            text = "";
    }
    return text;
}