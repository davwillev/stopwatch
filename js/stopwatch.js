//(function() {
	
	var startAt = 0; // start / resume time, initialized at zero
	var elapsedTime	= 0;
	var lap_count = 0;
	var laps = [];

	function now() {
		return (new Date()).getTime(); // captures current time value in milliseconds
	};
		
	// Start or resume timer
	function start() {
		startAt = startAt ? startAt : now();
	};
		
	// Duration
	function time() {
		return elapsedTime + (startAt ? now() - startAt : 0);
	};

	// Stop timer
	function stop() {
		elapsedTime = startAt ? elapsedTime + now() - startAt : elapsedTime;
		startAt = 0; // resets startAt so that timer does not continue
	};

	// Capture time values in an array
	function capture() {
		var capturedTime = startAt ? elapsedTime + now() - startAt : elapsedTime;
			if (!laps[lap_count]) {
				laps[lap_count] = capturedTime;
			}
		lap_count ++; // increase lap count by one after each assignment
		return laps;
	};

	// Reset all variables
	function reset() {
		elapsedTime = startAt = lap_count = 0;
		laps.length = 0;
	};

	function pad(num, size) {
		var s = "0000" + num;
		return s.substr(s.length - size);
	}
	
	function formatTime(time) {
		var h = m = s = ms = 0;
		var newTime = '';

		h = Math.floor( time / (60 * 60 * 1000) );
		time = time % (60 * 60 * 1000);
		m = Math.floor( time / (60 * 1000) );
		time = time % (60 * 1000);
		s = Math.floor( time / 1000 );
		ms = time % 1000;

		newTime = pad(h, 2) + ':' + pad(m, 2) + ':' + pad(s, 2) + ':' + pad(ms, 3);
		return newTime;
	}

	function show() {
		$time = document.getElementById('time');
		document.getElementById("capture").setAttribute("disabled","disabled"); // disable capture button until start
		update();
	}

	function update() {
		$time.innerHTML = formatTime(time());
	}

	function addLapToDisplay() {
		if (laps == "" || laps.length == 0) {
			return false; // stop the function if the value is empty
		}
		var inner = `<b>Capture ${lap_count}:</b> ${formatTime(laps[lap_count - 1])}`;
		document.getElementById("laps").innerHTML += '<li>' + inner + '</li>';
	}

	function onStart() {
		// Remove any previous listeners
		document.getElementById("start").removeEventListener("click", onStart, false);
		document.getElementById("capture").removeEventListener("click", onReset, false);
		// Start timer with 1 ms intervals
		clocktimer = setInterval("update()", 1);
		start();
		// Prepare Stop button
		document.getElementById("start").innerHTML = "Stop & Capture"; // change label
		document.getElementById("start").addEventListener("click", onStop, false); // add listener
		// Prepare capture button
		document.getElementById("capture").removeAttribute("disabled"); // enable button upon initiation
		document.getElementById("capture").innerHTML = "Capture"; // change label
		document.getElementById("capture").addEventListener("click", onCapture, false); // add listener
	}

	function onCapture() {
		capture();
		addLapToDisplay();
	}

	function onStop() {
		// Remove previous listeners
		document.getElementById("start").removeEventListener("click", onStop, false);
		document.getElementById("capture").removeEventListener("click", onCapture, false);
		// Capture time and pause timer
		capture();
		addLapToDisplay();
		stop();
		clearInterval(clocktimer);
		// Prepare start button
		document.getElementById("start").innerHTML = "Start"; // change label
		document.getElementById("start").addEventListener("click", onStart, false); // add listener
		// Prepare reset button
		document.getElementById("capture").innerHTML = "Reset"; // change label
		document.getElementById("capture").addEventListener("click", onReset, false); // add listener
	}

	function onReset() {
		var choice = confirm("Are you sure you want to reset?\n\nDoing so will delete all time values captured by this stopwatch!");
		if (choice) {
			document.getElementById("capture").removeEventListener("click", onReset, false); // remove listener pointing to onReset()
			show();
			document.getElementById("laps").innerHTML = '';
			reset();
			// Prepare capture button
			document.getElementById("capture").innerHTML = "Capture"; // change label
			document.getElementById("capture").addEventListener("click", onCapture, false); // add listener
		}
	}


//}());