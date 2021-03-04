function displayUsers(snapUser, limit) {
    useri = snapUser.key;
    $("#searchInput, #navSearchInput").on('input focus', function () {
        $(".selectize-dropdown-content").html("");
        var search = $(this).val();
        if (search != "" && search) {
            displayDropdown();
            var i = 0;
            var total = 0;
            var before = ["{{userOrGroup}}", "{{uid}}", "{{src}}", "{{name}}", "{{username}}", "{{role}}"];
            var dbRefUsers = firebase.database().ref().child('users/');
            limit = 6;
            dbRefUsers.once('value', function (snapUsers) {
                // var dbRefGroups = firebase.database().ref().child('groups/');
                // dbRefGroups.once('value', function (snapGroups) {
                //     var groupsObj = snapGroups.val();
                //     if (groupsObj) {
                //         groupKeys = sortProperties(groupsObj, "members_count");
                //         groupKeys = groupKeys.reverse();
                //         groups = Object.keys(groupsObj).length;
                //     } else {
                //         groups = 0;
                //     }

                    var usersObj = snapUsers.val();
                    if (usersObj) {
                        userKeys = sortProperties(usersObj, "follower_count");
                        userKeys = userKeys.reverse();
                        users = Object.keys(usersObj).length;
                        getUser(0, 0);
                    } else {
                        users = 0;
                    }

                    function getUser(n, length) {
                        $(".selectize-dropdown-content").children().slice(6, 20).remove();
                        if (length < limit && n < users) {
                            var userKey = userKeys[n];
                            var userObj = usersObj[userKey];
                            var go = false;
                            var propertiesArray = ["username", "name", "description"];
                            for (i = 0; i < propertiesArray.length; i++) {
                                var property = userObj[propertiesArray[i]];
                                if (property) {
                                    if (search.toLowerCase().includes(property.toLowerCase()) || property.toLowerCase().includes(search.toLowerCase())) {
                                        go = true;
                                    }
                                }
                            }
                            if ($('.inline-items.user#' + userKey).length > 0) {
                                go = false;
                            }
                            if (go == false) {
                                getUser(n + 1, length);
                            } else {
                                displayUser(userObj, n, length);
                            }

                        } else {
                            // getGroup(0, length);
                        }
                    }

                    // function getGroup(n, length) {
                    //     if (length < limit && n < groups) {
                    //         var groupKey = groupKeys[n];
                    //         var groupObj = groupsObj[groupKey];
                    //         var go = false;
                    //         var propertiesArray = ["username", "name", "description"];
                    //         for (i = 0; i <= propertiesArray.length; i++) {
                    //             var property = groupObj[propertiesArray[i]];
                    //             if (search.toLowerCase().includes(property.toLowerCase()) || property.toLowerCase().includes(search.toLowerCase())) {
                    //                 go = true;
                    //             }
                    //         }
                    //         if (go == false) {
                    //             getGroup(n + 1, length);
                    //         } else {
                    //             displayGroup(groupObj, n, length);
                    //         }
                    //     } else {}
                    // }

                    function displayUser(userObj, n, length) {
                        var after = ["user", userKeys[n], userObj["photo_url"], userObj["name"], userObj["username"], userObj["role"]];
                        displayHTML("#searchTemplate", "#searchDisplay", before, after);
                        displayHTML("#searchTemplate", "#navSearchDisplay", before, after);
                        $("div.inline-items.user").click(function (event) {
                            event.preventDefault();
                            event.stopPropagation();
                            event.stopImmediatePropagation();
                            var key = $(this).closest("div.inline-items").attr("id");
                            profileRelocate(snapUser, key);
                        });
                        getUser(n + 1, length + 1);
                    }

                    // function displayGroup(groupObj, n, length) {
                    //     var after = ["group", groupKeys[n], groupObj["photo_url"], groupObj["name"], groupObj["username"], "group"];
                    //     displayHTML("#searchTemplate", "#searchDisplay", before, after);
                    //     $("div.inline-items.group").find("*").click(function () {
                    //         var key = $(this).closest("div.inline-items").attr("id");;
                    //     });
                    //     groupRelocate(snapUser, key);
                    //     getGroup(n + 1, length + 1);
                    // }
                // });
            });
        } else {
            hideDropdown();

        }

    });

}

function displayDropdown() {
    $('.selectize-input').addClass('dropdown-active');
    $('.selectize-dropdown').show();
    //    $('#container').children().not('select');
    $('body').find('*').not('div.inline-items.user').click(function () {
        hideDropdown();
    });
    //    $("#searchInput").focusout(function () {
    //        hideDropdown();
    //    });

}

function hideDropdown() {
    $('.selectize-input').removeClass('dropdown-active');
    $('.selectize-dropdown').hide();
}
