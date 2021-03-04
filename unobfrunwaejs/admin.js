var dNow = new Date();
var dNow = dNow.getTime();

params = paramFunction();

function main(snapdb) {
    const obj = {};
    obj.snapdb = snapdb;
    obj.get = getFunction(snapdb);
    obj.utilities = utilFunction(snapdb);
    obj.dataOps = dataOpsFunction(snapdb, obj.utilities);
    obj.data = dataFunction(snapdb, obj.utilities);
    obj.plot = plotFunction(snapdb);
    obj.io = ioFunction(snapdb, obj.get, obj.utilities, obj.dataOps, obj.plot);
    obj.listeners = listenersFunction(obj, snapdb);

    obj.refresh = function () {
        dbRef.once('value', function (snapdb) {
            obj.snapdb = snapdb;
            obj.data.snapdb = snapdb;
            obj.utilities.snapdb = snapdb;
            obj.io.snapdb = snapdb;
            obj.plot.snapdb = snapdb;
            obj.data.updatea();
            obj.data.updateb();
            obj.data.updateAveraged();
            dbRef.once('value', function (snapdb) {
                obj.snapdb = snapdb;
                obj.data.snapdb = snapdb;
                obj.utilities.snapdb = snapdb;
                obj.io.snapdb = snapdb;
                obj.plot.snapdb = snapdb;
                obj.listeners.snapdb = snapdb;
                obj.dataOps.snapdb = snapdb;
                obj.get.snapdb = snapdb;
                obj.run();
            });
        });
    }
    obj.run = function () {
        analytics = this.snapdb.val()['analytics'];
        this.io.displaya(analytics);
        this.io.displayb(analytics);
        this.io.displayAveraged(analytics); //averagedDisplay
        this.io.displayd(); //past Month
        this.io.vsTOD(); //users, page requests, followers frequency percentage per time of day
        this.io.vsTime(); //this.users, page requests, followers vs time
        this.io.pageActivity(); //avg page time per page
        this.io.gigStatus(); //gigs status frequency 
        this.io.postDuration(); // average post duration 
        this.io.displayMain();
        this.io.visitingPages();
        this.io.displayTotalSpending();
        this.listeners.basic();
        // getElementById("btnRefresh").onclick = this.refresh();
        // $(params.buttons.refresh).on('click',function(){this.refresh()});
    }
    return obj;
}

function listenersFunction(main, snapdb) {
    const obj = {};
    obj.snapdb = snapdb;
    obj.main = main
    obj.basic = function () {
        $(params.buttons.refresh).on('click', this.main.refresh);

        ////Wrap in dropdown divs for equerry selector
        displayDiv = params.mainDisplay.typeDropdownDiv
        $(displayDiv + ' ul li').on('click', function () {
            title = $(this).find(".text").html()
            $(params.mainDisplay.typeDisplay).attr("title", title)
            obj.main.io.displayMain()
        });

        displayDiv = params.mainDisplay.filterDropdownDiv
        $(displayDiv + ' ul li').on('click', function () {
            title = $(this).find(".text").html()
            $(params.mainDisplay.filterDisplay).attr("title", title)
            obj.main.io.displayMain()
        });

        displayDiv = params.mainDisplay.sortDropdownDiv
        $(displayDiv + ' ul li').on('click', function () {
            title = $(this).find(".text").html()
            $(params.mainDisplay.sortDisplay).attr("title", title)
            obj.main.io.displayMain()
        });


        displayDiv = params.mainDisplay.filterInput
        $(displayDiv).on('change', function () {
            obj.main.io.displayMain()
        });

        displayDiv = params.vsTODPlot.plotDiv
        $(displayDiv + ' ul li').on('click', function () {
            title = $(this).find(".text").html()
            $(params.vsTODPlot.filterDisplay).attr("title", title)
            obj.main.io.vsTOD()
        });

        displayDiv = params.vsTimePlot.plotDiv
        $(displayDiv + ' ul li').on('click', function () {
            title = $(this).find(".text").html()
            $(params.vsTimePlot.filterDisplay).attr("title", title)
            obj.main.io.vsTime()
        });

        //not filtering any plots
    }
    return obj;
}

