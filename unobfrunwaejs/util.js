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

// HTML escape function to prevent XSS attacks (text and quoted attribute values).
// replaceText() calls rwEscapeHtml directly: js/profile-marketplace.js declares
// its own global escapeHtml later on profile.html, which would otherwise win.
function rwEscapeHtml(text) {
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

function escapeHtml(text) {
    return rwEscapeHtml(text);
}

// Template filling. Every placeholder value is HTML-escaped (text and attribute
// values alike; escaping a URL inside an attribute is harmless because the
// browser decodes &amp; there). The ONLY values inserted raw are trusted
// fragments wrapped with rwHtml(): HTML that was itself assembled from our own
// templates via replaceText() (so its user data is already escaped) or a
// static template. Data read from Firebase is plain JSON and can never be an
// RwTrustedHtml, so user data cannot opt out of escaping.
function RwTrustedHtml(html) {
    this.html = (html === null || html === undefined) ? '' : String(html);
}
RwTrustedHtml.prototype.toString = function () {
    return this.html;
};

function rwHtml(html) {
    return (html instanceof RwTrustedHtml) ? html : new RwTrustedHtml(html);
}

// Placeholders whose value lands in src/href: only http(s), relative URLs and
// data:image/* survive; javascript:, data:text/html, vbscript: etc. become ''.
var rwUrlPlaceholders = ['{{src}}', '{{header_src}}', '{{photo_src}}', '{{video_src}}', '{{url}}',
                       '{{image}}', '{{reviewerAvatar}}', '{{href}}'];

function rwSafeUrl(value) {
    if (value === null || value === undefined) return '';
    var str = String(value).trim();
    var probe = str.replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase();
    var scheme = probe.match(/^([a-z][a-z0-9+.\-]*):/);
    if (scheme) {
        if (scheme[1] === 'http' || scheme[1] === 'https') return str;
        if (scheme[1] === 'data' && /^data:image\//.test(probe)) return str;
        return '';
    }
    return str;
}

// Profile website (user-entered, shown as a clickable link). Only absolute
// http(s) URLs with a real host name; a bare "example.com" gets https://.
// javascript:, data:, vbscript:, quotes, spaces etc. return '' (hide the link).
function rwExternalUrl(value) {
    if (value === null || value === undefined) return '';
    var str = String(value).trim();
    if (!str || /[\u0000- \u007f"'<>`\\]/.test(str)) return '';
    var probe = str.toLowerCase();
    var scheme = probe.match(/^([a-z][a-z0-9+.\-]*):/);
    if (scheme && scheme[1] !== 'http' && scheme[1] !== 'https') {
        // "example.com:8080/x" looks like a scheme; accept it only as host:port.
        if (scheme[1].indexOf('.') === -1 || !/^[a-z0-9.\-]+:\d+(\/|$)/.test(probe)) return '';
        scheme = null;
    }
    if (!scheme) str = 'https://' + str.replace(/^\/+/, '');
    var u;
    try {
        u = new URL(str);
    } catch (e) {
        return '';
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    if (u.username || u.password) return '';
    if (!/^[a-z0-9\-]+(\.[a-z0-9\-]+)*\.[a-z0-9\-]{2,}$/i.test(u.hostname)) return '';
    return u.href;
}

// Links to stored files (e.g. a proposal's photo_url for "Download Content"):
// absolute http(s) only, as-is; anything else (javascript:, data:, relative) is ''.
function rwHttpUrl(value) {
    if (value === null || value === undefined) return '';
    var str = String(value).trim();
    if (!/^https?:\/\//i.test(str) || /[\u0000-\u0020\u007f"'<>`\\]/.test(str)) return '';
    try {
        var u = new URL(str);
        return (u.protocol === 'http:' || u.protocol === 'https:') ? str : '';
    } catch (e) {
        return '';
    }
}

// Social links: never use a user-supplied URL. The link is a fixed per-platform
// base plus the encoded handle. Stored values are either our own saved profile
// URL (base + handle) or a bare handle.
var rwSocialBases = {
    instagram: 'https://www.instagram.com/',
    twitter: 'https://www.twitter.com/',
    facebook: 'https://www.facebook.com/',
    linkedin: 'https://www.linkedin.com/in/'
};
var rwSocialHandleRe = /^[A-Za-z0-9._\-]{1,100}$/;

function rwStripSocialPrefix(str) {
    return str.replace(/^(?:(?:https?:)?\/\/)?(?:www\.|m\.|mobile\.)?(?:instagram|twitter|x|facebook|fb|linkedin)\.com\/(?:in\/)?/i, '');
}

// Handle from a stored/typed value, or '' when it is not a plain handle.
// strict (account form): only a leading @ and a trailing / are tolerated.
function rwSocialHandle(value, strict) {
    if (value === null || value === undefined) return '';
    var str = rwStripSocialPrefix(String(value).trim());
    if (strict) {
        str = str.replace(/^@/, '').replace(/\/$/, '');
    } else {
        str = str.split(/[?#]/)[0].replace(/[@\/\s]+/g, '');
    }
    return rwSocialHandleRe.test(str) ? str : '';
}

function rwSocialUrl(platform, value, strict) {
    if (!Object.prototype.hasOwnProperty.call(rwSocialBases, platform)) return '';
    var handle = rwSocialHandle(value, strict);
    return handle ? rwSocialBases[platform] + encodeURIComponent(handle) : '';
}

function rwTemplateValue(placeholder, value) {
    if (value instanceof RwTrustedHtml) return value.html;
    if (rwUrlPlaceholders.indexOf(placeholder) !== -1) value = rwSafeUrl(value);
    return rwEscapeHtml(value);
}

// Single pass: an inserted value is never scanned again, so a caption that
// contains "{{media}}" stays literal text.
function replaceText(original, before, after) {
    if (!Array.isArray(before)) {
        before = [before];
        after = [after];
    }
    if (!original) return original;
    var values = Object.create(null);
    var keys = [];
    for (var i = 0; i < before.length; i++) {
        if (!(before[i] in values)) {
            values[before[i]] = rwTemplateValue(before[i], after[i]);
            keys.push(String(before[i]));
        }
    }
    if (!keys.length) return original;
    keys.sort(function (a, b) { return b.length - a.length; });
    var pattern = new RegExp(keys.map(function (k) {
        return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('|'), 'g');
    return original.replace(pattern, function (m) { return values[m]; });
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