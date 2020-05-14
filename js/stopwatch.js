// ****************************************************************************************************
// FUNCTIONS TO ADD STOPWATCH CAPABILITIES TO REDCAP QUESTIONS
// ****************************************************************************************************

/*
 INSTRUCTIONS:
 THIS FEATURE CAN BE SUPPORTED WITHOUT MODIFICATION TO THE REDCAP SOURCE CODE.

 CREATE A NEW TEXT QUESTION IN YOUR DATA-DICTIONARY AND SET THE NOTES FIELD TO BE: @STOPWATCH (ALL CAPS)
 ALTERNATIVELY, USE ONLINE DESIGNER TO CREATE A TEXT BOX FIELD AND ADD @STOPWATCH (ALL CAPS) TO THE 
 ACTION TAGS BOX.
*/

/**
 * STOPWATCH OBJECT AND FUNCTIONS
 */

var stopwatchEM = stopwatchEM || {};

	// Logging
	stopwatchEM.log = function() {
    	// Make console logging more resilient to Redmond
    	try {
    	    console.log.apply(this,arguments);
    	} catch(err) {
    	    // Error trying to apply logs to console (problem with IE11)
    	    try {
    	        console.log(arguments);
    	    } catch (err2) {
    	        // Can't even do that!  Argh - no logging
    	        // var d = $('<div></div>').html(JSON.stringify(err)).appendTo($('body'));
    	    }
    	}
	};
	
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
		$time.innerHTML = stopwatchEM.formatTime(time());
	};

	stopwatchEM.onStart = function() {
		// Remove any previous listeners
		document.getElementById("start").removeEventListener("click", stopwatchEM.onStart, false);
		document.getElementById("capture").removeEventListener("click", stopwatchEM.onReset, false);
		// Update timer with 1 ms intervals
		clocktimer = setInterval("update()", 1); // TODO: see if we can change this to avoid requiring the update() method
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
			var inner = `<b>Capture ${lap_count}:</b> ${formatTime(laps[lap_count - 1])} &#128721;`; // add a 'stop' sign when timer has been stopped
			document.getElementById("laps").innerHTML += '<li>' + inner + '</li>';	
		} else {
			var inner = `<b>Capture ${lap_count}:</b> ${formatTime(laps[lap_count - 1])}`;
			document.getElementById("laps").innerHTML += '<li>' + inner + '</li>';
		}
	};

	stopwatchEM.show = function() {

		$time = document.getElementById('time');
		document.getElementById("capture").setAttribute("disabled","disabled"); // disable capture button until timer started
		stopwatchEM.update();

		$(function(){
			// Render stopwatch
			$.each(stopwatchEM.settings, function(index, value) {
				// stopwatchEM.log ('index: ' + index);
				// stopwatchEM.log (value);
				stopwatchEM.render(value);
			});
		});
	};

	stopwatchEM.render = function(params) {
		// Get TR Element
		var tr = $('tr[sq_id='+params.field+']');
		//stopwatchEM.log('tr');stopwatchEM.log($(tr));
	
		// Get note
		var note = $('div.note', tr);
		//stopwatchEM.log('note');stopwatchEM.log($(note));
	
		// Get Label
		var label = $('td.labelrc:last', tr);
		//stopwatchEM.log('label');stopwatchEM.log($(label));
	
		// Get Data (not always present - depends on rendering options)
		var data = $('td.data', tr);
		//stopwatchEM.log('data');stopwatchEM.log($(data));
	
		// Get result tag (it is assumed for now that captured times are concatenated, comma-delimited strings in an input field)
		var result = $('input[name="' + params.field + '"]', tr);
		//stopwatchEM.log("Result Field");stopwatchEM.log(result);
	
    	// // Hide the note (except on online-designer)
    	// if (page == "DataEntry/index.php" || page == "surveys/index.php") {
    	//     $(note).css('display','none');
    	// } else {
    	//     $(note).append('<br><em>This note will not be visible on the survey or data entry form</em>');
    	// }
		
		// Hide the checkbox input on surveys and data entry forms
		if (page == "DataEntry/index.php" || page == "surveys/index.php") {
			// Hide Checkbox/Radio Fields
			if (params.hideInput) {
	
				// Hide radio and checkboxes
				$('.frmrdh',tr).hide();
				$('.frmrd',tr).hide();
				$('.choicevert',tr).hide();
				$('.choicehoriz',tr).hide();
	
				// Hide text input
				$('input[type=text][name="'+params.field+'"]').hide();
			}
		}

		var stopwatch = $('<div style="margin-right:auto;margin-left:auto;width:'+params.width+'px"/>').addClass('stopwatch').append(imgTag).append(mapTag);
		//stopwatchEM.log('stopwatch');stopwatchEM.log($(stopwatch));

		// Insert stopwatch after label
		$(label).append(stopwatch);
	
		// Determine if stopwatch is selectable
		var selectable = true;
		if (page == "DataEntry/index.php" && $('#form_response_header').length) {
			//In data entry mode but results from survey are in...  Only editable if in edit-response mode
			var regex = new RegExp('editresp\=1$');
			if (!regex.test(document.baseURI)) {
				selectable = false;
			}
		}
	
    	// Determine if multiselect (default) or single-select
		////var singleSelect = (params.singleSelect == true);

		// Allow customizable fillColor
		////var fillColor = 'fillColor' in params ? params.fillColor : 'ff0000';
	
    	// Load saved values
    	stopwatchEM.loadAreaList(params.field);

		// If bound to a checkbox, handle checking the checkbox inputs directly to update the map
		$('input[type=checkbox]', tr).parent().bind('click', function() {
			// Prevent this code from happening twice when the event is fired from a click
			// on the stopwatch
			if(event.isTrusted) {
				// stopwatchEM.log(this, event);
				var tr = $(this).closest('tr');
				//stopwatchEM.log(tr);
				var div = $(this).closest('div');
				var field_name = $(tr).attr('sq_id');
				var img = $('img[field="'+field_name+'"]', tr).not(".mapster_el");
				//stopwatchEM.log(img);
				var checkbox = $('input[type=checkbox]', div);
				// stopwatchEM.log(checkbox);
				var code = checkbox.attr('code');
				//stopwatchEM.log(code);
				var checked = checkbox.is(":checked");
				//stopwatchEM.log(checked);
				$(img).mapster('set',checked,code);
			}
    });

    // If bound to radio, capture radio changes and update stopwatch
    $('input[type=radio]', tr).bind('click', function() {
        var tr = $(this).closest('tr');
        //stopwatchEM.log(tr + ' clicked');
        var field_name = $(tr).attr('sq_id');
        //stopwatchEM.log(field_name);
        stopwatchEM.loadAreaList(field_name);
    });
		
		// Bind to reset button
		$('a:contains("reset")', tr).bind('click',function() {
			var tr = $(this).closest('tr');
			//stopwatchEM.log(tr);
			var field_name = $(tr).attr('sq_id');
			//stopwatchEM.log(field_name);
			var img = $('img[field="'+field_name+'"]', tr).not(".mapster_el");
		});
	};

	// Update the stopwatch to match the field
	stopwatchEM.loadAreaList = function(field_name) {
	    // Get TR for question
	    var tr = $('tr[sq_id='+field_name+']');
	    //stopwatchEM.log ('tr');stopwatchEM.log(tr);

	    img = $('img[field="'+field_name+'"]', tr).not(".mapster_el");
 	   //stopwatchEM.log ('img');stopwatchEM.log(img);

 	   // If checkboxes are used, then update stopwatch from values
  	  $('input[type=checkbox]:checked', tr).each(function() {
  	      // (this) is redcap checkbox field.
   	     var code = $(this).attr('code');
   	     //stopwatchEM.log('Code: ' + code);
   	     $(img).mapster('set',true,code);
   	 });

   	 // If text - then process from list
    	$('input[type=text][name="'+field_name+'"]', tr).each(function() {
    	    ////$(img).mapster('set',true,$(this).val());
    	});

    	// For radio button questions, the main input is here - use it to set value
    	$('input[name="'+field_name+'"]', tr).each(function() {
    	    ////$(img).mapster('set',true,$(this).val());
    	});
	
	};

	// Takes the values from the stopwatch and saves them to the redcap form
	stopwatchEM.updateAreaList = function(image, data) {
    	var field_name = $(image).attr('field');    //// with what should we replace 'image'?
	    var tr = $('tr[sq_id='+field_name+']');

    	// Handle radio buttons as an option
    	$('input[type=radio][value="'+data.key+'"]', tr).each(function() {
        	if (data.selected) $(this).trigger('click');
        	if (!data.selected) radioResetVal(field_name,'form');
    	});

    	// If checkbox exists - make sure they are in-sync
    	$('input[type=checkbox][code="'+data.key+'"]', tr).each(function() {
        	//stopwatchEM.log ('Found checkbox ' + data.key);
 	       //stopwatchEM.log (cb);
 	       var checked = $(this).is(":checked");
 	       //stopwatchEM.log ('is checked: ' + checked);
 	       var selected = data.selected;
  	      //stopwatchEM.log ('is selected: ' + selected);
  	      if (checked !== selected) {
  	          $(this).click().trigger('onclick');
  	          //$(this).blur();
        	}
    	});

	//// don't think we need this...	
    	// If input field is used to hold list, then update list
    ////	$('input[type=text][name="'+field_name+'"]', tr).each(function() {
    	    // Update input with value from mapster image
    ////	    var sel = $(image).mapster('get');
    ////	    if (sel) {
    ////	        var selSort = sel.split(',').sort().join(',');
    ////	        $(this).val(selSort);
    ////   	 } else {
    ////	        $(this).val('');
    //// 	   }
    //// 	   $(this).blur();
    //// 	   $(this).change();
    ////	});
	};

$(document).ready(function(){
	stopwatchEM.show();
});
