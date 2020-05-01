//(function() {
	
	var startAt = 0; // start / resume time, initialized at zero
	var elapsedTime	= 0;
	var lap_count = 0;
	var max_laps = 10; // maximum number of laps (to be set by user)
	var lap = new Array(max_laps).fill(0); // array initialized with zero values so that capture values display

	//var x = new stopwatch();
	var $time;
	var $lap1 = $lap2 = $lap3 = $lap4 = $lap5 = $lap6 = $lap7 = $lap8 = $lap9 = $lap10 = '';
	//var clocktimer;
	//var max = x.maxLaps();
	//var $lap = x.lap;
	//var $lap = [];
	//var $lap_count = 1;
	var lapId = 0; // used by addLap() function to keep track of IDs


	var	now	= function now () {
		return (new Date()).getTime(); // captures current time value in milliseconds
	};
		
	// Start or resume
	var start = function() {
		startAt = startAt ? startAt : now();
	};
		
	// Duration
	var time = function() {
		return elapsedTime + (startAt ? now() - startAt : 0);
	};

	// Stop timer
	var stop = function() {
		elapsedTime = startAt ? elapsedTime + now() - startAt : elapsedTime;
		startAt = 0; // resets startAt so that timer does not continue
	};

	// Capture time for multiple laps in an array
	var capture = function() {
		capturedTime = startAt ? elapsedTime + now() - startAt : elapsedTime;
			if (lap[lap_count] === 0) {
				lap[lap_count] = capturedTime;
			}
		lap_count ++; // increase lap count by one after each assignment
		return lap;
	};

	// Reset all variables
	var reset = function() {
		elapsedTime = capturedTime = startAt = lap_count = 0;
		lap.fill(0);
	};

	//var maxLaps = function () {
	//	return max_laps;
	//};

	/*
	// Capture number of laps counted
	var lapCount = function() {
		return lap_count;	
	};

	// Capture all lap times
	var lap = function() {
		return lap;
	};

	// Capture first lap time
	var lap1 = function() {
		return lap[0];
	};

	// Capture second lap time
	var lap2 = function() {
		return lap[1];
	};
			
	// Capture third lap time
	var lap3 = function() {
		return lap[2];
	};
						
	// Capture fourth lap time
	var lap4 = function() {
		return lap[3];
	};
						
	// Capture fifth lap time
	var lap5 = function() {
		return lap[4];
	};

	// Capture sixth lap time
	var lap6 = function() {
		return lap[5];
	};

	// Capture seventh lap time
	var lap7 = function() {
		return lap[6];
	};

	// Capture eigth lap time
	var lap8 = function() {
		return lap[7];
	};

	// Capture ninth lap time
	var lap9 = function() {
		return lap[8];
	};

	// Capture tenth lap time
	var lap10 = function() {
		return lap[9];
	};
	*/

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

		$lap1 = document.getElementById('lap1');
		$lap2 = document.getElementById('lap2');
		$lap3 = document.getElementById('lap3');
		$lap4 = document.getElementById('lap4');
		$lap5 = document.getElementById('lap5');
		$lap6 = document.getElementById('lap6');
		$lap7 = document.getElementById('lap7');
		$lap8 = document.getElementById('lap8');
		$lap9 = document.getElementById('lap9');
		$lap10 = document.getElementById('lap10');
		update();
	}

	function update() {
		$time.innerHTML = formatTime(time());
		//$lap1.innerHTML = "Capture 1: " + formatTime(lap1());
		//$lap2.innerHTML = "Capture 2: " + formatTime(lap2());
		//$lap3.innerHTML = "Capture 3: " + formatTime(lap3());
		//$lap4.innerHTML = "Capture 4: " + formatTime(lap4());
		//$lap5.innerHTML = "Capture 5: " + formatTime(lap5());
		//$lap6.innerHTML = "Capture 6: " + formatTime(lap6());
		//$lap7.innerHTML = "Capture 7: " + formatTime(lap7());
		//$lap8.innerHTML = "Capture 8: " + formatTime(lap8());
		//$lap9.innerHTML = "Capture 9: " + formatTime(lap9());
		//$lap10.innerHTML = "Capture 10: " + formatTime(lap10());

		$lap1.innerHTML = "Capture 1: " + formatTime(lap[0]);
		$lap2.innerHTML = "Capture 2: " + formatTime(lap[1]);
		$lap3.innerHTML = "Capture 3: " + formatTime(lap[2]);
		$lap4.innerHTML = "Capture 4: " + formatTime(lap[3]);
		$lap5.innerHTML = "Capture 5: " + formatTime(lap[4]);
		$lap6.innerHTML = "Capture 6: " + formatTime(lap[5]);
		$lap7.innerHTML = "Capture 7: " + formatTime(lap[6]);
		$lap8.innerHTML = "Capture 8: " + formatTime(lap[7]);
		$lap9.innerHTML = "Capture 9: " + formatTime(lap[8]);
		$lap10.innerHTML = "Capture 10: " + formatTime(lap[9]);
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
		//$lap_count++; // increment lap count by +1
		//$lap = x.lap;
		update();
	}

	function onStop() {
		// Remove previous listeners
		document.getElementById("start").removeEventListener("click", onStop, false);
		document.getElementById("capture").removeEventListener("click", onCapture, false);
		// Capture time and pause timer
		onCapture();
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
			reset();
			//$lap_count = 1; // reset lap count
			// Prepare capture button
			document.getElementById("capture").innerHTML = "Capture"; // change label
			document.getElementById("capture").addEventListener("click", onCapture, false); // add listener
		}
	}

	/* Methods for avoiding setting number of laps */

	function addLap() {
		lapId++; // increment lapId to get a unique ID for each new element
		var html = '<input type="file" name="lap_times[]" /> ';
		addElement('Laps', 'p', 'Lap-' + lapId, html);
	}

	function addElement(parentId, elementTag, elementId, html) {
		// Adds an element to the document
		var p = document.getElementById(parentId);
		var newElement = document.createElement(elementTag);
		newElement.setAttribute('id', elementId);
		newElement.innerHTML = html;
		p.appendChild(newElement);
	}

	function removeElement(elementId) {
		// Removes an element from the document
		var element = document.getElementById(elementId);
		element.parentNode.removeChild(element);
	}

//}());
