firebase.auth().onAuthStateChanged(function (user) {
    var user = firebase.auth().currentUser;
    if (user) {
        useri = user.uid;
        email = user.email;
        database.ref().child('users/' + useri).once('value', function (snap) {
            var role = snap.val().role;
            var completed = snap.val().exploreTutorialCompleted;
            if (!completed && user.emailVerified){
                if (window.location.href.includes("explore")) {
                    openModal('#open-' + role + 'Tutorial');
                    carousel(role);
                }
                $('.close').click(function () {
                    database.ref().child('users/' + useri).update({
                    "exploreTutorialCompleted" : true
                    });
                });
            }
        });
    }
});

jQuery(document).ready(function ($) {
sliders = ["#influencerSlider", "#marketerSlider"]
for (s in sliders){
    slider = sliders[s];
    var slideCount = $(slider+' ul li').length;
    var slideWidth = $(slider+'ul li').width();
    var slideHeight = $(slider+' ul li').height();

    var sliderUlWidth = slideCount * slideWidth;
    
    $(slider).css({ width: slideWidth, height: slideHeight });
    
    $(slider+' ul').css({ width: sliderUlWidth, marginLeft: - slideWidth });
    
    $(slider+' ul li:last-child').prependTo(slider+' ul');
}
});


function carousel(role){
    if (role == "influencer"){
        slider = "#influencerSlider";
    } 
    else if (role == "marketer"){
        slider = "#marketerSlider";
    } 
      var slideCount = $(slider+' ul li').length;
      var slideWidth = $(slider+'ul li').width();
      var slideHeight = $(slider+' ul li').height();
      var sliderUlWidth = slideCount * slideWidth;
      
      $(slider).css({ width: slideWidth, height: slideHeight });
      
      $(slider+' ul').css({ width: sliderUlWidth, marginLeft: - slideWidth });
      
      $(slider+' ul li:last-child').prependTo(slider+' ul');
  
      function moveLeft() {
          $(slider+' ul').animate({
              left: + slideWidth
          }, 200, function () {
              $(slider+' ul li:last-child').prependTo(slider+' ul');
              $(slider+' ul').css('left', '');
          });
      };
  
      function moveRight() {
          $(slider+' ul').animate({
              left: - slideWidth
          }, 200, function () {
              $(slider+' ul li:first-child').appendTo(slider+' ul');
              $(slider+' ul').css('left', '');
          });
      };
  
      $('a.control_prev').click(function () {
          moveLeft();
      });
  
      $('a.control_next').click(function () {
          moveRight();
      });
  
  }   
  
