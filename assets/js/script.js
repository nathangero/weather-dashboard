import { API_KEY, API_CALL_FORECAST, API_CALL_GEOCODE, API_CALL_ICON, API_CALL_WEATHER } from "./api.js";

const FORECAST_COUNT = 6; // First weather is the current day
var units = "imperial"; // Allow user to change?

$(function() {
    $("#button-search").on("click", handleSearch);
});


function handleSearch(event) {
    event.stopPropagation();
    event.preventDefault();

    let inputEl = $("#city-name");
    let cityName = inputEl.val();

    if (cityName) {
        getWeather(cityName);
    } else {
        alert("Please enter a city name");
    }
}



/**
 * Main function getting the weather. Has helper functions to help separate the work and organize code
 * @param {String} cityName 
 * @returns 
 */
async function getWeather(cityName) {
    let coordinates = await getCityLatLon(cityName);
    let lat = coordinates.lat;
    let lon = coordinates.lon;

    if (!lat || !lon) return; // Guard check

    let weatherToday = await fetchWeather(lat, lon);
    weatherToday["fullName"] = cityName

    if (!weatherToday) return; // Guard check

    let weatherForecast = await fetchForecast(lat, lon);

    displayWeatherToday(weatherToday);
    displayWeatherForecast(weatherForecast, cityName);
}

/**
 * Pull out the wanted info from the api json
 * @param {Object} weatherJson JSON containing the results from Open Weather
 * @returns Object containing the info to show the user
 */
function getWeatherInfo(weatherJson) {
    // console.log(weatherJson);

    return {
        city: weatherJson.fullName,
        timestamp: (weatherJson.dt) * 1000, // Add miliseconds
        icon: weatherJson.weather[0].icon,
        temperature: Math.ceil(weatherJson.main.temp),
        wind: weatherJson.wind.speed,
        humidity: weatherJson.main.humidity
    }
}

/**
 * Parse the JSON containing current date's weather and show it to the user.
 * Every time this runs, it removes the current showing weather if there is one
 * @param {Object} weatherToday JSON containing current date's weather
 */
function displayWeatherToday(weatherToday) {
    let weatherInfo = getWeatherInfo(weatherToday);
    let date = dayjs(weatherInfo.timestamp).format("MMM DD, YYYY")
    $("#city-info").html("")

    var card = $('<div>').addClass("card p-2 mt-2");

    var cardHeader = $(`<h2>`).addClass("card-header");
    cardHeader.html(`${weatherInfo.city} (${date}) <img src=${buildWeatherIcon(weatherInfo.icon)}>`);

    var cardBody = $("<div>").addClass("card-body");
    var temperature = $(`<p>`).addClass("card-text");
    temperature.html("Temperature: <strong>" + weatherInfo.temperature + "&deg</strong>");

    var wind = $(`<p>`).addClass("card-text");
    wind.html("Wind: <strong>" + weatherInfo.wind + (units === "imperial" ? " MPH" : " KM/H") + "</strong>")

    var humidity = $(`<p>`).addClass("card-text");
    humidity.html("Humidity: <strong>" + weatherInfo.humidity + "%</strong>");

    cardBody.append(temperature, wind, humidity);
    card.append(cardHeader, cardBody);
    $("#city-info").append(card);
}

/**
 * Parse the JSON containing current date's weather and show it to the user.
 * Every time this runs, it removes the current showing weather if there is one
 * @param {Object} weatherForecast JSON containing current date's forecast
 */
function displayWeatherForecast(weatherForecast) {
    console.log("weatherForecast:", weatherForecast);

    var forecast = $('<div id="forecast" class="d-flex flex-column">')
    var cardContainer = $('<div class="d-flex text-start">')

    for (let i = 1; i < FORECAST_COUNT; i++) { // Skip first weather because it's current date
        let weatherInfo = getWeatherInfo(weatherForecast.list[i]);
        // console.log("weatherInfo", i, ":", weatherInfo)
        let date = dayjs(weatherInfo.timestamp).format("ddd DD")
        console.log("weatherInfo.timestamp:", weatherInfo.timestamp);
        console.log("weatherInfo.forma:", dayjs(weatherInfo.timestamp).format("ddd MMM DD, YYYY HH:mm:ss"));

        var card = $('<div>').addClass("card m-2 custom-card");
        var cardHeader = $(`<h2>`).addClass("card-header");
        cardHeader.html(date);
    
        var cardBody = $("<div>").addClass("card-body");
        var weatherIcon = $(`<img src=${buildWeatherIcon(weatherInfo.icon)}>`);
        weatherIcon.addClass("card-text text-center");

        var temperature = $(`<p>`).addClass("card-text");
        temperature.html("Temperature: <strong>" + weatherInfo.temperature + "&deg</strong>");
    
        var wind = $(`<p>`).addClass("card-text");
        wind.html("Wind: <strong>" + weatherInfo.wind + (units === "imperial" ? " MPH" : " KM/H") + "</strong>")
    
        var humidity = $(`<p>`).addClass("card-text");
        humidity.html("Humidity: <strong>" + weatherInfo.humidity + "%</strong>");
    
        cardBody.append(weatherIcon, temperature, wind, humidity);
        card.append(cardHeader, cardBody);
        cardContainer.append(card);
    }
    
    forecast.append(cardContainer);
    $("#city-info").append(forecast);
}


