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
		var	startAt	=  0;	// Time of last start / resume (0 if not already running)
		var	elapsedTime	= 0;
		len = 5;			 // arbitrary length for laps
		var lap = [];
	
		

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
			elapsedTime = startAt ? elapsedTime + now() - startAt : elapsedTime;
			startAt = 0; // Resets startAt so that timer does not continue
			};
			
			// Capture time
		
		this.capture = function() {
				// Capture time for laps without stopping timer
				//var button = document.getElementById("start");
				//button.addEventListener('click', AddLap());
				count_laps=0;	
				
				capturedTime	= startAt ? elapsedTime + now() - startAt : elapsedTime;
				
				while (count_laps<len){
				if (!lap[count_laps]) {
				  lap[count_laps]=(capturedTime); // first lap
				  capturedTime =0;}
				  count_laps=count_laps+1;
				 }
				 return lap;
			};

			
				/* AddLap=function(){
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
				elapsedTime = capturedTime = lap[0] = lap[1] = lap[2] = lap[3] = lap[4] = startAt = 0;
			};

		// Capture  lap time
		
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
var showLap = 0;
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
	//update();
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