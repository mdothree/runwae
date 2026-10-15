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
                    carousel(role);
                    openModal('#open-' + role + 'Tutorial');
                }
                // closing the tips any way (X, Esc, backdrop) marks them seen; it used to be the X only
                $('#open-' + role + 'Tutorial').one('hidden.bs.modal', function () {
                    database.ref().child('users/' + useri).update({
                    "exploreTutorialCompleted" : true
                    });
                });
            }
        });
    }
});

// Tutorial slider. It used to be sized while its dialog was hidden (width and height 0, plus a selector typo),
// so the dialog showed only its title. Now it is sized from the dialog body once the dialog is shown, and again
// when a slide image loads; the slides sit in a flex row so the slider takes the height of its content.
function carousel(role) {
    var slider = role == "marketer" ? "#marketerSlider" : "#influencerSlider";
    var $s = $(slider);
    var $m = $s.closest('.modal');
    function width() {
        return $s.data('rwW') || 0;
    }
    function size() {
        var w = $s.parent().width();
        if (!w) {
            return;
        }
        $s.data('rwW', w);
        $s.css({ width: w, height: 'auto' });
        $s.find('ul').css({ display: 'flex', width: $s.find('ul li').length * w, marginLeft: -w, height: 'auto' });
        $s.find('ul li').css({ float: 'none', flex: 'none', width: w, lineHeight: 'normal' });
    }
    function moveLeft() {
        $s.find('ul').animate({ left: +width() }, 200, function () {
            $s.find('ul li:last-child').prependTo($s.find('ul'));
            $s.find('ul').css('left', '');
        });
    }
    function moveRight() {
        $s.find('ul').animate({ left: -width() }, 200, function () {
            $s.find('ul li:first-child').appendTo($s.find('ul'));
            $s.find('ul').css('left', '');
        });
    }
    $m.off('shown.bs.modal.rwTut').on('shown.bs.modal.rwTut', size);
    $s.find('img').off('load.rwTut').on('load.rwTut', size);
    $s.find('a.control_prev').off('click.rwTut').on('click.rwTut', function (event) {
        event.preventDefault();
        moveLeft();
    });
    $s.find('a.control_next').off('click.rwTut').on('click.rwTut', function (event) {
        event.preventDefault();
        moveRight();
    });
    if ($m.is(':visible')) {
        size();
    }
}
