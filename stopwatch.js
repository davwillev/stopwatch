
var	stopwatch = function() {
	// Private vars
	var startAt = 0; // Time of last start / resume (0 if not already running)
	var elapsedTime	= 0;
	var lap_count = 0;
	var max_laps = 5; // maximum number of laps (arbitrary)
	var lap = new Array(max_laps).fill(0);

	var	now	= function() {
		return (new Date()).getTime(); // captures current time value in milliseconds
	};

	var myVariables = {}
   	,varNames = ["name1","name2","name3"];
	for (var i=0; i < varNames.length; i +=1) {
  	myVariables[varNames[i]] = 0;
	}
	myVariables.name1; //=> 0
 
	/* Public methods */
		
	// Start or resume
	this.start = function() {
		startAt = startAt ? startAt : now();
	};
		
	// Duration
	this.time = function() {
		return elapsedTime + (startAt ? now() - startAt : 0);
	};

	// Stop timer
	this.stop = function() {
		elapsedTime = startAt ? elapsedTime + now() - startAt : elapsedTime;
		startAt = 0; // Resets startAt so that timer does not continue
	};

	// Capture time for multiple laps
	this.capture = function() {
		capturedTime = startAt ? elapsedTime + now() - startAt : elapsedTime;
		
		//while (lap.length <= max_laps) {
		//for (var i=0; i<lap.length; i++) {
			if (lap[lap_count] == 0) {
				lap[lap_count] = capturedTime;
			}
		//}
		lap_count += 1; // increase count by one after each assignment
		return lap;
	};
		
	
	// Capture time
	this.capture1 = function () {
		capturedTime = startAt ? elapsedTime + now() - startAt : elapsedTime;
		if (lap[4] == 0 && lap[3] !== 0 && lap[2] !== 0 && lap[1] !== 0 && lap[0] !== 0) {
			lap[4] = capturedTime; // fifth lap
		}
		if (lap[3] == 0 && lap[2] !== 0 && lap[1] !== 0 && lap[0] !== 0) {
			lap[3] = capturedTime; // fourth lap
		}
		if (lap[2] == 0 && lap[1] !== 0 && lap[0] !== 0) {
			lap[2] = capturedTime; // third lap
		}
		if (lap[1] == 0 && lap[0] !== 0) {
			lap[1] = capturedTime; // second lap
		}
		if (lap[0] == 0) {
			lap[0] = capturedTime; // first lap
		}
	};

			
	// Reset all variables
	this.reset = function() {
		elapsedTime = capturedTime = startAt = 0;
		lap.fill(0);
	};

	// Number of laps counted
	//this.countLaps = function() {
	//	return lap_count;	
	//}

	// Capture lap times
	this.lap = function() {
		return lap[lap_count];
	};

	// Capture first lap time
	this.lap1 = function() {
		return lap[0];
	};

	// Capture second lap time
	this.lap2 = function() {
		return lap[1];
	};
			
	// Capture third lap time
	this.lap3 = function() {
		return lap[2];
	};
						
	// Capture fourth lap time
	this.lap4 = function() {
		return lap[3];
	};
						
	// Capture fifth lap time
	this.lap5 = function() {
		return lap[4];
	};
			 
};

var x = new stopwatch();
var $time;
var $lap1 = '';
var $lap2 = '';
var $lap3 = '';
var $lap4 = '';
var $lap5 = '';
var clocktimer;
var max = x.maxLaps();
var count = x.countLaps();

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
	$lap1 = document.getElementById('lap1');
	$lap2 = document.getElementById('lap2');
	$lap3 = document.getElementById('lap3');
	$lap4 = document.getElementById('lap4');
	$lap5 = document.getElementById('lap5');
	update();
}

function onStart() {
	start();
	document.getElementById("capture").style.visibility = 'visible'; // show capture button
  	document.getElementById("start").innerHTML = "Stop & Capture";
  
	document.getElementById("start").addEventListener("click", function() {
	onCapture(); 
	onStop();
	document.getElementById("start").removeEventListener("click", arguments.callee, false); // remove this EventListener
  	}, false);
}

  function onStop() {
	stop();
	document.getElementById("capture").style.visibility = 'hidden'; // hide capture button 
	document.getElementById("start").innerHTML = "Start";
	
	document.getElementById("start").addEventListener("click", function() {
	onStart();
	document.getElementById("start").removeEventListener("click", arguments.callee, false); // remove this EventListener
  	}, false);
}

function onCapture() {
  capture();
  //if (count === (max - 1)) {
	//document.getElementById("capture").style.visibility = 'hidden'; // show capture button until last lap
  //}
}

function update() {
	$time.innerHTML = formatTime(x.time());
	$lap1.innerHTML = "Lap 1: " + formatTime(x.lap1());
	$lap2.innerHTML = "Lap 2: " + formatTime(x.lap2());
	$lap3.innerHTML = "Lap 3: " + formatTime(x.lap3());
	$lap4.innerHTML = "Lap 4: " + formatTime(x.lap4());
	$lap5.innerHTML = "Lap 5: " + formatTime(x.lap5());
}

function start() {
	clocktimer = setInterval("update()", 1); // set timer with 1 ms intervals
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
	$lap1.innerHTML = '';
	$lap2.innerHTML = '';
	$lap3.innerHTML = '';
	$lap4.innerHTML = '';
	$lap5.innerHTML = '';
	update();
}