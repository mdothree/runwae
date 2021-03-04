//
//<li data-original-index="0" class="selected"><a tabindex="0" class=" dropdown-item" style="" data-tokens="null" role="option" aria-disabled="false" aria-selected="true"><span class="text">Alabama</span><span class="glyphicon glyphicon-ok check-mark"></span></a></li>
//
//-------------------------------SELECT CASCADING-------------------------//
var currentCities = [];
// This is a demo API key that can only be used for a short period of time, and will be unavailable soon. You should rather request your API key (free)  from https://battuta.medunes.net/ 	
// var BATTUTA_KEY = "7dfa0ec008e149f3d11868d67ec9a0f5"; //runwae
var BATTUTA_KEY = "42ee69693d743b6681492036f0224ed9"; //runwaedev

// Populate country select box from battuta API
url = "https://geo-battuta.net/api/country/all/?key=" + BATTUTA_KEY + "&callback=?";
$.getJSON(url, function (countries) {
    console.log("call")
    //    $('#country').material_select();
    //loop through countries..
    i = 0;
    $.each(countries, function (key, country) {
        li = replaceText($("#dropdownTemplate").html(), ["{{index}}", "{{name}}", "{{code}}"], [i, country.name, country.code]);
        $("#countryDisplay").append(li);
        i++;
    });
    $("#countryDisplay .dropdown-li").click(function () {
        $("#country").val($(this).find('span.text').html());
        $("#country").attr('title', $(this).find('span.text').attr("title"));
        $("#country").change();
    });
    // trigger "change" to fire the #state section update process
    //    $("#country").material_select('update');
    //    $("#country").trigger("change");
    industries = [{"name":"Fashion","code":"001"},{"name":"Beauty","code":"002"},{"name":"Fitness","code":"003"},{"name":"Music","code":"004"}];
    //    $('#country').material_select();
    //loop through countries..
    i = 0;
    $.each(industries, function (key, industry) {
        li = replaceText($("#dropdownTemplate").html(), ["{{index}}", "{{name}}", "{{code}}"], [i, industry.name, industry.code]);
        $("#industryDisplay").append(li);
        i++;
    });
    $("#industryDisplay .dropdown-li").click(function () {
        $("#industry").val($(this).find('span.text').html());
        $("#industry").attr('title', $(this).find('span.text').attr("title"));
        $("#industry").change();
    });
});
$("#country").on("change", function () {
    //$("body").on('DOMSubtreeModified', "#country", function (event) {
    //    $("#countryDisplay .dropdown-li").click(function (event) {
    //        event.stopPropagation();
    //    $("#country").html($(this).find('span.text').html());
    //    $("#country").attr('title', $(this).find('span.text').attr("title"));
    //    countryCode = $("#country").val();
    countryCode = $("#country").attr("title");
    // Populate country select box from battuta API
    url = "https://geo-battuta.net/api/region/" +
        countryCode +
        "/all/?key=" + BATTUTA_KEY + "&callback=?";
    $("#regionDisplay li").remove();
    $.getJSON(url, function (regions) {
        //        $("#region option").remove();
        //loop through regions..
        i = 0;
        $.each(regions, function (key, region) {
            li = replaceText($("#dropdownTemplate").html(), ["{{index}}", "{{name}}", "{{code}}"], [i, region.region, region.region]);
            $("#regionDisplay").append(li);
            i++;
        });
        $("#regionDisplay .dropdown-li").click(function () {
            $("#region").val($(this).find('span.text').html());
            $("#region").attr('title', $(this).find('span.text').attr("title"));
            $("#region").change();
        });
        // trigger "change" to fire the #state section update process
        //        $("#region").material_select('update');
        //        $("#region").trigger("change");
    });
});
//$("#regionDisplay .dropdown-li").click(function (event) {
//            event.stopPropagation();
$("#region").on("change", function () {
    //    $("#region").val($(this).find('span.text').html());
    //    $("#region").attr('title', $(this).find('span.text').attr("title"));
    //$("#region").on("change", function () {
    //$("body").on('DOMSubtreeModified', "#region", function (event) {
    // Populate country select box from battuta API
    //    countryCode = $("#country").val();
    //    region = $("#region").val();
    countryCode = $("#country").attr("title");
    region = $("#region").attr("title");
    url = "https://geo-battuta.net/api/city/" +
        countryCode +
        "/search/?region=" +
        region +
        "&key=" +
        BATTUTA_KEY +
        "&callback=?";
    $("#cityDisplay li").remove();
    $.getJSON(url, function (cities) {
        //        currentCities = cities;
        var i = 0;
        //        $("#city option").remove();
        //loop through regions..
        $.each(cities, function (key, city) {
            li = replaceText($("#dropdownTemplate").html(), ["{{index}}", "{{name}}", "{{code}}"], [i, city.city, city.city]);
            $("#cityDisplay").append(li);
            i++;
        });
        $("#cityDisplay .dropdown-li").click(function () {
            $("#city").val($(this).find('span.text').html());
            $("#city").attr('title', $(this).find('span.text').attr("title"));
            $("#city").change();
        });
        // trigger "change" to fire the #state section update process
        //        $("#city").material_select('update');
        //        $("#city").trigger("change");
        $("#city").on("change", function (event) {
            event.stopImmediatePropagation();
            currentIndex = $("#city").val();
            currentCity = currentCities[currentIndex];
            city = currentCity.city;
            region = currentCity.region;
            country = currentCity.country;
            lat = currentCity.latitude;
            lng = currentCity.longitude;
            $("#location").val(lat + "," + lng);
        });
    });
});
//$("#city").on("change", function () {
//    currentIndex = $("#city").val();
//    currentCity = currentCities[currentIndex];
//    city = currentCity.city;
//    region = currentCity.region;
//    country = currentCity.country;
//    lat = currentCity.latitude;
//    lng = currentCity.longitude;
//    $("#location").html('<i class="fa fa-map-marker"></i> <strong> ' + city + "/" + region + "</strong>(" + lat + "," + lng + ")");
//});
//-------------------------------END OF SELECT CASCADING-------------------------//
