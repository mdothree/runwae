var dNow = new Date();
var dNow = dNow.getTime();

var dbRef = firebase.database().ref();
dbRef.once('value', function (snapdb) {
ob = this.snapdb.val()['users'];
$(displayDiv).html("");
i = 0
for (u of Object.keys(obj)) {
    var ProfileCompletionEmailTime = obj[u]["profile_completion_email_time"];
    var GigCompletionEmailTime = obj[u]["gig_completion_email_time"];
    var CommunityEngagementEmailTime = obj[u]["community_engagement_email_time"];
    var registerTime = obj[u]["time"];
    var email = obj[u]["time"];
    //profile completion email time
    //if 2 weeks since last email
    title = "Hello "+obj[u]["name"]+",";
    body = "Get started on Runwae by completing your profile. Providing accurate information increases your credibility among users and leads to more connections. This also helps keep the runwae community active and engaged!";
    bodyNote = "Please don't hesitate to email us if there's anything you think we can do better!";
    moreLink = "https://runwae.com/account";
    if(((dNow - ProfileCompletionEmailTime) > 1210000000) || !ProfileCompletionEmailTime){
        //if a day has gone by since their registration
        if((dNow - registerTime) > 86400000){
            location = obj[u]["location"];
            industry = obj[u]["industry"];
            description = obj[u]["description"];
            photoURL = obj[u]["photo_url"];
            headerURL = obj[u]["header_url"];
            if(!location || (location=="") || !industry || (industry=="") || !description || (description=="") || (photoURL =="https://runwae.com/img/newuser.png") || (headerURL =="https://runwae.com/img/newheader.png")){
                if(email=="latarencebutts@yahoo.com"){
                    database.ref().child('users/' + u).update({
                        "profile_completion_email_time" : dNow
                    });                    
                    sendEmail(email, "You're almost there!", [title, body, bodyNote, moreLink]);
                }
            }
        }
    }
    //gig completion email time


    //community engagement email time
    //completed gigs emails

}
});

