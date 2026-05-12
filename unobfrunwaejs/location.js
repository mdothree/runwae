//-------------------------------SELECT CASCADING (Mapbox)-------------------------//
var currentCities = [];
// Token loaded from config.js (injected at build time from Vercel env vars)
var MAPBOX_TOKEN = (window.RUNWAE_CONFIG && window.RUNWAE_CONFIG.MAPBOX_TOKEN) || "";

// Static list of countries (ISO 3166-1)
var COUNTRIES = [
    { name: "United States", code: "US" },
    { name: "United Kingdom", code: "GB" },
    { name: "Canada", code: "CA" },
    { name: "Australia", code: "AU" },
    { name: "Germany", code: "DE" },
    { name: "France", code: "FR" },
    { name: "Spain", code: "ES" },
    { name: "Italy", code: "IT" },
    { name: "Netherlands", code: "NL" },
    { name: "Brazil", code: "BR" },
    { name: "Mexico", code: "MX" },
    { name: "Japan", code: "JP" },
    { name: "South Korea", code: "KR" },
    { name: "India", code: "IN" },
    { name: "China", code: "CN" },
    { name: "Singapore", code: "SG" },
    { name: "United Arab Emirates", code: "AE" },
    { name: "South Africa", code: "ZA" },
    { name: "Nigeria", code: "NG" },
    { name: "Kenya", code: "KE" },
    { name: "Argentina", code: "AR" },
    { name: "Colombia", code: "CO" },
    { name: "Chile", code: "CL" },
    { name: "Peru", code: "PE" },
    { name: "Sweden", code: "SE" },
    { name: "Norway", code: "NO" },
    { name: "Denmark", code: "DK" },
    { name: "Finland", code: "FI" },
    { name: "Poland", code: "PL" },
    { name: "Austria", code: "AT" },
    { name: "Switzerland", code: "CH" },
    { name: "Belgium", code: "BE" },
    { name: "Portugal", code: "PT" },
    { name: "Ireland", code: "IE" },
    { name: "New Zealand", code: "NZ" },
    { name: "Philippines", code: "PH" },
    { name: "Indonesia", code: "ID" },
    { name: "Malaysia", code: "MY" },
    { name: "Thailand", code: "TH" },
    { name: "Vietnam", code: "VN" },
    { name: "Egypt", code: "EG" },
    { name: "Morocco", code: "MA" },
    { name: "Israel", code: "IL" },
    { name: "Turkey", code: "TR" },
    { name: "Russia", code: "RU" },
    { name: "Ukraine", code: "UA" },
    { name: "Greece", code: "GR" },
    { name: "Czech Republic", code: "CZ" },
    { name: "Romania", code: "RO" },
    { name: "Hungary", code: "HU" }
].sort(function(a, b) { return a.name.localeCompare(b.name); });

// Industries list
var industries = [
    { name: "Fashion", code: "001" },
    { name: "Beauty", code: "002" },
    { name: "Fitness", code: "003" },
    { name: "Music", code: "004" }
];

// Mapbox geocoding helper
function mapboxGeocode(query, types, country, callback) {
    var url = "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
        encodeURIComponent(query) + ".json?access_token=" + MAPBOX_TOKEN +
        "&types=" + types +
        "&limit=10";

    if (country) {
        url += "&country=" + country.toLowerCase();
    }

    $.getJSON(url, function(response) {
        callback(response.features || []);
    }).fail(function() {
        console.error("Mapbox geocoding failed");
        callback([]);
    });
}

