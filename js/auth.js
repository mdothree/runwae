function auth() {
    signUp();
    login();
}
function login(info) {
    $("#btnLogin").click(function () {
        var email = $("#txtEmailLogin").val();
        var pass = $("#txtPasswordLogin").val();
        if (email && pass) {
            signIn(email, pass);
        } else {
            $("#error").html("*Invalid email or password");
        }
    });
}
function signUp(info) {
    $("#btnSignUp").click(function () {
        if ($("#termsCheckbox").is(':checked') == true) {
            var email = $("#txtEmailSignUp").val();
            var pass = $("#txtPasswordSignUp").val();
            var passStrength = passwordStrength(pass);
            if (passStrength) {
                if (email && pass) {
                    if ($('#usernameInput').val() && $('#nameInput').val()) {
                        console.log("createUser")
                        createUser(email, pass);
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
                window.location.href = 'explore.html';
            } else {
                var myVar = setTimeout(myTimer, 2000);
                function myTimer() {
                    $("#error").html("*Failed login attmept");
                }
            }
        });
    }).catch(function (error) {
        $("#error").html("*Failed login attmept");
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorMessage);
        if (errorCode == "auth/invalid-email" || "auth/user-disabled" || "auth/user-not-found" || "auth/wrong-password") {
        }
    });
}
function createUser(email, password) {
    var role = $("#roleInput").html().toLowerCase();
    //    var role = $("#roleInput").html();
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
                        "photo_url": getPhotoUrl(role),
                        "header_url": getBackgroundUrl(),
                        "name": $('#nameInput').val(),
                        "current_profile": user.uid,
                        "email_verified": false,
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
                    sendVerifyEmail(user);
                    window.location.href = "profile.html";
                }
            });
        }
    }
}
function sendResetPassword(email) {
    firebase.auth().sendPasswordResetEmail(
            email).then(function () {
            // Password reset email sent
            //$(".products-area").hide();
        })
        .catch(function (error) {
            // Error occurred. Inspect error.code.
            $("#forgotPasswordError").show();
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log(errorMessage);
            if (errorCode = "auth/invalid-email" || "auth/missing-continue-uri" || "auth/invalid-continue-uri" || "auth/unauthorized-continue-uri") {
                //NOTIFY USERS WITH THE ERROR
            }
        });
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
    window.location.href = 'explore.html';
}
