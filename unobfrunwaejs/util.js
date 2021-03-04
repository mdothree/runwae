anchors();
closeModal();
$('.modal-body').click(function () {
    $(this).siblings('input').click();
});
var dNow = new Date();


function shuffle(array) {
    var currentIndex = array.length,
        temporaryValue, randomIndex;
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}

function capitalizeFLetter(word) {
    return word[0].toUpperCase() + word.slice(1);
}

function toObject(arr) {
    var rv = {};
    for (var i = 0; i < arr.length; ++i)
        rv[i] = arr[i];
    return rv;
}

function closeModal() {
    $('.close').click(function () {
        $(this).closest('.modal-content').css("display", "none !important");
        $(this).closest('.modal').removeClass("show");
        $(this).closest('.modal').attr("class", "modal fade");
        $('.modal-backdrop').hide();
        $('.modal-backdrop').attr("class", "modal-backdrop fade");
    });
}

function openModal(el) {
    $('.modal-backdrop').show();
    $('.modal-backdrop').addClass("show");
    $(el).addClass("show");
}

function anchors() {
    $('a').click(function (event) {
        if($(this).attr("id")){
            if (!$(this).attr("id").includes("website") && !$(this).attr("id").includes("btnDownloadProposal")) {
                return;
            }
        }
        if (!$(this).attr("id")) {
                event.preventDefault();
                href = $(this).attr("href");
                if (href.includes("#") && href.length > 1) {
                    window.location.href = window.location.href.split("#")[0] + $(this).attr("href");
                } else if (!href.includes("#") && href.length > 2) {
                    idArray = ["twitter", "facebook", "linkedin", "instagram"];
                    if (idArray.includes($(this).attr("id"))) {
                        window.open(href);
                    } else {
                        window.location.href = href;
                    }
                } else if (href == "") {

                } 
            }
    });
}

function sendEmail(emailAddress, subject, payload) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {}
    };
    var params = "emailAddress=" + emailAddress + "&subject=" + subject + "&payload=" + payload;
    xmlhttp.open("GET", "email.php?" + params, true);
    xmlhttp.send();
}

function sendVerifyEmail(user) {
    user.sendEmailVerification().then(function () {
        window.localStorage.setItem('emailForSignIn', email);
    }).catch(function (error) {
        // Some error occurred, you can inspect the code: error.code
        var errorCode = error.code;
        $("#emailError").show();
        if (errorCode = "auth/invalid-email" || "auth/missing-continue-uri" || "auth/invalid-continue-uri" || "auth/unauthorized-continue-uri") {
            //NOTIFY USERS WITH THE ERROR
        }
    });
    window.location.href = 'account.html';
}

function sendResetPassword(email) {
    analytics.logEvent('reset_password', {
        category: 'authentication',
        email: email
    });
    firebase.auth().sendPasswordResetEmail(
            email).then(function () {
            $('#restore-password .modal-body').html('<h6 style="padding:10px;">Please check your email for further instructions! </h6>')
        })
        .catch(function (error) {
            // Error occurred. Inspect error.code.
            $("#forgotPasswordError").show();
            var errorCode = error.code;
            var errorMessage = error.message;
            if (errorCode = "auth/invalid-email" || "auth/missing-continue-uri" || "auth/invalid-continue-uri" || "auth/unauthorized-continue-uri") {
                $("#forgotPasswordError").html(errorCode);
                //NOTIFY USERS WITH THE ERROR
            }
        });
}

function displayHTML(scriptDiv, displayDiv, before, after) {
    var html = $(scriptDiv).html();
    html = replaceText(html, before, after);
    $(displayDiv).append(html);
}

function replaceText(original, before, after) {
    if (before.constructor !== Array) {
        before = [before];
        after = [after];
    }
    var result = original;
    for (var i = 0; i < before.length; i++) {
        if (result)
            result = result.split(before[i]).join(after[i]);
    }
    return result;
}

function getObjLength(dbpath) {
    var ob = this.snapdb.val()[dbpath];
    var length = Object.keys(ob).length;
    return length
}

function sliceObj(ob, a, b) {
    var sliced = [];
    for (var i = a; i <= b; i++)
        sliced[Object.keys(ob)[i]] = ob[Object.keys(ob)[i]];
    return sliced
}

