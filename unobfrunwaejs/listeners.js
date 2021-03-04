function postListeners(snapVisitor, snapHost) {
    role = snapVisitor.val().role;
    $("article .post__author-name, article .post__author img").on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        var uid = $(this).closest("article").attr("id");
        profileRelocate(snapVisitor, uid);
    });
    $(".interestToggle").on('click', function (event) {
       event.preventDefault();
       event.stopPropagation();
       event.stopImmediatePropagation();
       if($(this).parent().parent().find('.post-control-button').css("display") == "none"){
           $(this).parent().parent().find('.post-control-button').show();
       }else{
           $(this).parent().parent().find('.post-control-button').hide();
       }
   });
    if (role == "influencer") {
        $(".post-control-button .btn-control.btnInterest").on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            handleInterest(snapVisitor, this);
        });
    }
    $(".share").on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        handleShare(snapVisitor, this);
    });
     $(".post-thumb").on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        displayPost(snapVisitor, snapHost, this);
    });
    $(".allComments").on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        displayPost(snapVisitor, snapHost, this);
    });
    $(".btnWriteComment").on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        writeComment(snapVisitor, this);
        $(this).closest('.ui-block').find("#postCommentTemplate").remove();
    });
    $(".comment-item .more").on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        removeComment(snapVisitor, snapHost, this);
    });
    ////////////username clicks
    $(".commentUsername").on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        var uid = $(this).closest(".comment-item").attr("id");
        profileRelocate(snapVisitor, uid);
    });
    $(".harmonic_friend_img").on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        var uid = $(this).closest("li").attr("id");
        profileRelocate(snapVisitor, uid);
    });
    $(".harmonic_friend_name").on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        var uid = $(this).attr("id");
        profileRelocate(snapVisitor, uid);
    });
    $(".allInterests").on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        displayInterests(snapVisitor, snapHost, this);
    });
    if (snapHost.key = snapVisitor.key) {
        $(".deactivatePost").on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            deactivatePost(snapVisitor, this);
        });
    }
}
function deactivatePost(snapUser, el) {
    var key = $(el).closest(".ui-block").attr("id");
    var uid = $(el).closest("article").attr("id");
    database.ref().child('items/' + key).update({
        status: "inactive"
    });
    window.location.reload();
}
