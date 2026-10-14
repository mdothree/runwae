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
                var href = $(this).attr("href");
                if (href.includes("#") && href.length > 1) {
                    window.location.href = window.location.href.split("#")[0] + $(this).attr("href");
                } else if (!href.includes("#") && href.length > 2) {
                    var idArray = ["twitter", "facebook", "linkedin", "instagram"];
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

// Email notifications: the browser only reports WHAT happened (event + ids);
// /api/notify verifies the caller, looks up the recipient and the content in the
// database and sends the email. (Replaces the old email.php relay.)
// Most flows navigate away right after acting, so each event is queued in
// sessionStorage first and flushed now and on the next page load. The server
// de-duplicates, so a retry never sends twice. 409 = records not written yet.
var RW_NOTIFY_KEY = 'runwae_notify_queue';
var rwNotifyFlushing = false;
function rwNotifyRead() {
    try { return JSON.parse(sessionStorage.getItem(RW_NOTIFY_KEY) || '[]') || []; } catch (e) { return []; }
}
function rwNotifyWrite(list) {
    try {
        if (list.length) sessionStorage.setItem(RW_NOTIFY_KEY, JSON.stringify(list.slice(-50)));
        else sessionStorage.removeItem(RW_NOTIFY_KEY);
    } catch (e) { /* storage unavailable */ }
}
function rwNotify(event, ids) {
    var list = rwNotifyRead();
    list.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), event: event, ids: ids || {}, t: Date.now(), n: 0 });
    rwNotifyWrite(list);
    setTimeout(rwNotifyFlush, 600);
}
function rwNotifyFlush() {
    if (rwNotifyFlushing || typeof firebase === 'undefined' || !firebase.auth) return;
    var user;
    try { user = firebase.auth().currentUser; } catch (e) { return; }
    if (!user) return;
    var now = Date.now();
    var list = rwNotifyRead().filter(function (x) { return x && x.n < 6 && now - x.t < 86400000; });
    rwNotifyWrite(list);
    if (!list.length) return;
    rwNotifyFlushing = true;
    user.getIdToken().then(function (token) {
        return Promise.all(list.map(function (x) {
            return fetch('/api/notify', {
                method: 'POST',
                keepalive: true,
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ event: x.event, ids: x.ids })
            }).then(function (r) {
                var retry = r.status === 409 || r.status === 429 || r.status === 401 || r.status >= 500;
                return { id: x.id, retry: retry };
            }).catch(function () { return { id: x.id, retry: true }; });
        }));
    }).then(function (results) {
        var done = {}, retry = {};
        results.forEach(function (r) { if (r.retry) retry[r.id] = true; else done[r.id] = true; });
        rwNotifyWrite(rwNotifyRead().filter(function (x) { return !done[x.id]; }).map(function (x) {
            if (retry[x.id]) x.n = (x.n || 0) + 1;
            return x;
        }));
        if (Object.keys(retry).length) setTimeout(rwNotifyFlush, 5000);
    }).catch(function () { /* keep the queue */ }).then(function () { rwNotifyFlushing = false; });
}
try {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function (u) { if (u) setTimeout(rwNotifyFlush, 1500); });
    }
} catch (e) { /* firebase not initialised on this page yet */ }

function sendVerifyEmail(user) {
    user.sendEmailVerification().then(function () {
        window.localStorage.setItem('emailForSignIn', email);
    }).catch(function (error) {
        // Some error occurred, you can inspect the code: error.code
        var errorCode = error.code;
        $("#emailError").show();
        if (errorCode === "auth/invalid-email" || errorCode === "auth/missing-continue-uri" || errorCode === "auth/invalid-continue-uri" || errorCode === "auth/unauthorized-continue-uri") {
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
            if (errorCode === "auth/invalid-email" || errorCode === "auth/missing-continue-uri" || errorCode === "auth/invalid-continue-uri" || errorCode === "auth/unauthorized-continue-uri") {
                $("#forgotPasswordError").text(errorCode);
                //NOTIFY USERS WITH THE ERROR
            }
        });
}

function displayHTML(scriptDiv, displayDiv, before, after) {
    var html = $(scriptDiv).html();
    html = replaceText(html, before, after);
    $(displayDiv).append(html);
}

// HTML escape function to prevent XSS attacks
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    var str = String(text);
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Placeholders that should NOT be escaped (URLs, IDs, numeric values)
var safePatterns = ['{{uid}}', '{{key}}', '{{src}}', '{{header_src}}', '{{target_key}}',
                    '{{index}}', '{{followers}}', '{{following}}', '{{gigs}}', '{{connections}}',
                    '{{rating}}', '{{status}}', '{{icon}}', '{{remove_display}}'];

function replaceText(original, before, after) {
    if (before.constructor !== Array) {
        before = [before];
        after = [after];
    }
    var result = original;
    for (var i = 0; i < before.length; i++) {
        if (result) {
            var value = after[i];
            // Escape user content to prevent XSS, but not URLs/IDs/numeric values
            if (!safePatterns.includes(before[i])) {
                value = escapeHtml(value);
            }
            result = result.split(before[i]).join(value);
        }
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
    var newobj = {};
    if (ob) {
        for (var p of Object.keys(ob)) {
            var proc = true;
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
    var count = 0;
    if (obj) {
        var keys = Object.keys(obj);
        for (var key of keys) {
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