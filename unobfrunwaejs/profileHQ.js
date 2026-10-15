firebase.auth().onAuthStateChanged(function (user) {
    var user = firebase.auth().currentUser;
    if (user) {
        useri = user.uid;
        containerAction();
        // /profile?me (email deep link): always the signed-in user's own profile. current_profile is set first,
        // because the page (and later navigation) reads it.
        if (rwProfileIsMe()) {
            database.ref().child('users/' + useri).update({ current_profile: useri }).then(rwLoadProfile, rwLoadProfile);
        } else {
            rwLoadProfile();
        }
    } else {
        rwSignedOut();
    }
});

function rwProfileIsMe() {
    return /^\?(?:.*&)?me(?:[&=]|$)/.test(window.location.search);
}

function rwLoadProfile() {
        // RW-SEC-03: the owner's record merges users/{uid} + users_private/{uid}.
        rwOwnUser(useri, function (snap) {
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
}

// Signed out: log in, then come back to this URL. The old AES "?<uid>" public view never rendered (this page
// always redirected first: to /login with a query, to /welcome without), so it is gone.
function rwSignedOut() {
    $(".ownerDisplay, #userOptions").remove();
    window.location.href = "/login?login&next=" + encodeURIComponent(window.location.pathname + window.location.search);
}

function handlePost(visitorSnap, hostSnap) {
    if (window.location.href.includes("?post")) {
        $("#open-post .ui-block").attr("id", visitorSnap.val().current_item);
        displayPost(visitorSnap, hostSnap, $("#open-post .open-photo-thumb"));
    }
}

function handleRole(visitorSnap, hostSnap) {
    rwSyncSectionCount();
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

// "N items" in the Services / Campaigns header = the cards timeline.js actually rendered into the grid
// (each card is a .ui-block; the empty state is an <h6>). It used to stay at the static "0 items".
function rwSyncSectionCount() {
    var grid = document.querySelector('#gigsBlock .services-grid');
    var out = document.getElementById('gigCount');
    if (!grid || !out) return;
    function update() {
        var n = 0;
        for (var i = 0; i < grid.children.length; i++) {
            if (grid.children[i].classList.contains('ui-block')) n++;
        }
        out.textContent = n === 1 ? '1 item' : n + ' items';
        out.hidden = n === 0;
    }
    update();
    new MutationObserver(update).observe(grid, { childList: true });
}

// Contact is hidden in profile.html and shown only when the host's messaging_preference lets this visitor write:
// "everyone" (or unset) = anyone; "following" = people the host follows, plus collaborators; "collaborators" =
// people the host has a gig with. Missing following/gigs lists used to throw (Object.keys(undefined)).
function handleMessagePreference(visitorSnap, hostSnap) {
    var host = hostSnap.val() || {};
    var pref = host.messaging_preference || "everyone";
    function listed(list) {
        if (!list) return false;
        for (var k in list) {
            if (list[k] && list[k]["uid"] == visitorSnap.key) return true;
        }
        return false;
    }
    var collaborator = listed(host["gigs"]);
    if (pref == "everyone") {
        messagable = true;
    } else if (pref == "following") {
        messagable = listed(host["following"]) || collaborator;
    } else {
        messagable = collaborator;
    }
    $('#btnMessage').toggle(messagable);
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
    var defined = true;
    for (var i = 0; i < ids.length; i++) {
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
        openModal('#update-photo');
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
    //var fr = new FileReader;
    //fr.onload = function() { // file is loaded
        //var img = new Image;
        //img.onload = function() {
        if (file.size < 2000000) {
        //if (img.width == img.height){
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
        //}
                //};

        //img.src = fr.result; // is the data URL because called with readAsDataURL
    //};

    //fr.readAsDataURL(file);
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
    // Locals on purpose: timeline.js displayInfluencerGigs walks the globals gigKeys/gigsObj/gigs at the
    // same time, and sharing them broke the Services list for users with 2+ gigs.
    var before = ["{{path}}", "{{time}}", "{{uid}}", "{{name}}", "{{status}}", "{{platform}}"];
    role = userSnap.val().role;
    var gigsObj = userSnap.val().gigs;
    var gigKeys, gigs;
    if (gigsObj) {
        gigKeys = Object.keys(gigsObj);
        gigs = gigKeys.length;
        gigKeys = sortProperties(gigsObj, "time");
        getGig(0);
    } else {
        if ($("#currentDisplay li").length == 1) {
            $("#currentDisplay").html("<h3 align='center' style='width:100%'>No applications yet</h3>");
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
                $("#currentDisplay").html("<h3 align='center' style='width:100%'>No applications yet</h3>");
            }
            return true;
        }
    }

    function displayGig(gigObj, n) {
        database.ref().child('users/' + gigObj["uid"]).once('value', function (snapPartner) {
            database.ref().child(gigObj["path"]).once('value', function (snapGig) {
                if (snapPartner.val() && snapGig.val()) {
                    var name = snapPartner.val().name;
                    var status = getStatus(snapGig.val().status);
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