function getFunction(snapdb) {
    const obj = {};
    obj.users = {};
    obj.mainDisplayFilter = function () {
        title = $(params.mainDisplay.filterDisplay).attr("title")
        if (!title) {
            a = params.mainDisplay.filterDisplay.split('#')[1];
            target = "button[data-id='" + a + "']";
            title = $(target).attr("title");
        }
        return title
    }
    obj.mainDisplayFilterInput = function () {
        return $(params.mainDisplay.filterInput).val();
    }
    obj.mainDisplayType = function () {
        title = $(params.mainDisplay.typeDisplay).attr("title")
        if (!title) {
            a = params.mainDisplay.typeDisplay.split('#')[1];
            target = "button[data-id='" + a + "']";
            title = $(target).attr("title");
        }
        return title
    }
    obj.mainDisplaySort = function () {
        title = $(params.mainDisplay.sortDisplay).attr("title")
        if (!title) {
            a = params.mainDisplay.sortDisplay.split('#')[1];
            target = "button[data-id='" + a + "']";
            title = $(target).attr("title");
        }
        return title
    }
    obj.vsTODType = function () {
        title = $(params.vsTODPlot.filterDisplay).attr("title")
        if (!title) {
            a = params.vsTODPlot.filterDisplay.split('#')[1];
            target = "button[data-id='" + a + "']";
            title = $(target).attr("title");
        }
        return title
    }
    obj.vsTimeType = function () {
        title = $(params.vsTimePlot.filterDisplay).attr("title")
        if (!title) {
            a = params.vsTimePlot.filterDisplay.split('#')[1];
            target = "button[data-id='" + a + "']";
            title = $(target).attr("title");
        }
        return title

    }
    return obj;
}

function utilFunction(snapdb) {
    const obj = {};
    obj.snapdb = snapdb

    obj.getlength = function (dbpath) {
        var ob = this.snapdb.val()[dbpath];
        var length = Object.keys(ob).length;
        return length
    }
    obj.filterobj = function (ob, filters, vals) {
        newobj = {};
        if (ob) {
            for (p of Object.keys(ob)) {
                proc = true;
                for (var j = 0; j < filters.length; j++) {
                    if (filters[j] == "key") {
                        if (p != vals[j]) {
                            proc = false;
                        }
                    } else {
                        if (ob[p][filters[j]] != vals[j]) {
                            proc = false;
                        }
                    }
                }
                if (proc) {
                    newobj[p] = ob[p];
                }
            }
            return newobj;
        } else {
            return ob;
        }
    }

    obj.filteredCount = function (ob, filters, keys) {
        ob = this.filterobj(ob, filters, keys)
        if (ob) {
            return Object.keys(ob).length
        } else {
            return 0
        }
    }
    obj.duration = function (t1) {
        t2 = this.getTime()
        return dt = t2 - t1;
    }
    obj.getTime = function () {
        t2 = new Date();
        return t2.getTime();
    }
    obj.arrayToLi = function (array, ul) {
        for (i in array) {
            displayHTML(params.liDropdown.scriptDiv, ul, params.liDropdown.before, [i, array[i]])
        }
    }

    obj.millisToPlotString = function (times) {
        strs = []
        times.forEach(function (t, i) {
            d = new Date(t);
            var day = d.getDay();
            var mo = d.getMonth();
            var yea = d.getFullYear();
            yea = yea.toString();
            yea = yea.slice(2);
            str = (mo + 1) + "/" + (day + 1) + "/" + yea
            strs.push(str)
        });
        return strs;
    }
    return obj
}

