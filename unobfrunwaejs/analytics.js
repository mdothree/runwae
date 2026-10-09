// Page-hit and referrer counters.
// Previously this downloaded the WHOLE database (ref().once('value')) on every
// page view just to read two counters. It now does targeted, write-only
// increments with ServerValue.increment, so no read is needed at all.
//
// Paths written (any visitor, signed in or not, per rules):
//   analytics/pages/{page}/hits                 number, +1 per view
//   analytics/visitingPages/{hostKey}           { host: string, visits: number (+1) }
// {page} is one of the fixed names below; {hostKey} is the referrer hostname
// with RTDB-illegal characters replaced (or "direct" when there is no referrer).
(function () {
    if (typeof firebase === 'undefined' || !firebase.database) return;
    var db = firebase.database();
    var inc = firebase.database.ServerValue.increment(1);
    var url = window.location.href;
    var pages = ["account", "explore", "gig", "messages", "notification", "profile"];

    function warn(err) {
        if (err && window.console) console.warn('analytics: ' + (err.code || err.message || err));
    }

    for (var p = 0; p < pages.length; p++) {
        if (url.indexOf(pages[p]) !== -1) {
            db.ref('analytics/pages/' + pages[p] + '/hits').set(inc).catch(warn);
        }
    }

    var host = "";
    try {
        host = document.referrer ? new URL(document.referrer).hostname : "";
    } catch (e) {
        host = "";
    }
    // Same-site navigation is not a referral.
    if (host === window.location.hostname) return;
    var hostKey = (host || "direct").replace(/[.#$\[\]\/]/g, "_").slice(0, 200);
    db.ref('analytics/visitingPages/' + hostKey).update({
        "host": host,
        "visits": inc
    }).catch(warn);
})();
