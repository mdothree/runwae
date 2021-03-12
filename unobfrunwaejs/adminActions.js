var dNow = new Date();
var dNow = dNow.getTime();

function actions(snapdb) {
    const obj = {};
    obj.snapdb = snapdb;
    obj.run = function () {

        usersObj = this.snapdb.val()['users'];
        itemsObj = this.snapdb.val()['items'];

        /////////////////////////////////PROFILE COMPLETION EMAIL////////////////////////////////////
        for (u of Object.keys(usersObj)) {
            var ProfileCompletionEmailTime = usersObj[u]["profile_completion_email_time"];
            var registerTime = usersObj[u]["time"];
            var email = usersObj[u]["email"];
            //profile completion email time
            //if 2 weeks since last email
            title = "Hello " + usersObj[u]["name"] + "!";
            body = "Get started on Runwae by completing your profile. Providing accurate information increases your credibility among users and leads to more connections. This also helps keep the runwae community active and engaged!";
            bodyNote = "Please don't hesitate to email us if there's anything you think we can do better!";
            moreLink = "https://runwae.com/account";
            actionText = "Complete Profile";
            if (((dNow - ProfileCompletionEmailTime) > 610000000) || !ProfileCompletionEmailTime) {
                //if a day has gone by since their registration
                if ((dNow - registerTime) > 86400000) {
                    location = usersObj[u]["location"];
                    industry = usersObj[u]["industry"];
                    description = usersObj[u]["description"];
                    photoURL = usersObj[u]["photo_url"];
                    headerURL = usersObj[u]["header_url"];
                    if (!location || (location == "") || !industry || (industry == "") || !description || (description == "") || (photoURL == "https://runwae.com/img/newuser.png") || (headerURL == "https://runwae.com/img/newheader.png")) {
                        if(email == "latarencebutts@yahoo.com" || email == "Runwaeapparel@gmail.com"){
                        // database.ref().child('users/' + u).update({
                        //     "profile_completion_email_time": dNow
                        // });
                        // sendEmail(email, "You're almost there!", [title, body, bodyNote, moreLink, actionText]);
                        console.log("profile Email", email);
                        }
                    }
                }else{
                    console.log(email, "recently emailed");
                }
            }
        }

        /////////////////////////////////GIG COMPLETION EMAIL////////////////////////////////////
        for (itemKey of Object.keys(itemsObj)) {
            for (gigKey of Object.keys(itemsObj[itemKey]["influencers"])) {
                status = itemsObj[itemKey]["influencers"][gigKey]["status"]
                role = statusToRole(status);
                if ((0 < status < 7) && role) {
                    if (role == "influencer") {
                        userKey = itemsObj[itemKey]["influencers"][gigKey]["uid"];
                        userObj = usersObj[userKey];
                        partnerName = usersObj[itemsObj[itemKey]["uid"]]["name"];
                        subject = "Complete Your Gig"
                    } else if (role == "marketer") {
                        userKey = itemsObj[itemKey]["uid"];
                        userObj = usersObj[userKey];
                        partnerName = usersObj[itemsObj[itemKey]["influencers"][gigKey]["uid"]]["name"];
                        subject = "Complete Your Campaign"
                    }
                    var GigCompletionEmailTime = userObj["gig_completion_email_time"];
                    ledgerKeys = Object.keys(itemsObj[itemKey]["influencers"][gigKey]["ledger"])
                    lastLedgerKey = ledgerKeys[ledgerKeys.length - 1]
                    latestTime = itemsObj[itemKey]["influencers"][gigKey]["ledger"][lastLedgerKey]["time"]
                    var registerTime = userObj["time"];
                    var email = userObj["email"];
                    title = "Hello " + userObj[u]["name"] + "!";
                    body = statusToBody(body, partnerName);
                    bodyNote = "Please don't hesitate to email us if there's anything you think we can do better!";
                    moreLink = "https://runwae.com/account";
                    actionText = statusToActionText(body);
                    //if a week since we emailed and a week since response
                    if ((((dNow - GigCompletionEmailTime) > 610000000) || !GigCompletionEmailTime) && ((dNow - latestTime) > 610000000)) {
                        //if a day has gone by since their registration
                        if ((dNow - registerTime) > 86400000) {
                            // database.ref().child('users/' + userKey).update({
                            //     "gig_completion_email_time": dNow
                            // });
                            // sendEmail(email, subject, [title, body, bodyNote, moreLink, actionText]);
                            console.log("gig Email", email);
                            break;

                        }
                    }
                }
            }
        }


        /////////////////////////////////SET USER DM PREFERENCES IF NON EXISTANT////////////////////////////////////


        // for (var key in usersObj) {
        //     database.ref().child('users/' + key + '/messagingPreference').remove();
        //     if (usersObj[key].hasOwnProperty("messaging_preference")) {
        //         database.ref().child('users/' + key).update({
        //             "messaging_preference": "everyone" //following //collaboratrs
        //         });
        //     } else {
        //         database.ref().child('users/' + key).update({
        //             "messaging_preference": "everyone" //following //collaboratrs
        //         });
        //     }
        // }

        /////////////////////////////////INIT REVIEWS////////////////////////////////////


        // for (var key in usersObj) {
        //     if (usersObj[key]["followers"]) {
        //         followersCount = Object.keys(usersObj[key]["followers"]).length;
        //     } else {
        //         followersCount = 0;
        //     }
        //     if (usersObj[key]["followers"]) {
        //         followingCount = Object.keys(usersObj[key]["following"]).length;
        //     } else {
        //         followingCount = 0;
        //     }
        //     database.ref().child('users/' + key).update({
        //         "reviews_received": "",
        //         "reviews_written": "",
        //         "reviews_received_count": 0,
        //         "reviews_written_count": 0,
        //         "favorites_count": 0,
        //         "favorited_count": 0,
        //         "followers_count": followersCount,
        //         "following_count": followingCount
        //     });
        // }

        /////////////////////////////////SET FAVORITES AS FOLLOWERS////////////////////////////////////
        // for (userKey of Object.keys(usersObj)) {
        //     if (usersObj[userKey]["favorites"]) {
        //         for (favoriteKey of Object.keys(usersObj[userKey]["favorites"])) {
        //             database.ref().child('users/' + userKey + '/followers').push().update(usersObj[userKey]["favorites"][favoriteKey]);
        //         }
        //     }
        // }

        // /////////////////////////////////SET FAVORITED AS FOLLOWING////////////////////////////////////
        // for (userKey of Object.keys(usersObj)) {
        //     if (usersObj[userKey]["favorited"]) {
        //         for (favoriteKey of Object.keys(usersObj[userKey]["favorited"])) {
        //             database.ref().child('users/' + userKey + '/following').push().update(usersObj[userKey]["favorited"][favoriteKey]);
        //         }
        //     }
        // }

        // /////////////////////////////////REMOVE FAVORITES AND FAVORITED////////////////////////////////////
        // for (userKey of Object.keys(usersObj)) {
        //     database.ref().child('users/' + userKey + '/favortied').remove();
        //     database.ref().child('users/' + userKey + '/favorited').remove();
        //     database.ref().child('users/' + userKey + '/favorites').remove();
        //     database.ref().child('users/' + userKey + '/favorited_count').remove();
        //     database.ref().child('users/' + userKey + '/favorites_count').remove();
        // }


        /////////////////////////////////SET SUBSCRIPTION TIME IF NON EXISTANT////////////////////////////////////

        //     ob = this.snapdb.val()["subscriptions"]
        //     for (var key in ob){
        //     if (ob[key].hasOwnProperty("time")){

        //     }
        //     else{
        //         database.ref().child('subscriptions/' + key).update({
        //             "time": 1550102039494
        //         });
        //     }
        // }

        /////////////////////////////////SET USER TIME IF NON EXISTANT////////////////////////////////////


        //             ob = this.snapdb.val()["users"]
        //     for (var key in ob){
        //     if (ob[key].hasOwnProperty("time")){

        //     }
        //     else{
        //         database.ref().child('users/' + key).update({
        //             "time": 1550102039494
        //         });
        //     }
        // }
        /////////////////////////////////SET PROFILE PICTURE IF ON EXISTANT////////////////////////////////////

        //     ob = this.snapdb.val()["users"]
        //     for (var key in ob){
        //     if (ob[key]["photo_url"].includes("/logos/") || ob[key]["photo_url"].includes("/avatars/") ){
        //         database.ref().child('users/' + key).update({
        //             "photo_url": "https://runwae.com/img/newuser.png"
        //         });
        //     }
        //     if (ob[key]["header_url"].includes("/backgrounds/") ){
        //         database.ref().child('users/' + key).update({
        //             "header_url": "https://runwae.com/img/newheader.png"
        //         });
        //     }

        // }

        /////////////////////////////////INIT TUTORIAL COMPLETION NON EXISTANT////////////////////////////////////

        // ob = this.snapdb.val()["users"]
        //     for (var key in ob){
        //         database.ref().child('users/' + key).update({
        //     "exploreTutorialCompleted" : false
        //     });
        // }

        //         ob = this.snapdb.val()["users"]
        //     for (var key in ob){
        //         database.ref().child('users/' + key).update({
        //     "verified" : false
        //     });
        // }

        /////////////////////////////////SHORTEN USERNAMS TO X CHARACTERS////////////////////////////////////
        // ob = this.snapdb.val()["users"]
        //     for (var key in ob){
        //         // console.log(key);
        //     database.ref().child('users/' + key).update({
        //     "name" : ob[key]["name"].substring(0,22),
        //     "username" : ob[key]["username"].substring(0,22),
        //     });
        // }

        /////////////////////////////////RESET USER NAMES IF NON EXISTANT////////////////////////////////////
        // ob = this.snapdb.val()["users"]
        //     for (var key in ob){
        //         if (ob[key]["name"] == "Runwae User" &&  ob[key]["username"] == "runwaeuser" ){
        //     database.ref().child('users/' + key).update({
        //     "name" : 'John Doe',
        //     "username" : 'johndoe' + Math.floor(Math.random()*Math.pow(10,5)),
        //     });
        // }
        // else if (ob[key]["name"] == "Runwae User" ){
        //     database.ref().child('users/' + key).update({
        //     "name" : ob[key]["username"],
        //     });
        // }

        // }
        /////////////////////////////////SET STATUS 0 TO 1 FOR ALL GIGS////////////////////////////////////

        // ob = this.snapdb.val()["items"]
        // for (var key in ob){
        //     for (var keyy in ob[key]["influencers"]){
        //         if (ob[key]["influencers"][keyy]["status"] == 0){
        //             database.ref().child('items/' + key +'/influencers/'+keyy).update({
        //                 "status" : 1
        //                 });
        //         }
        //     }
        // }
    }
    return obj;
}