// Initialize on document ready
$(document).ready(function() {
    // Populate country dropdown
    var i = 0;
    $.each(COUNTRIES, function(key, country) {
        var li = replaceText($("#dropdownTemplate").html(),
            ["{{index}}", "{{name}}", "{{code}}"],
            [i, country.name, country.code]);
        $("#countryDisplay").append(li);
        i++;
    });

    $("#countryDisplay .dropdown-li").click(function() {
        $("#country").val($(this).find('span.text').html());
        $("#country").attr('title', $(this).find('span.text').attr("title"));
        $("#country").change();
    });

    // Populate industry dropdown
    i = 0;
    $.each(industries, function(key, industry) {
        var li = replaceText($("#dropdownTemplate").html(),
            ["{{index}}", "{{name}}", "{{code}}"],
            [i, industry.name, industry.code]);
        $("#industryDisplay").append(li);
        i++;
    });

    $("#industryDisplay .dropdown-li").click(function() {
        $("#industry").val($(this).find('span.text').html());
        $("#industry").attr('title', $(this).find('span.text').attr("title"));
        $("#industry").change();
    });
});

// Country change - fetch regions
$("#country").on("change", function() {
    var countryCode = $("#country").attr("title");
    var countryName = $("#country").val();

    $("#regionDisplay li").remove();
    $("#cityDisplay li").remove();
    $("#region").val('').attr('title', '');
    $("#city").val('').attr('title', '');

    // Use Mapbox to get regions (administrative areas)
    mapboxGeocode(countryName, "region", countryCode, function(regions) {
        var i = 0;
        var seenRegions = {};

        $.each(regions, function(key, feature) {
            var regionName = feature.text || feature.place_name;

            // Avoid duplicates
            if (seenRegions[regionName]) return;
            seenRegions[regionName] = true;

            var li = replaceText($("#dropdownTemplate").html(),
                ["{{index}}", "{{name}}", "{{code}}"],
                [i, regionName, regionName]);
            $("#regionDisplay").append(li);
            i++;
        });

        // If no regions found, add a default option
        if (i === 0) {
            var li = replaceText($("#dropdownTemplate").html(),
                ["{{index}}", "{{name}}", "{{code}}"],
                [0, "All Regions", "all"]);
            $("#regionDisplay").append(li);
        }

        $("#regionDisplay .dropdown-li").click(function() {
            $("#region").val($(this).find('span.text').html());
            $("#region").attr('title', $(this).find('span.text').attr("title"));
            $("#region").change();
        });
    });
});

// Region change - fetch cities
$("#region").on("change", function() {
    var countryCode = $("#country").attr("title");
    var regionName = $("#region").val();

    $("#cityDisplay li").remove();
    $("#city").val('').attr('title', '');
    currentCities = [];

    // Build search query
    var searchQuery = regionName === "All Regions" ?
        $("#country").val() :
        regionName + ", " + $("#country").val();

    // Use Mapbox to get cities/places
    mapboxGeocode(searchQuery, "place,locality", countryCode, function(cities) {
        var i = 0;

        $.each(cities, function(key, feature) {
            var cityName = feature.text || feature.place_name.split(',')[0];
            var center = feature.center; // [lng, lat]

            // Store city data for later use
            currentCities.push({
                city: cityName,
                region: regionName,
                country: $("#country").val(),
                latitude: center[1],
                longitude: center[0]
            });

            var li = replaceText($("#dropdownTemplate").html(),
                ["{{index}}", "{{name}}", "{{code}}"],
                [i, cityName, cityName]);
            $("#cityDisplay").append(li);
            i++;
        });

        $("#cityDisplay .dropdown-li").click(function() {
            $("#city").val($(this).find('span.text').html());
            $("#city").attr('title', $(this).find('span.text').attr("title"));

            // Find the city index and set location
            var selectedCity = $(this).find('span.text').html();
            for (var j = 0; j < currentCities.length; j++) {
                if (currentCities[j].city === selectedCity) {
                    $("#location").val(currentCities[j].latitude + "," + currentCities[j].longitude);
                    break;
                }
            }

            $("#city").change();
        });
    });
});

// City change handler (for any additional processing)
$("#city").on("change", function(event) {
    event.stopImmediatePropagation();
    var selectedCity = $("#city").val();

    for (var i = 0; i < currentCities.length; i++) {
        if (currentCities[i].city === selectedCity) {
            $("#location").val(currentCities[i].latitude + "," + currentCities[i].longitude);
            break;
        }
    }
});
//-------------------------------END OF SELECT CASCADING-------------------------//
