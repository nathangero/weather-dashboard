import { API_KEY } from "./key.js";

const API_CALL = "https://api.openweathermap.org/data/2.5/weather?q="


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

function getWeather(cityName) {
    let requestURL = buildRequestUrl(cityName);
    console.log(buildRequestUrl(cityName));

    let options = {
        method: "GET",
        mode: "cors",
        credentials: "same-origin",
    }

    fetch(requestURL, options)
    .then((response) => {
        if (response.ok) {
            return response.json();
        } else {
            alert("Couldn't get city data")
            console.log("response:", response);
        }
    }).then((data) => {
        let weatherData = data;
        // console.log(weatherData);
    })
}

function buildRequestUrl(cityName) {
    return API_CALL + cityName +  "&APPID=" + API_KEY;
}