function dataOpsFunction(snapdb, utilities) {
    const obj = {};
    obj.snapdb = snapdb
    obj.utilities = utilities;


    obj.getHourOfDay = function (obj) {}
    obj.sortTOD = function (obj) {}
    obj.getTimeArray = function (obj) {
        times = [];
        for (u of Object.keys(obj)) {
            if (obj[u]["time"]) {
                times.push(obj[u]["time"])
            }
        }
        return times;
    }
    obj.getHourFreq = function (times) {
        freq = new Array(12).fill(0);
        for (t in times) {
            d = new Date(times[t]);
            hour = d.getHours();
            freq[Math.floor(hour / 2)] += 1;;
        }
        return freq;
    }
    obj.getArrayOfIndeces = function (x) {
        y = [];
        for (var i = 0; i < x.length; i++) {
            y.push(i);
        }
        return y;
    }
    obj.occurrences = function (array) {
        "use strict";
        var result = {};
        if (array instanceof Array) { // Check if input is array.
            array.forEach(function (v, i) {
                if (!result[v]) { // Initial object property creation.
                    result[v] = [0]; // Create an array for that property.
                } else { // Same occurrences found.
                    result[v] = [result[0][0] + 1];
                }
            });
        }
        return result;
    }

    obj.greaterThan = function (array, n) {
        function predicate(x) {
            return x > n
        }
        return array.filter(predicate);
        // input = input.filter(function(x) { return !predicate(x) })
    }

    obj.betweenCount = function (array, n, m) {
        s1 = obj.greaterThan(array, n).length
        s2 = obj.greaterThan(array, m).length
        return s2 - s1
    }

    obj.categorize = function (times, counts, divs) {
        i = 0;
        newCounts = [];
        newTimes = [];

        n = counts.length / divs; //how many spaces before we separate
        n = Math.floor(n); //do lower amount of bin count
        for (count in counts) {
            if (n == 0) {
                newTimes.push(times[i]);
                newCounts.push(counts[i])
            } else if (i % n == 0) {
                newTimes.push(times[i]);
                newCounts.push(counts[i]);
            } else if (i == counts.length - 1) {
                newTimes.push(times[i]);
                newCounts.push(counts[i]);
            }
            i++;
        }
        return [newTimes, newCounts]
    }

    obj.keyArrayToPropArray = function (keys, ob, prop) {
        proparray = [];
        for (i in keys) {
            proparray.push(ob[keys[i]][prop]);
        }
        return proparray;
    }
    return obj;
}

function dataFunction(snapdb, utilities) {
    const obj = {};
    obj.snapdb = snapdb;
    obj.utilities = utilities
    //LETTER U RESERVED GLOBALLY. USE W LOCALLY
    obj.itemCounts = function () {
        ob = this.snapdb.val()['items'];
        ob = this.utilities.filterobj(ob, [], []);
        gigs = shares = interests = comments = 0;
        for (w of Object.keys(ob)) {
            gigs += this.utilities.filteredCount(ob[w]['influencers'], [], []);
            shares += this.utilities.filteredCount(ob[w]['shares'], [], []);
            interests += this.utilities.filteredCount(ob[w]['interests'], [], []);
            comments += this.utilities.filteredCount(ob[w]['comments'], [], []);
        }
        days = this.snapdb.val()["analytics"]["days"];
        return [gigs, shares, interests, comments, days]
    }

    obj.userCounts = function () {
        ob = this.snapdb.val()['users'];
        ob = this.utilities.filterobj(ob, [], []);
        favorites = favorited = followers = following = 0;
        for (w of Object.keys(ob)) {
            favorites += this.utilities.filteredCount(ob[w]['favorites'], [], []);
            favorited += this.utilities.filteredCount(ob[w]['favorited'], [], []);
            followers += this.utilities.filteredCount(ob[w]['followers'], [], []);
            following += this.utilities.filteredCount(ob[w]['following'], [], []);
        }
        return [favorites, favorited, followers, following]
    }

    obj.roleCounts = function () {
        ob = this.snapdb.val()['users'];
        m = this.utilities.filteredCount(ob, ["role"], ["marketer"]);
        i = this.utilities.filteredCount(ob, ["role"], ["influencer"]);
        return [m, i]
    }

    obj.messagesCount = function () {
        ob = this.snapdb.val()['conversations'];
        count = 0
        for (w of Object.keys(ob)) {
            count += Object.keys(ob[w]).length;
        }
        return count
    }

    obj.updatea = function () {
        mi = this.roleCounts()
        ob = {
            "users": this.utilities.getlength('users'),
            "marketers": mi[0],
            "influencers": mi[1],
            "subscribers": this.utilities.getlength('subscriptions'),
            "posts": this.utilities.getlength('items'),
            "transactions": this.utilities.getlength('transactions'),
            "disputes": this.utilities.getlength('disputes'),
            "days": Math.floor(this.utilities.duration(Number(this.snapdb.val()['analytics']['launch_date'])) / params.milliInDay)
        }
        database.ref().child('analytics').update(ob);
    }

    obj.updateb = function () {
        itemcounts = this.itemCounts();
        usercounts = this.userCounts();
        messages = this.messagesCount();
        ob = {
            "messages": messages,
            "gigs": itemcounts[0],
            "interests": itemcounts[1],
            "shares": itemcounts[2],
            "comments": itemcounts[3],
            "favorites": usercounts[0],
            "favorited": usercounts[1],
            "followers": usercounts[2],
            "following": usercounts[3],
        }
        database.ref().child('analytics').update(ob);
    }

    obj.updateAveraged = function () {
        numerators = params.numerators
        denominators = params.denominators
        for (i in numerators) {
            for (j in denominators[i]) {
                database.ref().child('analytics/averaged/' + numerators[i]).update({
                    [denominators[i][j]]: this.snapdb.val()["analytics"][numerators[i]] / this.snapdb.val()["analytics"][(denominators[i, j] + "s")]
                });
            }
        }
    }
    return obj;
}

