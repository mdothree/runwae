function auth() {
    signUp();
    login();
}

document.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        if ($('.nav-link.active').attr("href") == "#home") {
            $("#btnSignUp").click();
        } else if ($('.nav-link.active').attr("href") == "#profile") {
            $("#btnLogin").click();
        }
    }
});

function login(info) {
    $("#btnLogin").click(function () {
        var email = $("#txtEmailLogin").val();
        var pass = $("#txtPasswordLogin").val();
        if (email && pass) {
            signIn(email, pass);
        } else {
            $("#loginError").html("*Invalid email or password");
        }
    });
}

function signUp(info) {
    $("#btnSignUp").click(function () {
        if ($("#termsCheckbox").is(':checked') == true) {
            if ($("#marketerCheckbox").is(':checked') == true || $("#influencerCheckbox").is(':checked') == true) {
                var email = $("#txtEmailSignUp").val();
                var pass = $("#txtPasswordSignUp").val();
                var passStrength = passwordStrength(pass);
                if (passStrength) {
                    if (email && pass) {
                        if ($('#usernameInput').val() && $('#nameInput').val()) {
                            createUser(email, pass);

                            // var dbRef = firebase.database().ref();
                            // dbRef.once('value', function (snapdb) {
                            //     obj = snapdb.val().users;
                            //     fail = false;
                            //     for (key in Object.keys(obj)){
                            //         if(obj[key]["username"] == $('#usernameInput').val()){
                            //             fail = true;
                            //         } 
                            //     }
                            //     if (!fail){
                            //         createUser(email, pass);
                            //     }else {
                            //         $("#error").html("*That username is taken");
                            //     }
                            // });
                        } else {
                            $("#error").html("*All fields required");
                        }
                    } else {
                        $("#error").html("*Invalid email or password");
                        // display password weak
                    }
                } else {
                    $("#error").html("*Password is too weak");
                }
            } else {
                $("#error").html("*Please select marketer or influencer");
            }
        } else {
            $("#error").html("*Must accept terms and conditions to register");
        }
    });

}


function passwordStrength(password) {
    //find a password module
    var acceptable = true;
    if (acceptable) {
        bool = true;
    }
    return bool;
}

function signIn(email, password) {
    firebase.auth().signInWithEmailAndPassword(email, password).then(function () {
        firebase.auth().onAuthStateChanged(function (user) {
            var user = firebase.auth().currentUser;
            if (user) {
                useri = user.uid;
                // obj = getCookieObj();
                // obj.auth = true;
                // document.cookie = JSON.stringify(obj);
                analytics.logEvent('login', {
                    category: 'authentication',
                    user_id: useri
                });
                window.location.href = 'explore';
            } else {
                var myVar = setTimeout(myTimer, 2000);

                function myTimer() {
                    $("#loginError").html("*Failed login attempt");
                }
            }
        });
    }).catch(function (error) {
        $("#loginError").html("*Failed login attempt");
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode == "auth/invalid-email" || "auth/user-disabled" || "auth/user-not-found" || "auth/wrong-password") {

        }
    });
}




function createUser(email, password) {
    // var role = $("#roleInput").html().toLowerCase();
    //    var role = $("#roleInput").html();
    if ($("#marketerCheckbox").is(':checked') == true) {
        var role = "marketer";
    } else if ($("#influencerCheckbox").is(':checked') == true) {
        var role = "influencer";
    }

    if (true) {
        firebase.auth().createUserWithEmailAndPassword(email, password).then(function (user) {
            create(email);
        }).catch(function (error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            $("#error").html("*" + errorMessage);
        });


        function create(email) {
            var x = 0; //to protect against multiple triggers
            firebase.auth().onAuthStateChanged(function (user) {
                var user = firebase.auth().currentUser;
                if (user && x != 1) {
                    x = 1;
                    var dNow = new Date();
                    var dNow = dNow.getTime();
                    database.ref('users/' + user.uid).set({
                        "role": role,
                        "username": $('#usernameInput').val(),
                        "email": email,
                        "photo_url": 'https://runwae.com/img/newuser.png',
                        //getPhotoUrl(role),
                        "header_url": 'https://runwae.com/img/newheader.png',
                        //getBackgroundUrl(),
                        "name": $('#nameInput').val(),
                        "current_profile": user.uid,
                        "email_verified": false,
                        "verified": false,
                        "exploreTutorialCompleted": false,
                        "description": "",
                        "notifications": "",
                        "conversations": "",
                        "transactions": "",
                        "gigs": "",
                        "interests": "",
                        "posts": "",
                        "shares": "",
                        "followers": "",
                        "following": "",
                        "favortied": "",
                        "favorites": "",
                        "current_group": "",
                        "current_contact": "",
                        "current_conversation": "",
                        "current_item": "",
                        "current_gig": "",
                        "customer_id": "",
                        "unread_messages_count": 0,
                        "unread_notifications_count": 0,
                        "favorited_count": 0,
                        "favorites_count": 0,
                        "followers_count": 0,
                        "following_count": 0,
                        "gigs_count": 0,
                        "location": "",
                        "time": dNow,
                        "city": "",
                        "region": "",
                        "country": "",
                        "facebook": "",
                        "instagram": "",
                        "twitter": "",
                        "linkedin": "",
                        "website": "",
                        "badges": {
                            "foodie": 0,
                            "creator": 0,
                            "musician": 0,
                            "videographer": 0,
                            "writer": 0,
                            "photographer": 0
                        }
                    });
                    // obj = getCookieObj();
                    // obj.auth = true;
                    // document.cookie = JSON.stringify(obj);
                    analytics.logEvent('sign_up', {
                        category: 'authentication',
                        user_id: user.uid
                    });
                    database.ref().child('users/' + user.uid + '/followers').push().update({
                        "time": dNow,
                        "uid": "MYNCgPOZnHf8Vk4jEEtURPjgJLB2"
                    });
                    sendVerifyEmail(user);
                    window.location.href = "account";
                }
            });
        }
    }
}