/**
 * Gets the latitude and longitude from the city name. Necessary for fetching the resetof Open Weather's data
 * @param {String} cityName 
 * @returns 
 */
async function getCityLatLon(cityName) {
    let requestURL = buildGeocodeUrl(cityName);
    // console.log("buildGeocodeUrl:", requestURL)

    let options = {
        method: "GET",
        mode: "cors",
        cache: "default",
        credentials: "same-origin",
    }

    let response = await fetch(requestURL, options)
    // console.log("response:", response)

    let data = await response.json();
    // console.log("data:", data)

    if (!response.ok || data.length <= 0) {
        alert("Couldn't get city coordinates.\n\nPlease try including either just \"city name\" or \"city name, state (USA only), country code\"")
        return
    }

    let lat = data[0].lat;
    let lon = data[0].lon;

    return {
        lat: lat,
        lon: lon
    }
}

/**
 * Gets the current day's weather via latitude and longitude
 * @param {Number} lat location's latitude
 * @param {Number} lon location's longitude
 * @returns JSON of current day's weather
 */
async function fetchWeather(lat, lon) {
    let requestURL = buildWeatherUrl(lat, lon);
    // console.log("buildWeatherUrl:", requestURL)

    let options = {
        method: "GET",
        mode: "cors",
        cache: "reload", // We want the most current weather data
        credentials: "same-origin",
    }

    let response = await fetch(requestURL, options)
    let data = response.json();
    
    if (!response.ok || data.length <= 0) {
        alert("Couldn't get city coordinates.\n\nPlease try including either just \"city name\" or \"city name, state (USA only), country code\"")
        return
    }

    return data;
}

/**
 * Gets the location's 5 day forecast
 * @param {Number} lat location's latitude
 * @param {Number} lon location's longitude
 * @returns JSON of 5 day forecast
 */
async function fetchForecast(lat, lon) {
    let requestURL = buildForecastUrl(lat, lon);
    console.log("buildForecastUrl:", requestURL);

    let options = {
        method: "GET",
        mode: "cors",
        cache: "reload", // We want the most current weather data
        credentials: "same-origin",
    }

    let response = await fetch(requestURL, options)
    let data = response.json();
    
    if (!response.ok || data.length <= 0) {
        alert("Couldn't get city coordinates.\n\nPlease try including either just \"city name\" or \"city name, state (USA only), country code\"")
        return
    }

    return data;
}



/**
 * Creates the url for fetch
 * @param {String} cityName 
 * @returns String containing the api call
 */
function buildGeocodeUrl(cityName) {
    const QUERY_LIMIT = 1;
    let cityNameNoSpace = cityName.replace(/\s/g,''); // remove ALL whitespace

    return `${API_CALL_GEOCODE}${cityNameNoSpace}&limit=${QUERY_LIMIT}&appid=${API_KEY}`;
}

/**
 * Creates the url for fetch
 * @param {Number} lat location's latitude
 * @param {Number} lon location's longitude
 * @returns String containing the api call
 */
function buildWeatherUrl(lat, lon) {
    return `${API_CALL_WEATHER}lat=${lat}&lon=${lon}&APPID=${API_KEY}&units=${units}`;
}

/**
 * Creates the url for fetch
 * @param {Number} lat location's latitude
 * @param {Number} lon location's longitude
 * @returns String containing the api call
 */
function buildForecastUrl(lat, lon) {
    return `${API_CALL_FORECAST}lat=${lat}&lon=${lon}&APPID=${API_KEY}&units=${units}&cnt=${FORECAST_COUNT}`;
}

function buildWeatherIcon(iconName) {
    return `${API_CALL_ICON}${iconName}.png`
}