
var	stopwatch = function() {
	
	// Private vars
	var startAt = 0; // start / resume time, initialized at zero
	var elapsedTime	= 0;
	var lap_count = 0;
	var max_laps = 10; // maximum number of laps (to be set by user)
	var lap = new Array(max_laps).fill(0); // array initialized with zero values

	var	now	= function() {
		return (new Date()).getTime(); // captures current time value in milliseconds
	};
 
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
		startAt = 0; // resets startAt so that timer does not continue
	};

	// Capture time for multiple laps in an array
	this.capture = function() {
		capturedTime = startAt ? elapsedTime + now() - startAt : elapsedTime;
			if (lap[lap_count] == 0) {
				lap[lap_count] = capturedTime;
			}
		lap_count += 1; // increase lap count by one after each assignment
		return lap;
	};

	// Reset all variables
	this.reset = function() {
		elapsedTime = capturedTime = startAt = lap_count = 0;
		lap.fill(0);
	};

	this.maxLaps = function () {
		return max_laps;
	};

	// Capture number of laps counted
	this.lapCount = function() {
		return lap_count;	
	};

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

	// Capture sixth lap time
	this.lap6 = function() {
		return lap[5];
	};

	// Capture seventh lap time
	this.lap7 = function() {
		return lap[6];
	};

	// Capture eigth lap time
	this.lap8 = function() {
		return lap[7];
	};

	// Capture ninth lap time
	this.lap9 = function() {
		return lap[8];
	};

	// Capture tenth lap time
	this.lap10 = function() {
		return lap[9];
	};
			 
};

var x = new stopwatch();
var $time;
var $lap1 = $lap2 = $lap3 = $lap4 = $lap5= $lap6= $lap7= $lap8= $lap9= $lap10 = '';
var clocktimer;
var max = x.maxLaps();
var lap_count = 1;
var lapId = 0; // used by addLap() function to keep track of IDs

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
	$lap6 = document.getElementById('lap6');
	$lap7 = document.getElementById('lap7');
	$lap8 = document.getElementById('lap8');
	$lap9 = document.getElementById('lap9');
	$lap10 = document.getElementById('lap10');
	update();
}

function update() {
	$time.innerHTML = formatTime(x.time());
	$lap1.innerHTML = "Lap 1: " + formatTime(x.lap1());
	$lap2.innerHTML = "Lap 2: " + formatTime(x.lap2());
	$lap3.innerHTML = "Lap 3: " + formatTime(x.lap3());
	$lap4.innerHTML = "Lap 4: " + formatTime(x.lap4());
	$lap5.innerHTML = "Lap 5: " + formatTime(x.lap5());
	$lap6.innerHTML = "Lap 6: " + formatTime(x.lap6());
	$lap7.innerHTML = "Lap 7: " + formatTime(x.lap7());
	$lap8.innerHTML = "Lap 8: " + formatTime(x.lap8());
	$lap9.innerHTML = "Lap 9: " + formatTime(x.lap9());
	$lap10.innerHTML = "Lap 10: " + formatTime(x.lap10());
}

function onStart() {
	document.getElementById("start").removeEventListener("click", onStart, false); // remove listener
	start();
	if (lap_count <= (max - 1)) {
		document.getElementById("capture").style.visibility = 'visible'; // show capture button until last lap
	}
  	document.getElementById("start").innerHTML = "Stop & Capture";
	document.getElementById("start").addEventListener("click", onStop, false); // add listener
}

function onStop() {
	document.getElementById("start").removeEventListener("click", onStop, false); // remove listener
	onCapture();
	stop();
	document.getElementById("capture").style.visibility = 'hidden'; // hide capture button 
	document.getElementById("start").innerHTML = "Start";
	document.getElementById("start").addEventListener("click", onStart, false); // add listener
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
	lap_count++;
	x.capture();
	update();
}

function onCapture() {
	capture();
	//addLap();
	if (lap_count <= (max - 1)) {
		document.getElementById("capture").style.visibility = 'visible'; // show capture button until last lap
	}
	else document.getElementById("capture").style.visibility = 'hidden'; // hide capture button during last lap
}

function reset() {
	onStop();
	x.reset();
	lap_count = 1;
	update();
}

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