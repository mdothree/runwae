var dbRef = firebase.database().ref();
dbRef.once('value', function (snapdb) {
    updatePageHits(snapdb);
    logVisitingPage(snapdb);
    // handlePageDuration(snapdb);
    // fired = false;
    // $("textarea#postCaption").on('change keyup paste', function() {
    //     if(!fired){
    //         fired = true;
    //         handlePostDuration(snapdb);
    //     }
    // });

});



// function handlePageDuration(snapdb){
// t1 = setTimeout(alertFunc(snapdb), 60000);
// function alertFunc(snapdb) {
//     updatePageDuration(snapdb)
//     t2 = setTimeout(alertFunc(snapdb), 60000);
// }
// }

// function handlePostDuration(snapdb){   
//     dt = 15000
//     t1 = setTimeout(alertFunc(snapdb), dt);
// function alertFunc(snapdb) {
//     $("#postDuration").html(Number($("#postDuration").html())+dt)
//     t2 = setTimeout(alertFunc(snapdb), dt);
// }
// }

// function handlePageDuration(snapdb){
//     // t1 = setTimeout(updatePageDuration(snapdb), 60000);
//     setInterval(updatePageDuration(snapdb), 60000);
//  }

// function handlePostDuration(snapdb){   
//     setInterval(updatePostDuration(snapdb), 15000);
// }

function updatePostDuration(snapdb){
    $("#postDuration").html(Number($("#postDuration").html())+dt)
    // handlePostDuration(snapdb);
}


function updatePageDuration(snapdb){
    url = window.location.href ;
    pages = ["account", "explore", "gig", "messages", "notification", "profile"];
    pagesObj = snapdb.val()["analytics"]["pages"]
    for (p in pages){
        if (url.includes(pages[p])){
            database.ref().child('analytics/pages/' + pages[p]).update({
                "duration": pagesObj[pages[p]]["duration"] +  60000
            });
        }
    }
    // handlePageDuration(snapdb);
}

function updatePageHits(snapdb){
    url = window.location.href ;
    pages = ["account", "explore", "gig", "messages", "notification", "profile"];
    pagesObj = snapdb.val()["analytics"]["pages"]
    for (p in pages){
        if (url.includes(pages[p])){
            database.ref().child('analytics/pages/' + pages[p]).update({
                "hits": pagesObj[pages[p]]["hits"] +1
                });
        }
    }
}

function logVisitingPage(snapdb){
    host = document.referrer
    visitingPagesObj = snapdb.val()["analytics"]["visitingPages"]
        if (!visitingPagesObj) {
            writeVisits("", host, 1);
        } else {
            visitingPagesKeys = Object.keys(visitingPagesObj);
            logged = false;
            for (i = 0; i < visitingPagesKeys.length; i++) {
                if (visitingPagesObj[visitingPagesKeys[i]]["host"] == host) {
                    logged = true;
                    visits = visitingPagesObj[visitingPagesKeys[i]]["visits"] 
                    writeVisits(visitingPagesKeys[i], host, visits +1)
                    break;
                }
            }
            if (!logged) {
                writeVisits("", host, 1);
            } 
        }
}
function writeVisits(key, host, visits){
    if (!key){
        key = database.ref().child('analytics/visitingPages').push().key;
    }
    database.ref().child('analytics/visitingPages/' + key).update({
        "host": host,
        "visits": visits
    });

}