var dNow = new Date();
var dNow = dNow.getTime();

function writeCloseGig(snapMarketer, snapInfluencer, snapItem, snapGig, path) {
    database.ref().child('users/' + snapMarketer.key + '/gigs/' + snapGig.key).update({
        "status": "closed"
    });
    database.ref().child('users/' + snapInfluencer.key + '/gigs/' + snapGig.key).update({
        "status": "closed"
    });

}