function statusToRole(status) {
    switch (status) {
        case 1:
            return "influencer";
            break;
        case 2:
            return "marketer";
            break;
        case 3:
            return "influencer";
            break;
        case 4:
            return "influencer";
            break;
        case 5:
            return "marketer";
            break;
        case 6:
            return "influencer";
            break;
        default:
            return false
    }
}

function statusToBody(status, parterName) {
    switch (status) {
        case 1:
            return partnerName + " is waiting for your response! Submit a proposal so that you can proceed with the agreement!";
            break;
        case 2:
            return "Did you see the proposal that " + partnerName + " submitted for your campaign? Accept this proposal or decline it so that you can recieve a better one!";
            break;
        case 3:
            return "It appears that " + partnerName + " wasn't satified with the proposal that you submitted. Submit another proposal so that you can proceed with the agreement!";
            break;
        case 4:
            return partnerName + " paid you for a Gig! Confirm that you've posted the content to complete the remainder of the agreement";
            break;
        case 5:
            return partnerName + " completed the post for your campaign! Verify that they've posted the itemt to complete the remainder of the agreement";
            break;
        case 6:
            return partnerName + " verified that you completed the post! Return to Runwae to accept your payment!";
            break;
        default:
            return false
    }
}


function statusToActionText(status) {
    switch (status) {
        case 1:
            return "Submit Proposal";
            break;
        case 2:
            return "Review Proposal";
            break;
        case 3:
            return "Submit Proposal";
            break;
        case 4:
            return "Complete Post"
            break;
        case 5:
            return "Verify Post"
            break;
        case 6:
            return "Accept Payment"
            break;
        default:
            return false
    }
}
//    1 = "Proposal Requested";
//    2 = "Proposal Submitted";
//    3 = "Proposal Declined";
//    4 = "Payment Sent";
//    5 = "Post Completed";
//    6 = "Post Verified";
//    7 = "Payment Accepted";