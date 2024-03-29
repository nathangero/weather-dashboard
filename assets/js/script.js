import { API_KEY, API_CALL_FORECAST, API_CALL_GEOCODE, API_CALL_ICON, API_CALL_WEATHER } from "./api.js";

const STORAGE_SAVED_CITIES = "savedCities";
var savedCities = new Set();
var units = "imperial"; // Allow user to change?

$(function() {
    handleLoadStorage();
    $("#button-search").on("click", handleSearch);
});


/**
 * Handles getting the weather from the user's input.
 * @param {Event} event 
 */
function handleSearch(event) {
    event.stopPropagation();
    event.preventDefault();

    let inputEl = $("#city-name");
    let cityName = inputEl.val();

    if (cityName.toLowerCase()) {
        getWeather(cityName);
    } else {
        alert("Please enter a city name");
    }
}

/**
 * Handles loading the weather from the button clicked from the history.
 * Gets the value from the button clicked and runs getWeather().
 * @param {Event} event 
 */
function handleHistorySearch(event) {
    event.stopPropagation();
    event.preventDefault();

    let element = $(event.target);
    let cityName = element.text();

    if (cityName) {
        getWeather(cityName);
    } else {
        alert("Couldn't load from history");
    }
}

/**
 * Removes the city from the local storage and reflects change on webpage.
 * @param {Event} event 
 */
function handleRemoveHistory(event) {
    event.stopPropagation();
    event.preventDefault();

    let element = $(event.target);
    let cityName = element.siblings().first().text();
    // console.log("cityName:", cityName)

    if (cityName) {
        savedCities.delete(cityName.toLowerCase());
        $("#search-history").text("");
        saveHistory()

        savedCities.forEach((city) => {
            displaySearchedCity(city)
        })
    } else {
        alert("Couldn't delete from history");
    }
}

/**
 * Handles loading the saved cities from the local storage.
 * Reads any saved cities from local storage and puts them out to the search history.
 */
function handleLoadStorage() {
    let storedCities = JSON.parse(localStorage.getItem(STORAGE_SAVED_CITIES));

    if (storedCities) {
        storedCities.forEach((city) => {
            displaySearchedCity(city);
            savedCities.add(city); // Add to global variable to prevent duplicates
        })
    }
}

/**
 * Save searched cities in local storage.
 * Convert Set to an Array in order to save in local storage
 */
