/**
 * STOPWATCH OBJECT AND FUNCTIONS
 */

var stopwatchEM = stopwatchEM || {};
	
	var startTime = 0; // start / resume time, initialized at zero
	var elapsedTime	= 0;
	var lap_count = 0;
	var laps = [];
	var stops = []; // value of 1 is assigned if captured with a stop, else value is 0

	stopwatchEM.now = function() {
		return (new Date()).getTime(); // captures current time value in milliseconds
	};
		
	// Start or resume timer
	stopwatchEM.start = function() {
		startTime = startTime ? startTime : stopwatchEM.now();
	};
		
	// Duration
	stopwatchEM.time = function() {
		return elapsedTime + (startTime ? stopwatchEM.now() - startTime : 0);
	};
	
	// Capture time values in an array
	stopwatchEM.capture = function() {
		var capturedTime = startTime ? elapsedTime + stopwatchEM.now() - startTime : elapsedTime;
			if (!laps[lap_count]) {
				laps[lap_count] = capturedTime;
			}
			if (!stops[lap_count]) {
				stops[lap_count] = 0; // default value
			}
		lap_count ++; // increase lap count by one after each assignment
		return laps;
	};

	// Stop timer
	stopwatchEM.stop = function() {
		elapsedTime = startTime ? elapsedTime + stopwatchEM.now() - startTime : elapsedTime;
		startTime = 0; // resets startTime so that timer does not continue
		if (!stops[lap_count-1] || stops[lap_count-1] == 0) {
			stops[lap_count-1] = 1; // replaces value of 0 with 1 when timer is stopped
		}
	};

	// Reset all variables
	stopwatchEM.reset = function() {
		elapsedTime = startTime = lap_count = 0;
		laps.length = 0;
		stops.length = 0;
	};

	stopwatchEM.pad = function(num, size) {
		var s = "0000" + num;
		return s.substr(s.length - size);
	};
	
	stopwatchEM.formatTime = function(time) {
		var h = m = s = ms = 0;
		var newTime = '';

		h = Math.floor( time / (60 * 60 * 1000) );
		time = time % (60 * 60 * 1000);
		m = Math.floor( time / (60 * 1000) );
		time = time % (60 * 1000);
		s = Math.floor( time / 1000 );
		ms = time % 1000;

		newTime = stopwatchEM.pad(h, 2) + ':' + stopwatchEM.pad(m, 2) + ':' + stopwatchEM.pad(s, 2) + ':' + stopwatchEM.pad(ms, 3);
		return newTime;
	};

	stopwatchEM.update = function() {
		stopwatchEM.$time.innerHTML = stopwatchEM.formatTime(stopwatchEM.time());
	};

	stopwatchEM.onStart = function() {
		// Remove any previous listeners
		document.getElementById("start").removeEventListener("click", stopwatchEM.onStart, false);
		document.getElementById("capture").removeEventListener("click", stopwatchEM.onReset, false);
		// Update timer with 1 ms intervals
		clocktimer = setInterval("stopwatchEM.update()", 1); // TODO: see if we can change this to avoid requiring the update() method
		stopwatchEM.start();
		// Prepare Stop button
		document.getElementById("start").innerHTML = "Stop & Capture"; // change label
		document.getElementById("start").addEventListener("click", stopwatchEM.onStop, false); // add listener
		// Prepare capture button
		document.getElementById("capture").removeAttribute("disabled"); // enable button upon initiation
		document.getElementById("capture").innerHTML = "Capture"; // change label
		document.getElementById("capture").addEventListener("click", stopwatchEM.onCapture, false); // add listener
	};

	stopwatchEM.onCapture = function() {
		stopwatchEM.capture();
		stopwatchEM.addLapToDisplay();
	};

	stopwatchEM.onStop = function() {
		// Remove previous listeners
		document.getElementById("start").removeEventListener("click", stopwatchEM.onStop, false);
		document.getElementById("capture").removeEventListener("click", stopwatchEM.onCapture, false);
		// Capture time and pause timer
		stopwatchEM.capture();
		stopwatchEM.stop();
		stopwatchEM.addLapToDisplay();
		clearInterval(clocktimer);
		// Prepare start button
		document.getElementById("start").innerHTML = "Start"; // change label
		document.getElementById("start").addEventListener("click", stopwatchEM.onStart, false); // add listener
		// Prepare reset button
		document.getElementById("capture").innerHTML = "Reset"; // change label
		document.getElementById("capture").addEventListener("click", stopwatchEM.onReset, false); // add listener
	};

	stopwatchEM.onReset = function() {
		var choice = confirm("Are you sure you want to reset?\n\nDoing so will delete all time values captured by this stopwatch!");
		if (choice) {
			document.getElementById("capture").removeEventListener("click", stopwatchEM.onReset, false); // remove listener pointing to onReset()
			stopwatchEM.show();
			document.getElementById("laps").innerHTML = '';
			stopwatchEM.reset();
			// Prepare capture button
			document.getElementById("capture").innerHTML = "Capture"; // change label
			document.getElementById("capture").addEventListener("click", stopwatchEM.onCapture, false); // add listener
		}
	};

	stopwatchEM.addLapToDisplay = function() {
		if (laps == "" || laps.length == 0) {
			return false; // stop the function if the value is empty
		}
		if (stops[lap_count - 1] === 1) {
			var inner = `<b>Capture ${lap_count}:</b> ${stopwatchEM.formatTime(laps[lap_count - 1])} &#128721;`; // add a 'stop' sign when timer has been stopped
			document.getElementById("laps").innerHTML += '<li>' + inner + '</li>';	
		} else {
			var inner = `<b>Capture ${lap_count}:</b> ${stopwatchEM.formatTime(laps[lap_count - 1])}`;
			document.getElementById("laps").innerHTML += '<li>' + inner + '</li>';
		}
	};

	stopwatchEM.show = function() {
		stopwatchEM.$time = document.getElementById('time');
		document.getElementById("capture").setAttribute("disabled","disabled"); // disable capture button until timer started
		stopwatchEM.update();
	};


$(document).ready(function(){
	stopwatchEM.show();
});