function ioFunction(snapdb, get, utilities, dataOps, plot) {
    const obj = {};
    obj.snapdb = snapdb;
    obj.get = get
    obj.utilities = utilities
    obj.dataOps = dataOps
    obj.plot = plot

    obj.vsTOD = function () {
        a = this.get.vsTODType();
        $(params.vsTODPlot.title).html(capitalizeFLetter(a) + ' vs Time Of Day');
        switch (a) {
            case "posts":
                ob = snapdb.val()["items"]
                break;
            case "subscribers":
                ob = snapdb.val()["subscriptions"];
                break;
            default:
                ob = snapdb.val()[a]
        }
        ob = this.utilities.filterobj(ob, [], []);
        times = this.dataOps.getTimeArray(ob);
        freq = this.dataOps.getHourFreq(times);
        //change quantity array to percentage array
        sum = freq.reduce((a, b) => a + b, 0);
        for (f in freq) {
            freq[f] /= sum
        }
        this.plot.vsTOD(params.vsTODPlot.timeLabels, freq);
    }

    obj.vsTime = function () {
        a = this.get.vsTimeType();
        $(params.vsTimePlot.title).html(capitalizeFLetter(a) + ' vs Time');
        switch (a) {
            case "posts":
                ob = snapdb.val()["items"];
                break;
            case "subscribers":
                ob = snapdb.val()["subscriptions"];
                break;
            default:
                ob = snapdb.val()[a];
        }


        // times = this.dataOps.keyArrayToPropArray(obKeys, ob, "time");
        // totals = this.dataOps.getArrayOfIndeces(times); //get the totals
        // //create object for total and time. Sort by time. 
        // obKeys = sortProperties(ob,"time");


        ob = this.utilities.filterobj(ob, [], []);
        //undefined times and counts
        obKeys = sortPropertiesTwo(ob, "time");
        times = this.dataOps.keyArrayToPropArray(obKeys, ob, "time");
        totals = this.dataOps.getArrayOfIndeces(times);
        newtimes = [];
        newtotals = [];
        for (i in times) {
            if (times[i]) {
                newtimes.push(times[i]);
                newtotals.push(totals[i]);
            }
        }
        times = newtimes
        totals = newtotals
        categorized = this.dataOps.categorize(times, totals, 15);
        times = categorized[0]
        totals = categorized[1]
        dates = this.utilities.millisToPlotString(times);

        newdates = []
        newtotals = []
        for (d in dates) {
            if (newdates.indexOf(dates[d]) == -1) {
                newdates.push(dates[d]);
                newtotals.push(totals[d]);
            } else {
                newtotals[newdates.indexOf(dates[d])] = totals[d]; //+= totals[d];
            }
        }
        this.plot.vsTime(newdates, newtotals);
        marketers = this.snapdb.val()["analytics"]["marketers"]
        influencers = this.snapdb.val()["analytics"]["influencers"]
        this.plot.marketersVsInfluencers(["marketers", "influencers"], [marketers, influencers]);
    }


    obj.displayTotalSpending = function () {
        ob = snapdb.val()["transactions"];
        totals = []
        dates = []
        sum = 0;
        obKeys = sortProperties(ob, ["influencer_time"])
        for (i in obKeys) {
            u = obKeys[i]
            if (ob[u]["compensation"] == "money" && ob[u]["status"] == "complete") {
                sum += Number(ob[u]["price"])
                totals.push(sum)
                dates.push(Number(ob[u]["influencer_time"]))
            }
        }
        categorized = this.dataOps.categorize(dates, totals, 12);
        dates = categorized[0]
        totals = categorized[1]
        dates = this.utilities.millisToPlotString(dates);
        this.plot.totalSpending(dates, totals);
    }

    obj.pageActivity = function () {
        ob = this.snapdb.val()["analytics"]["pages"];
        pageTotals = new Array((Object.keys(ob).length)).fill(0);
        pageNames = new Array((Object.keys(ob).length)).fill(0);
        i = 0;
        for (u of Object.keys(ob)) {
            pageNames[i] = u
            pageTotals[i] = ob[u]["duration"];
            i++;
            // pageTotals[i] = ob[u]["duration"] / params.milliInDay;
        }
        plot.pageActivity(pageNames, pageTotals);
    }

    obj.visitingPages = function () {
        ob = this.snapdb.val()["analytics"]["visitingPages"];
        this.renderObj(ob, params.visitingPagesDisplay.scriptDiv, params.visitingPagesDisplay.displayDiv, params.visitingPagesDisplay.before, params.visitingPagesDisplay.vals);
    }

    obj.gigStatus = function () {
        ob = this.snapdb.val()["items"];
        status = ["one", "two", "three", "four", "five", "six", "seven"];
        frequency = new Array(7).fill(0);
        for (u of Object.keys(ob)) {
            for (v of Object.keys(ob[u]["influencers"])) {
                cs = ob[u]["influencers"][v]["status"];
                if (0 < Number(cs)) {
                    frequency[cs - 1] += 1; // Create an array for that property.
                }
            }
        }

        total = frequency.reduce(function (a, b) {
            return a + b;
        }, 0);
        for (f in frequency) {
            $(params.gigStatus.displayDivs[f]).html(frequency[f])
        }

        $(params.gigStatus.total).html(total)
        this.plot.gigStatus(status, frequency);
    };

    obj.postDuration = function () {
        ob = this.snapdb.val()["items"];
        i = 0;
        duration = 0;
        for (u of Object.keys(ob)) {
            if (ob[u]["duration"]) {
                duration += ob[u]["duration"];
            }
            i = i + 1;
        }
        avg = duration / i; //ms
        after = [avg, "Post", "Duration", "How long it takes a marketer to make a post"];
        displayHTML(params.duration.scriptDiv, params.duration.displayDiv, params.duration.post.before, after);
    }

    obj.displayHeaders = function (array, ul) {
        $(ul).html("")
        for (i in array) {
            displayHTML(params.headerOption.scriptDiv, ul, params.headerOption.before, [array[i]])
        }
    }

    obj.displayMain = function () {
        type = (this.get.mainDisplayType()).toLowerCase();
        filter = (this.get.mainDisplayFilter()).toLowerCase();
        sort = (this.get.mainDisplaySort()).toLowerCase();
        filterInput = this.get.mainDisplayFilterInput();
        if (type == "posts") {
            type = "items"
        } else if (type == "subscribers") {
            type = "subscriptions"
        }
        ob = this.snapdb.val()[type];
        if (filterInput != "") {
            ob = this.utilities.filterobj(ob, [filter], [filterInput]);
        }
        keyArray = sortProperties(ob, sort)
        newObj = {}
        for (i in keyArray) {
            newObj[keyArray[i]] = ob[keyArray[i]]

        }
        ob = newObj
        if (type == "items") {
            type = "posts"
        } else if (type == "subscriptions") {
            type = "subscribers"
        }
        key = capitalizeFLetter(type);
        this.displayHeaders(params.mainDisplay[key].headers, params.mainDisplay.headerDisplay);
        this.renderObj(ob, params.mainDisplay[key].scriptDiv, params.mainDisplay.displayDiv, params.mainDisplay[key].before, params.mainDisplay[key].vals);
    }

    // obj.renderObj1 = function (obj, els, vals) {
    //     i = 0
    //     for (u of Object.keys(obj)) {
    //         for (var j = 0; j < els.length; j++) {
    //             $(els[j]).append(obj[u][vals[j]])
    //         }
    //         i++;
    //     }
    // }

    obj.renderObj = function (obj, scriptDiv, displayDiv, before, vals) {
        $(displayDiv).html("");
        i = 0
        for (u of Object.keys(obj)) {
            after = [];
            for (var j = 0; j < vals.length; j++) {
                if (vals[j] == "time") {
                    after.push(timeDisplay(obj[u][vals[j]]))
                } else if (vals[j] == "key") {
                    after.push(u)
                } else {
                    after.push(obj[u][vals[j]])
                }
            }
            displayHTML(scriptDiv, displayDiv, before, after);
            i++;
        }
    }

    obj.displaya = function (anayltics) { //display data from data object
        $(params.countDisplay.users).html(analytics.users)
        $(params.countDisplay.marketers).html(analytics.marketers)
        $(params.countDisplay.influencers).html(analytics.influencers)
        $(params.countDisplay.subscribers).html(analytics.subscribers)
        $(params.countDisplay.posts).html(analytics.posts)
        $(params.countDisplay.transactions).html(analytics.transactions)
        $(params.countDisplay.disputes).html(analytics.disputes)
        $(params.countDisplay.days).html(analytics.days)
    }

    obj.displayb = function () { //display data from data object

        $(params.countDisplay.gigs).html(analytics.gigs)
        $(params.countDisplay.interests).html(analytics.interests)
        $(params.countDisplay.shares).html(analytics.shares)
        $(params.countDisplay.comments).html(analytics.comments)
        $(params.countDisplay.messages).html(analytics.messages)
        $(params.countDisplay.follows).html(analytics.following)
        $(params.countDisplay.followers).html(analytics.followers)
        $(params.countDisplay.favorites).html(analytics.favorites)
        $(params.countDisplay.favorited).html(analytics.favorited)
    }

    obj.displayAveraged = function (numerator, denominator) { //averaged display
        ob = this.snapdb.val()["analytics"]["averaged"]
        for (u of Object.keys(ob)) {
            for (v of Object.keys(ob[u])) {
                after = [u, v, ob[u][v]]
                displayHTML(params.averagedDisplay.scriptDiv, params.averagedDisplay.displayDiv, params.averagedDisplay.before, after);
            }
        }
    }

    obj.displayd = function () {
        KEYSS = ["users", "items", "subscribers", "disputes"];
        obs = [this.snapdb.val()["users"], this.snapdb.val()["items"], this.snapdb.val()["subscriptions"], this.snapdb.val()["disputes"]]
        // t1 = this.time - times.params.milliInMonth.  //past 30 days
        var d = new Date();
        var m = d.getMonth();
        var y = d.getFullYear();
        if (m.toString().length < 2) {
            m = "0" + m;
        }
        datestring = y + '-' + m + '-' + '01T00:00:00'; //current month and year         //since last calendar month started
        var d = new Date(datestring);
        t1 = d.getTime(); /// current millis
        /////////
        var m = d.getMonth();
        if (m == 0) {
            m = 11;
            y = y - 1;
        }
        if (m.toString().length < 2) {
            m = "0" + m;
        }
        datestring = y + '-' + m + '-' + '01T00:00:00'; //since past calendar month started
        var d = new Date(datestring);
        t2 = d.getTime();
        for (i = 0; i < obs.length; i++) {
            ob = obs[i]
            w = KEYSS[i]
            times = this.dataOps.getTimeArray(ob);
            pastMonth = this.dataOps.greaterThan(times, t1).length;
            previousMonth = this.dataOps.betweenCount(times, t1, t2);

            if (previousMonth == 0) {
                percentChange = 0
            } else {
                percentChange = (pastMonth - previousMonth) / (previousMonth) * 100;
            }

            if (w == "items") {
                w = "posts";
            }
            if (percentChange > 0) {
                $(params.pastMonthDisplay.percentChange[w]).parent().removeClass('negative');
                $(params.pastMonthDisplay.percentChange[w]).parent().addClass('positive');
            } else {
                $(params.pastMonthDisplay.percentChange[w]).parent().removeClass('positive');
                $(params.pastMonthDisplay.percentChange[w]).parent().addClass('negative');
            }
            $(params.pastMonthDisplay.pastMonth[w]).html(pastMonth);
            $(params.pastMonthDisplay.percentChange[w]).html(percentChange);
        }
    }
    return obj;
}

