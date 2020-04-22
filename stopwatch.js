//	To start the stopwatch:
//		obj.start();
//
//	To get the duration in milliseconds without pausing / resuming:
//		var	x = obj.time();
//
//	To pause the stopwatch:
//		var	x = obj.stop();	// Result is duration in milliseconds
//
//	To resume a paused stopwatch
//		var	x = obj.start();	// Result is duration in milliseconds
//
//	To reset a paused stopwatch
//		obj.stop();
//
var	stopwatch = function() {
		// Private vars
		var	startAt	= 0;	// Time of last start / resume (0 if not already running)
		var	elapsedTime	= 0;
		var lapTime = 0; // Time saved 
		var lapTime2 = 0; // Time saved
		var lapTime3 = 0; // Time saved
		var lapTime4 = 0; // Time saved
		var lapTime5 = 0; // Time saved

		var	now	= function() {
				return (new Date()).getTime(); // captures current time
			}; 
 
		/* Public methods */
		
		// Start or resume
		this.start = function() {
				  startAt	= startAt ? startAt : now();
			};
		
		// Duration
		this.time = function() {
				return elapsedTime + (startAt ? now() - startAt : 0);
			};

		// Stop timer and capture time
		this.stop = function() {
				elapsedTime	= startAt ? elapsedTime + now() - startAt : elapsedTime;
				// Capture time for laps
				if (!lapTime5 && lapTime4 !== 0 && lapTime3 !== 0 && lapTime2 !== 0 && lapTime !== 0) {
				  lapTime5 = elapsedTime; // fifth lap
				}
				if (!lapTime4 && lapTime3 !== 0 && lapTime2 !== 0 && lapTime !== 0) {
				  lapTime4 = elapsedTime; // fourth lap
				}
				if (!lapTime3 && lapTime2 !== 0 && lapTime !== 0) {
				  lapTime3 = elapsedTime; // third lap
				}
				if (!lapTime2 && lapTime !== 0) {
				  lapTime2 = elapsedTime; // second lap
				}
				if (!lapTime) {
				  lapTime = elapsedTime; // first lap
				}
				startAt	= 0; // Resets startAt so that timer does not continue
			};
			
			// Capture time
		this.capture = function() {
		  capturedTime	= startAt ? elapsedTime + now() - startAt : elapsedTime;
				// Capture time for laps without stopping timer
				if (!lapTime5 && lapTime4 !== 0 && lapTime3 !== 0 && lapTime2 !== 0 && lapTime !== 0) {
				  lapTime5 = capturedTime; // fifth lap
				}
				if (!lapTime4 && lapTime3 !== 0 && lapTime2 !== 0 && lapTime !== 0) {
				  lapTime4 = capturedTime; // fourth lap
				}
				if (!lapTime3 && lapTime2 !== 0 && lapTime !== 0) {
				  lapTime3 = capturedTime; // third lap
				}
				if (!lapTime2 && lapTime !== 0) {
				  lapTime2 = capturedTime; // second lap
				}
				if (!lapTime) {
				  lapTime = capturedTime; // first lap
				}
			};
			
		// Reset all variables
		this.reset = function() {
				elapsedTime = capturedTime = lapTime = lapTime2 = lapTime3 = lapTime4 = lapTime5 = startAt = 0;
			};

		// Capture first lap time
		this.lap = function() {
				return lapTime;
			};
			
		// Capture second lap time
		this.lap2 = function() {
				return lapTime2;
			};
			
		// Capture third lap time
		this.lap3 = function() {
				return lapTime3;
			};
						
		// Capture fourth lap time
		this.lap4 = function() {
				return lapTime4;
			};
						
		// Capture fifth lap time
		this.lap5 = function() {
				return lapTime5;
			};
			
	};

var x = new stopwatch();
var $time;
var $lap;
var clocktimer;
var showLap = 0;

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
	$lap = document.getElementById('lap');
	$lap2 = document.getElementById('lap2');
	$lap3 = document.getElementById('lap3');
	$lap4 = document.getElementById('lap4');
	$lap5 = document.getElementById('lap5');
	update();
}

function onStart() {
  start();
	document.getElementById("start").style.visibility = 'hidden'; // hide start button
  document.getElementById("stop").style.visibility = 'visible'; // show stop button
  document.getElementById("capture").style.visibility = 'visible'; // show capture button
}

function onStop() {
  stop();
	document.getElementById("stop").style.visibility = 'hidden'; // hide stop button
	document.getElementById("capture").style.visibility = 'hidden'; // hide capture button
  document.getElementById("start").style.visibility = 'visible'; // show start button
}

function onCapture() {
  capture();
  if ($lap4.innerHTML === '') {
  document.getElementById("capture").style.visibility = 'visible'; // show capture button until last lap
  }
}

function update() {
	$time.innerHTML = formatTime(x.time());
	$lap.innerHTML = "Lap: " + formatTime(x.lap());
	$lap2.innerHTML = "Lap 2: " + formatTime(x.lap2());
	$lap3.innerHTML = "Lap 3: " + formatTime(x.lap3());
	$lap4.innerHTML = "Lap 4: " + formatTime(x.lap4());
	$lap5.innerHTML = "Lap 5: " + formatTime(x.lap5());
}

function start() {
	clocktimer = setInterval("update()", 1);
	x.start();
}

function stop() {
	x.stop();
	clearInterval(clocktimer);
	update();
}

function capture() {
  x.capture();
  update();
}

function reset() {
	x.reset();
	$time.innerHTML = '';
	$lap.innerHTML = '';
	$lap2.innerHTML = '';
	$lap3.innerHTML = '';
	$lap4.innerHTML = '';
	$lap5.innerHTML = '';
	update();
}