function filterObj(ob, filters, vals) {
    newobj = {};
    if (ob) {
        for (p of Object.keys(ob)) {
            proc = true;
            for (var j = 0; j < filters.length; j++) {
                if (filters[j] == "key") {
                    if (p != vals[j]) {
                        proc = false;
                    }
                } else {
                    if (ob[p][filters[j]] != vals[j]) {
                        proc = false;
                    }
                }
            }
            if (proc) {
                newobj[p] = ob[p];
            }
        }
        return newobj;
    } else {
        return ob;
    }
}

function sortProperties(obj, order) {
    // convert object into array
    var sortable = [];
    for (var key in obj)
        if (obj.hasOwnProperty(key))
            sortable.push(key); // each item is an array in format [key, value]
    // sort items by value
    sortable.sort(function (a, b) {
        var x = a[order],
            y = b[order];
        return x < y ? -1 : x > y ? 1 : 0;
    });
    return sortable; // array in format [ [ key1, val1 ], [ key2, val2 ], ... ]
}

function sortPropertiesTwo(ob, order) {
    // convert object into array
    var sortable = [];
    for (var key in ob)
        if (ob[key].hasOwnProperty(order))
            sortable.push(key); // each item is an array in format [key, value]
    // sort items by value
    sortable.sort(function (a, b) {
        var x = ob[a][order],
            y = ob[b][order];
        return x < y ? -1 : x > y ? 1 : 0;
    });
    return sortable; // array in format [ [ key1, val1 ], [ key2, val2 ], ... ]
}

function profileRelocate(snapUser, key) {
    database.ref().child('users/' + snapUser.key).update({
        "current_profile": key
    });
    window.location.href = "profile?" + CryptoJS.AES.encrypt(key, "Secret Passphrase");;
}

function writeToLedger(path, type, event) {
    var dNow = new Date();
    var dNow = dNow.getTime();
    database.ref().child(path + '/ledger').push().set({
        "time": dNow,
        "type": type,
        "event": event
    });
}

function getUnreadCount(obj) {
    count = 0;
    if (obj) {
        keys = Object.keys(obj);
        for (key of keys) {
            if (obj[key]["read_or_unread"] == "unread") {
                count += 1;
            }
        }
    }
    return count;
}

function importScripts() {
    $('<script src="https://runwae.com/js/base-init.js"></script>').appendTo(document.body);
}

function timeDifference(time) {
    var dNow = new Date();
    var dNow = dNow.getTime();
    return dNow - time;
}

function timeDisplay(time) {
    var ago = timeDifference(time);
    if (ago > 31540000000) {
        time = Math.floor(ago / 31540000000);
        if (time > 1)
            time += " years ago";
        else
            time += " year ago";
    } else if (ago > 2628000000) {
        time = Math.floor(ago / 2628000000);
        if (time > 1)
            time += " months ago";
        else
            time += " month ago";
    } else if (ago > 86400000) {
        time = Math.floor(ago / 86400000);
        if (time > 1)
            time += " days ago";
        else
            time += " day ago";
    } else if (ago > 3600000) {
        time = Math.floor(ago / 3600000);
        if (time > 1)
            time += " hours ago";
        else
            time += " hour ago";
    } else if (ago > 60000) {
        time = Math.floor(ago / 60000);
        if (time > 1)
            time += " mins ago";
        else
            time += " min ago";
    } else {
        time = "less than a minute ago";
    }
    return time;
}

function getPhotoUrl(role) {
    if (role == "marketer") {
        number = Math.ceil(Math.random() * 11);
        url = "https://runwae.com/logos/logo" + number.toString() + ".png";
    } else {
        number = Math.ceil(Math.random() * 22);
        url = "https://runwae.com/avatars/avatar" + number.toString() + ".jpg";
    }
    return url;
}

function getBackgroundUrl() {
    number = Math.ceil(Math.random() * 10);
    url = "https://runwae.com/backgrounds/background" + number.toString() + ".jpg";
    return url;
}

function getCookieObj() {
    cookie = document.cookie;
    console.log(cookie);
    if (cookie) {
        try {
            var obj = JSON.parse(cookie);
        } catch (e) {
            try {
                cookie = "{" + cookie.split('{')[1].split('}')[0] + "}";
                var obj = JSON.parse(cookie);
            } catch (e) {
                obj = {
                    "auth": false,
                };
            }
        }
    } else {
        obj = {
            "auth": false,
        };
    }
    document.cookie = JSON.stringify(obj);
    return obj;
}