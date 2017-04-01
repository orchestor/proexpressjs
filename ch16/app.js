
var mqtt = require('mqtt');

TIME_DEVICE_ID = "34d8406bfea04258b26bc12d25ff0f39";
TIME_DEVICE_TOKEN = "f2b5616ca85644a88c59b174e05ccf4d";

var time_device_credentials = {
		port: 8883,
		username: TIME_DEVICE_ID,
		password: TIME_DEVICE_TOKEN
}

WEATHER_DEVICE_ID = "645c361bc6e345e6bca9b63209896aaf";
WEATHER_DEVICE_TOKEN = "f53af6b6f3794d5591893669794ae7d6";

var weather_device_credentials = {
		port: 8883,
		username: WEATHER_DEVICE_ID,
		password: WEATHER_DEVICE_TOKEN
}


FINANCE_DEVICE_ID = "3cb95609e4494410a0030aaf459cac55";
FINANCE_DEVICE_TOKEN = "c423c5d0f6a74e808389416fa1424959";

var finance_device_credentials = {
		port: 8883,
		username: FINANCE_DEVICE_ID,
		password: FINANCE_DEVICE_TOKEN
}


NEWS_DEVICE_ID = '3d343b23c69047deb21e8ff98b48d01d';
NEWS_DEVICE_TOKEN = '926a3a7f707745318209fe18fea1937f';

var news_device_credentials = {
		port: 8883,
		username: NEWS_DEVICE_ID,
		password: NEWS_DEVICE_TOKEN
}


const NEWS_API_KEY = "a9250df5-f819-413a-920b-e960d60a6018";
const NEWS_HEADLINES = "(language%3Aenglish)%20TOP+NEWS";


const NEWS_END_POINT = "http://webhose.io/search?token="+  NEWS_API_KEY  + "&format=json&q="+ NEWS_HEADLINES;







const WEATHER_API_KEY = "06089ebeee78ddfe912a3dfc3f1c0d2f"
const LOCAL_WEATHER_ID = "4122986"

const WEATHER_END_POINT = "http://api.openweathermap.org/data/2.5/weather?id=" + LOCAL_WEATHER_ID + "&APPID=" + WEATHER_API_KEY;

function kelvinToFahrenheit(kelvinTemp) {
	return (kelvinTemp * 9/5) - 459.67;
}

var SYMBOLS_TO_CHECK = ['AAPL','^DJX','^IXIC','GOOG',"^GSPC"]

var timeClient  = mqtt.connect('mqtts://api.artik.cloud', time_device_credentials);
var weatherClient  = mqtt.connect('mqtts://api.artik.cloud', weather_device_credentials);
var financeClient  = mqtt.connect('mqtts://api.artik.cloud', finance_device_credentials);

//ARTIK Cloud only allows the following 2 paths on MQTT
var PUBLISH_MESSAGE_PATH_TIME = "/v1.1/messages/" + TIME_DEVICE_ID;
var PUBLISH_MESSAGE_PATH_WEATHER = "/v1.1/messages/" + WEATHER_DEVICE_ID;
var PUBLISH_MESSAGE_PATH_FINANCE = "/v1.1/messages/" + FINANCE_DEVICE_ID;

//Update the time every minute
function timeDaemon() {
	var sampleData = getTimeData();
	console.log("publishing data:", sampleData);
	timeClient.publish(PUBLISH_MESSAGE_PATH_TIME, sampleData);
	setTimeout(timeDaemon, 60 * 1000);
}


//Update the weather every 15 minutes
function weatherDaemon() {
	getWeatherData(function(error, data) {
		if (error) {
			console.log(error);
		} else {
			console.log("Publishing sample data: " + data);
			weatherClient.publish(PUBLISH_MESSAGE_PATH_WEATHER, data);
		}
		setTimeout(weatherDaemon, 15 * 60 * 1000);
	});
}

for (var i = 0; i < process.argv.length; i++) {
	if (process.argv[i] === "weather") {
		console.log("starting weather daemon");
		weatherDaemon();
	}
	if (process.argv[i] === "time") {
		console.log("starting time daemon");
		timeDaemon();
	}
	if (process.argv[i] === "finance") {
		console.log("starting finance daemon");
		financeDaemon();
	}
}

function getTimeData() {

	//fields key/value for you ARTIK Cloud device
	return JSON.stringify({
		"timestamp": parseInt((new Date().getTime())/1000)
	})
}



function getNewsData(callback) {
	var request = require('request');
	console.log("calling end point:" + NEWS_END_POINT);
	var req = request({
		method: 'GET',
		url: NEWS_END_POINT,
	}, function (error, res, body) {
		if (error || res.statusCode !== 200) {
			console.log("no news data: " + error);
			callback("no news data: " + error, "");
			return;
		} else {
			var json = JSON.parse(body)
			console.log(JSON.stringify(json));
			if (json.posts && json.posts[0] && json.posts[0].title) {



				//callback("", JSON.stringify(weather));

			} else {
				callback("no News data", "");
			}
		}
	});
}

function getWeatherData(callback) {
	var request = require('request');
	console.log("calling end point:" + WEATHER_END_POINT);
	var req = request({
		method: 'GET',
		url: WEATHER_END_POINT,
	}, function (error, res, body) {
		if (error || res.statusCode !== 200) {
			console.log("no weather data: " + error);
			callback("no weather data: " + error, "");
			return;
		} else {
			var json = JSON.parse(body)

			if (json.weather && json.weather[0] && json.weather[0].main && json.main && json.main.temp) {

				var weather = {};
				weather.state = json.weather[0].main.toLowerCase();
				// Do formatting; right now just using 5 states
				if (weather.state === "drizzle") {
					weather.state = "rain";
				}
				weather.temperature = Number(kelvinToFahrenheit(json.main.temp)).toFixed(0);
				callback("", JSON.stringify(weather));

			} else {
				callback("no weather data", "");
			}
		}
	});
}

function financeDaemon() {
	getDataforSymbols(SYMBOLS_TO_CHECK, function(error, dataArray) {
		if (error) {
			console.log(error);
		} else {
			console.log("We obtaine data")

			for (var i = 0; i < dataArray.length; i++) {
				console.log(dataArray[i]);
				financeClient.publish(PUBLISH_MESSAGE_PATH_FINANCE, JSON.stringify(dataArray[i]));
			}
		}
		setTimeout(financeDaemon, 5 * 60 * 1000);
	});

}



function getDataforSymbols(symbols, callback) {

	var yahooFinance = require('yahoo-finance');

	console.log(symbols);
	yahooFinance.snapshot({
		symbols : symbols,
		fields : ['l1'],
	}, function (err, snapshot) {
		if (err) {
			callback(err, []);
		} else {
			var dataToReturn = [];
			for (var i = 0; i < snapshot.length; i++) {
				console.log(snapshot[i]);
				var data = {};
				data.symbol = snapshot[i].symbol;
				// Remove the index carrot
				if (data.symbol.indexOf("^") === 0) {
					data.symbol = data.symbol.substring(1);
				}
				data.price = snapshot[i].lastTradePriceOnly;
				if (data.symbol === "DJX") {
					data.symbol = "DJI";
					data.price *= 100;
				}
				dataToReturn.push(data);
			}
			callback("", dataToReturn);
		}
	});
}