function saveHistory() {
    let convertToArray = Array.from(savedCities) // Convert set to an array to save in local storage
    localStorage.setItem(STORAGE_SAVED_CITIES, JSON.stringify(convertToArray))
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

    if (!weatherToday) return; // Guard check

    let weatherForecast = await fetchForecast(lat, lon);

    if (!weatherForecast) return; // Guard check

    // If all checks pass, then show the user the weather

    // Prevent duplicates
    if (!savedCities.has(cityName.toLowerCase())) {
        displaySearchedCity(cityName);
        saveHistory()
    }
    
    displayWeatherToday(weatherToday, cityName);
    displayWeatherForecast(weatherForecast);

    $("#city-name").val(""); // Delete input value after all weather has loaded
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
 * Pull out the wanted info from the api json
 * @param {Object} weatherJson JSON containing the results from Open Weather
 * @returns Object containing the info to show the user
 */
function getWeatherInfo(weatherJson) {
    return {
        timestamp: (weatherJson.dt) * 1000, // Add miliseconds
        icon: weatherJson.weather[0].icon,
        temperature: Math.round(weatherJson.main.temp),
        wind: Math.round(weatherJson.wind.speed),
        humidity: weatherJson.main.humidity
    }
}

/**
 * Display the city the user searched on the left side of the screen.
 * @param {String} cityName 
 */
function displaySearchedCity(cityName) {
    var searchHistory = $("#search-history");

    var item = $("<li>")
    item.addClass("card d-flex flex-row justify-content-center w-75 bg-secondary p-1 mb-3")

    var deleteButton = $("<button>");
    deleteButton.addClass("btn-close custom-close");
    deleteButton.on("click", handleRemoveHistory);

    var city = $("<button>");
    city.addClass("btn btn-secondary text-capitalize button-load-city")
    city.text(cityName);
    city.on("click", handleHistorySearch)

    item.append(city, deleteButton);
    searchHistory.append(item);
    
    // Save in all lowercase to make checking easier
    savedCities.add(cityName.toLowerCase());
}

/**
 * Parse the JSON containing current date's weather and show it to the user.
 * Every time this runs, it removes the current showing weather if there is one
 * @param {Object} weatherToday JSON containing current date's weather
 */
function displayWeatherToday(weatherToday, cityName) {
    let weatherInfo = getWeatherInfo(weatherToday);
    let date = dayjs(weatherInfo.timestamp).format("ddd MMM DD, YYYY")
    $("#city-info").html("") // Remove any currently showing weather

    var card = $('<div>').addClass("card p-0 mt-2");

    var cardHeader = $(`<h2>`).addClass("card-header text-capitalize");
    cardHeader.html(`${cityName} (${date}) <img src=${buildWeatherIcon(weatherInfo.icon)}>`);

    var cardBody = $("<div>").addClass("card-body");
    var temperature = $(`<p>`).addClass("card-text");
    temperature.html("Temperature: <strong>" + weatherInfo.temperature + "&deg" + (units === "imperial" ? "F" : "C") + "</strong>");

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
    // console.log("weatherForecast:", weatherForecast);
    const PEAK_TEMP_HOUR_MIN = 13;
    const PEAK_TEMP_HOUR_MAX = 16;

    var dateTracker = dayjs().format("DD");

    var forecast = $('<div>').attr("id", "forecast");
    var h3El = $("<br><h3>5-Day Forecast:</h3>")
    forecast.append(h3El);

    var cardContainer = $('<div>').addClass("container-forecast");

    for (let i = 0; i < weatherForecast.list.length; i++) { // Skip first weather because it's current date
        let weatherInfo = getWeatherInfo(weatherForecast.list[i]);
        let dayObj = dayjs(weatherInfo.timestamp);
        let weatherDate = dayObj.format("DD");
        let hour = parseInt(dayObj.format("HH"));

        // Skip iteration until it's the next day
        if (dateTracker === weatherDate) {
            continue
        }

        if (hour <= PEAK_TEMP_HOUR_MAX && hour >= PEAK_TEMP_HOUR_MIN) {
            // console.log("found highest temperature for", dayObj.format("ddd MMM DD HH:mm:ss"), "\nMake new card");

            var card = $('<div>').addClass("card mb-3 custom-card");
            var cardHeader = $(`<h2>`).addClass("card-header");
            cardHeader.html(dayObj.format("ddd DD"));
        
            var cardBody = $("<div>").addClass("card-body");
            var weatherIcon = $(`<img src=${buildWeatherIcon(weatherInfo.icon)}>`);
            weatherIcon.addClass("card-text pt-0");
    
            var temperature = $(`<p>`).addClass("card-text");
            temperature.html("Temp: <strong>" + weatherInfo.temperature + "&deg" + (units === "imperial" ? "F" : "C") + "</strong>");
        
            var wind = $(`<p>`).addClass("card-text");
            wind.html("Wind: <strong>" + weatherInfo.wind + (units === "imperial" ? " MPH" : " M/S") + "</strong>")
        
            var humidity = $(`<p>`).addClass("card-text");
            humidity.html("Humidity: <strong>" + weatherInfo.humidity + "%</strong>");
        
            cardBody.append(weatherIcon, temperature, wind, humidity);
            card.append(cardHeader, cardBody);
            cardContainer.append(card);

            // Update the tracker so we don't get duplicates of a day
            dateTracker = weatherDate;
        }
    }
    
    forecast.append(cardContainer);
    $("#city-info").append(forecast);
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
    // console.log("buildForecastUrl:", requestURL);

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

    let cityNameNoSpace = "";
    let split = cityName.split(",")

    for (let i = 0; i < split.length; i++) {
        // First trim leading/trailing whitespace, if there's middle white space then replace with a +
        cityNameNoSpace += split[i].trim().replace(" ", "+");

        // Add commas to all except the last of the string
        if (i < split.length - 1) cityNameNoSpace += ",";
    }

    return `${API_CALL_GEOCODE}${cityNameNoSpace}&limit=${QUERY_LIMIT}&appid=${API_KEY}`;
}

/**
 * Creates the url for fetch
 * @param {Number} lat location's latitude
 * @param {Number} lon location's longitude
 * @returns String containing the current day's weather API call
 */
function buildWeatherUrl(lat, lon) {
    return `${API_CALL_WEATHER}lat=${lat}&lon=${lon}&APPID=${API_KEY}&units=${units}`;
}

/**
 * Creates the url for fetch
 * @param {Number} lat location's latitude
 * @param {Number} lon location's longitude
 * @returns String containing the forecast API call
 */
function buildForecastUrl(lat, lon) {
    return `${API_CALL_FORECAST}lat=${lat}&lon=${lon}&APPID=${API_KEY}&units=${units}`;
}

/**
 * Creates the url for the weather icon
 * @param {String} iconName 
 * @returns String containing the icon API call
 */
function buildWeatherIcon(iconName) {
    return `${API_CALL_ICON}${iconName}.png`
}