function plotFunction(snapdb, ) {
    obj = {};
    obj.snapdb = snapdb;

    //VsTOD
    obj.vsTOD = function (timeLabels, frequency) {
        var oneBarChart = document.getElementById("one-bar-chart");
        if (null !== oneBarChart) var ctx_ob = oneBarChart.getContext("2d"),
            data_ob = {
                labels: timeLabels, //range(1, 31, 1),
                datasets: [{
                    backgroundColor: "#38a9ff",
                    data: frequency //[9, 11, 8, 6, 13, 7, 7, 0, 9, 12, 7, 13, 12, 8, 1, 10, 9, 7, 3, 7, 10, 4, 14, 9, 6, 6, 11, 12, 3, 4, 2]
                }]
            },
            oneBarEl = new Chart(ctx_ob, {
                type: "bar",
                data: data_ob,
                options: {
                    deferred: {
                        delay: 200
                    },
                    tooltips: {
                        enabled: !1
                    },
                    legend: {
                        display: !1
                    },
                    responsive: !0,
                    scales: {
                        xAxes: [{
                            stacked: !0,
                            barPercentage: .6,
                            gridLines: {
                                display: !1
                            },
                            ticks: {
                                fontColor: "#888da8"
                            }
                        }],
                        yAxes: [{
                            stacked: !0,
                            gridLines: {
                                color: "#f0f4f9"
                            },
                            ticks: {
                                beginAtZero: !0,
                                fontColor: "#888da8"
                            }
                        }]
                    }
                }
            });
    }
    ///TOTAL SPENDING
    //Get function to categorize into n. Get str dates
    obj.totalSpending = function (dates, totals) {
        var lineGraphicChart = document.getElementById("line-graphic-chart");
        if (null !== lineGraphicChart) var ctx_lg = lineGraphicChart.getContext("2d"),
            data_lg = {
                labels: dates, //["Aug 8", "Aug 15", "Aug 21", "Aug 28", "Sep 4", "Sep 11", "Sep 19", "Sep 26", "Oct 3", "Oct 10", "Oct 16", "Oct 23", "Oct 30"],
                datasets: [{
                    label: " - Spending",
                    backgroundColor: "rgba(255,215,27,0.6)",
                    borderColor: "#ffd71b",
                    borderWidth: 4,
                    pointBorderColor: "#ffd71b",
                    pointBackgroundColor: "#fff",
                    pointBorderWidth: 4,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    data: totals //[98, 42, 38, 57, 82, 41, 36, 30, 45, 62, 64, 80, 68]
                }]
            },
            lineGraphicEl = new Chart(ctx_lg, {
                type: "line",
                data: data_lg,
                options: {
                    deferred: {
                        delay: 300
                    },
                    legend: {
                        display: !1
                    },
                    responsive: !0,
                    scales: {
                        xAxes: [{
                            gridLines: {
                                color: "#f0f4f9"
                            },
                            ticks: {
                                fontColor: "#888da8"
                            }
                        }],
                        yAxes: [{
                            gridLines: {
                                display: !1
                            },
                            ticks: {
                                beginAtZero: !0,
                                fontColor: "#888da8"
                            }
                        }]
                    }
                }
            });
    }

    // obj.gigStatus = function (status, frequency) {}
    ///gig status // pie color chart
    obj.gigStatus = function (status, frequency) {
        var pieColorChart = document.getElementById("pie-color-chart");
        if (null !== pieColorChart) var ctx_pc = pieColorChart.getContext("2d"),
            data_pc = {
                labels: params.gigStatus.labels, //["one", "two", "three", "four", "five", "six", "seven"],//["Status Updates", "Multimedia", "Shared Posts", "Blog Posts"],
                datasets: [{
                    data: frequency, //[8.247, 5.63, 1.498, 1.136],
                    borderWidth: 0,
                    backgroundColor: ["#7c5ac2", "#08ddc1", "#ff5e3a", "#ffd71b", "#ff763a", "#1ed760", "#515365"]
                }]
            },
            pieColorEl = new Chart(ctx_pc, {
                type: "doughnut",
                data: data_pc,
                options: {
                    deferred: {
                        delay: 300
                    },
                    cutoutPercentage: 93,
                    legend: {
                        display: !1
                    },
                    animation: {
                        animateScale: !1
                    }
                }
            });
        ! function (a) {
            "use strict";
            var t = a(".pie-chart");
            t.appear({
                force_process: !0
            }), t.on("appear", function () {
                var t = a(this);
                if (!t.data("inited")) {
                    var e = t.data("startcolor"),
                        r = t.data("endcolor"),
                        o = 100 * t.data("value");
                    t.circleProgress({
                        thickness: 16,
                        size: 360,
                        startAngle: -Math.PI / 4 * 2,
                        emptyFill: "#ebecf1",
                        lineCap: "round",
                        fill: {
                            gradient: [r, e],
                            gradientAngle: Math.PI / 4
                        }
                    }).on("circle-animation-progress", function (a, e) {
                        t.find(".content").html(parseInt(o * e, 10) + "<span>%</span>")
                    }), t.data("inited", !0)
                }
            })
        }(jQuery);
    }

    //////vsTime
    obj.vsTime = function (dates, totals) {
        var lineChart = document.getElementById("line-chart");

        if (null !== lineChart) var ctx_lc = lineChart.getContext("2d"),
            data_lc = {
                labels: dates, //["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
                datasets: [{
                    label: " - Comments",
                    borderColor: "#ffdc1b",
                    borderWidth: 4,
                    pointBorderColor: "#ffdc1b",
                    pointBackgroundColor: "#fff",
                    pointBorderWidth: 4,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    fill: !1,
                    lineTension: 0,
                    data: totals //[96, 63, 136, 78, 111, 83, 101, 83, 102, 61, 45, 135]
                }]
            },
            lineChartEl = new Chart(ctx_lc, {
                type: "line",
                data: data_lc,
                options: {
                    legend: {
                        display: !1
                    },
                    responsive: !0,
                    scales: {
                        xAxes: [{
                            ticks: {
                                fontColor: "#888da8"
                            },
                            gridLines: {
                                color: "#f0f4f9"
                            }
                        }],
                        yAxes: [{
                            gridLines: {
                                color: "#f0f4f9"
                            },
                            ticks: {
                                beginAtZero: !0,
                                fontColor: "#888da8"
                            }
                        }]
                    }
                }
            });
    }

    //Marketers vs Influencers
    obj.marketersVsInfluencers = function (labels, counts) {
        var pieSmallChart = document.getElementById("pie-small-chart");
        if (null !== pieSmallChart) var ctx_sc = pieSmallChart.getContext("2d"),
            data_sc = {
                labels: labels, //["Marketers", "Yearly Comments"],
                datasets: [{
                    data: counts, // [65.048, 42.973],
                    borderWidth: 0,
                    backgroundColor: ["#08ddc1", "#ffdc1b"]
                }]
            },
            pieSmallEl = new Chart(ctx_sc, {
                type: "doughnut",
                data: data_sc,
                options: {
                    deferred: {
                        delay: 300
                    },
                    cutoutPercentage: 93,
                    legend: {
                        display: !1
                    },
                    animation: {
                        animateScale: !1
                    }
                }
            });
    }

    obj.pageActivity = function (names, percentages) {
        for (p in percentages) {
            this.displayPercentage(p, percentages[p]);
        }
    }

    obj.displayPercentage = function (p, per) {
        id = params.pageActivityPlot.displayDivs[p];
        $(id + " .count-animate").attr("data-to", per);
        $(id + " .units").html(per + "%");
        $(id).next().children().css("width", per + "%");
    }
    return obj;
}