function paramFunction(){
    const params = {
    //////////////////////////////////////Vars and Filters and Filter Inputs
    ///possible variables to display on the main table
    "mainDisplayType": ['Users', 'Posts', 'Subscribers', 'Transactions', 'Disputes'],
    //ids for filterinputs
    // "mainFilterInputs": ['#usersFilterInput', '#itemsFilterInput', '#subscribersFilterInput', '#transactionsFilterInput', '#conversationsFilterInput', '#activityFilterInput', '#disputesFilterInput'],
    //database listeners
    "liveModeKeys": ['users', 'items', 'subscribers', 'transactions', 'conversations', 'activity', 'disputes'],
    //available filters for diff variables displayed on main display
    //available numerators, denominators for averaged data displays
    "numerators": [['influencers'], ['marketers'], ['subscribers'], ['posts'], ['interests'], ['gigs'], ['transactions']],
    "denominators": [['day'], ['day'], ['day'], ['day'], ['user', 'day'], ['post', 'user', 'day'], ['post', 'user', 'day'], ['post', 'user', 'day']],
    //////////////////////////////////////DISPLAYS 
    "filterOption": {
        "scriptDiv": "#filterTemplate",
        "before": ["{{filteroption}}"]
    },
    "headerOption": {
        "scriptDiv": "#headerOptionTemplate",
        "before": ["{{option}}"]
    },
    "countDisplay": {
        "users": "#usersCount",
        "marketers": "#marketersCount",
        "influencers": "#influencersCount",
        "posts": "#postsCount",
        "subscribers": "#subscribersCount",
        "disputes": "#disputesCount",
        "days": "#daysCount",
        "gigs": "#gigsCount",
        "interests": "#interestsCount",
        "shares": "#sharesCount",
        "comments": "#commentsCount",
        "messages": "#messagesCount",
        "follows": "#followsCount",
        "followers": "#followersCount",
        "favorites": "#favoritesCount",
        "favorited": "#favoritedCount"
    },
    "averagedDisplay": {
        "headers": ["DATA", "VALUE"],
        "headerDisplay": "#averagedHeaderDisplay",
        "scriptDiv": "#averagedTemplate",
        "displayDiv": "#averagedDisplayDiv",
        "before": ["{{var1}}", "{{var2}}", "{{value}}"]
    },
    "mainDisplay": {
        "mainDiv": "#mainDisplay",
        "filterUserInput": "#mainFilterUserInput",
        "filterInput": "#mainFilterInput",
        "sortInput": "#mainSortInput",
        "typeInput": "#mainTypeInput",
        "displayDiv": "#mainDisplayDiv",
        "filterDisplay": "#mainFilterDisplay",
        "sortDisplay": "#mainSortDisplay",
        "typeDisplay": "#mainTypeDisplay",
        "headerDisplay": "#mainHeaderDisplay",
        "typeDropdownDiv" : "#mainTypeDropdownDiv",
        "filterDropdownDiv" : "#mainFilterDropdownDiv",
        "sortDropdownDiv" : "#mainSortDropdownDiv",
        "types": ['Users', 'Posts', 'Subscribers', 'Transactions', 'Disputes'],
        "Users": {
            "scriptDiv": "#usersTemplate",
            'headers': ["NAME", "EMAIL", "ROLE","TIME"], //["KEY", "NAME", "USERNAME", "EMAIL", "ROLE", "EMAIL_VERIFIED", "LOCATION", "TIME"],
            "before": ["{{name}}","{{email}}", "{{role}}", "{{time}}"], //["{{key}}", "{{name}}", "{{username}}", "{{email}}", "{{role}}", "{{email_verified}}",  "{{location}}", "{{time}}"],
            "vals": ["name", "email", "role", "time"], //["key", "name", "username", "email", "role", "email_verified", "location", "time"],
            "filters": ["key", "name", "email", "role", "username", "location"],
            "sort": ["time", "followers_count", "favorites_count"]
        },
        "Posts": {
            "scriptDiv": "#postsTemplate",
            'headers': ["KEY", "COMPENSATION", "PRICE", "STATUS", "TIME"],
            "before": ["{{key}}", "{{compensation}}", "{{price}}", "{{status}}", "{{time}}"],
            "vals": ["key", "compensation", "price", "status", "time"],
            "filters": ["uid", "compensation", "price", "instagram", "twitter", "facebook", "linkedin", "status", "media_type"],
            "sort": ["time", "price", "interests_count", "shares_count"]
        },
        "Subscribers": {
            "scriptDiv": "#subscribersTemplate",
            'headers': ["KEY", "EMAIL", "TIME"],
            "before": ["{{key}}", "{{email}}", "{{time}}"],
            "vals": ["key", "email", "time"],
            "filters": ["email"],
            "sort": []
        },
        "Transactions": {
            "scriptDiv": "#transactionsTemplate",
            'headers': ["KEY", "COMPENSATION", "PLATFORM", "PRICE", "TIME"],
            "before": ["{{key}}", "{{compensation}}", "{{platform}}", "{{price}}", "{{time}}"],
            "vals": ["key", "compensation", "platform", "price", "time"],
            "filters": ["key", "compensation", "platform", "status", "price", "marketerID", "influencerID", "trackingNumber"],
            "sort": ["time", "price"]
        },
        "Disputes": {
            "scriptDiv": "#disputesTemplate",
            'headers': ["KEY", "DESCRIPTION", "STATUS", "TIME"],
            "before": ["{{key}}", "{{description}}", "{{status}}", "{{time}}"],
            "vals": ["key", "description", "status", "time"],
            "filters": ["key", "status"],
            "sort": ["time"]
        }
    },
    "pastMonthDisplay": {
        "pastMonth": {
            "users": "#usersPastMonthCount",
            "posts": "#postsPastMonthCount",
            "subscribers": "#subscribersPastMonthCount",
            "disputes": "#disputesPastMonthCount",
        },
        "percentChange": {
            "users": "#usersPercentChange",
            "posts": "#postsPercentChange",
            "subscribers": "#subscribersPercentChange",
            "disputes": "#disputesPercentChange",
        }
    },
    "visitingPagesDisplay": {
        "headers": ["HOST", "VISITS"],
        "headerDisplay": "#visitingPagesHeaderDisplay",
        "scriptDiv": "#visitingPagesTemplate",
        "displayDiv": "#visitingPagesDisplayDiv",
        "before": ["{{host}}", "{{visits}}"],
        "vals": ["host", "visits"]
    },
    "timeVsPagePlot": "#timeVsPagePlot",
    "vsTODPlot": {
        "title": "#vsTODTitle",
        "timeLabels" : ["2AM", "4AM", "6AM", "8AM", "10AM", "12PM", "2PM", "4PM", "6PM", "8PM", "10PM", "12PM"],
        "filterScript": "#filterTemplate",
        "displayDiv": "#displayDiv",
        "plotDiv": "#vsTODPlotDiv",
        "filterDisplay": "#vsTODFilterDisplay",
        "selectedFilter": "#vsTODSelectedFilter",
        "filters": ["users", "posts", "subscribers", "disputes"]
    },
    "vsTimePlot": {
        "title": "#vsTimeTitle",
        "filterDisplay": "#vsTimeFilterDisplay",
        "filterScript": "#filterTemplate",
        "plotDiv": "#vsTimePlotDiv",
        "selectedFilter": "#vsTimeSelectedFilter",
        "filters": ["users", "posts", "subscribers", "disputes"]
    },
    "pageActivityPlot": {
        "displayDivs": ["#explorePageActivity","#profilePageActivity","#gigPageActivity","#accountPageActivity","#messagesPageActivity","#notificationsPageActivity"],
    },
    "duration": {
        "displayDiv": "#durationDisplayDiv",
        "scriptDiv": "#durationTemplate",
        "post": {
            "before": ["{{timestring}}", "{{title1}}", "{{title2}}", "{{description}}"]
        }
    },
    "gigStatus":{
        "total": "#gigStatusTotalGigsDisplay",
        "labels":["one", "two", "three", "four", "five", "six", "seven"],
        "displayDivs":["#gigStatus1Count", "#gigStatus2Count", "#gigStatus3Count", "#gigStatus4Count", "#gigStatus5Count", "#gigStatus6Count", "#gigStatus7Count"]
    },
    "totalSpent": "#totalSpent",
    //time conversions
    "milliInDay": 86400000,
    "milliInMonth": 2.628 * Math.pow(10, 9),
    "milliInYear": 3.154 * Math.pow(10, 10),
    "buttons": {
        "refresh": "#btnRefresh"
    }
}

return params
}