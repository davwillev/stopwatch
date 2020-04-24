
var	stopwatch = function() {
	// Private vars
	var startAt = 0; // Time of last start / resume (0 if not already running)
	var elapsedTime	= 0;
	var count_laps = 0;
	var max_laps = 5; // maximum number of laps (arbitrary)
	var lap = new Array(max_laps).fill(0);

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
		startAt = 0; // Resets startAt so that timer does not continue
	};

	// Capture time for multiple laps
	this.capture = function() {
		capturedTime = startAt ? elapsedTime + now() - startAt : elapsedTime;
				
		while (count_laps < max_laps){
			//if (!lap[count_laps]) {
				lap[count_laps] = capturedTime;
				capturedTime = 0;
			//}
		}
		count_laps++; // increase count by one after each method call
		return lap;
	};

			
			/* 
			
			
		// Capture time
		this.capture = function () {
			capturedTime = startAt ? elapsedTime + now() - startAt : elapsedTime;
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
			
			
			
			AddLap=function(){
			count_laps=0;			
			capturedTime	= startAt ? elapsedTime + now() - startAt : elapsedTime;
			while(!count_laps){
			if (!lap[count_laps]) {
				lap[count_laps] = capturedTime; // first lap
			  	capturedTime =0;}
				count_laps=count_laps+1;
			}}
		
		 */

			
	// Reset all variables
	this.reset = function() {
		elapsedTime = capturedTime = startAt = lap[0] = lap[1] = lap[2] = lap[3] = lap[4] = 0;
	};

	// Number of laps counted
	this.countLaps = function() {
		return count_laps;	
	}

	// Capture first lap time
	this.lap = function() {
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
var clocktimer;
var max = x.maxLaps();
var count = x.countLaps();
var startButton = document.getElementById("start");
var captureButton = document.getElementById("capture");

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
  	captureButton.style.visibility = 'visible'; // show capture button
  	startButton.innerHTML = "Stop & Capture";
  
 	startButton.addEventListener("click", function() {
	onCapture(); 
	onStop();
	startButton.removeEventListener("click", arguments.callee, false); // remove this EventListener
  	}, false);
}

  function onStop() {
	stop();
	captureButton.style.visibility = 'hidden'; // hide capture button 
	startButton.innerHTML = "Start";
	
	startButton.addEventListener("click", function() {
	onStart();
	startButton.removeEventListener("click", arguments.callee, false); // remove this EventListener
  	}, false);
}

function onCapture() {
  capture();
  //if (count === (max - 1)) {
	//captureButton.style.visibility = 'hidden'; // show capture button until last lap
  //}
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