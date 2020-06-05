// @ts-check
//
// Stopwatch External Module
//
;(function() {

//#region Globals & Data Transfer ----------------------------------------------------------

// Setup data transfer object.
// @ts-ignore
var EM = window.ExternalModules
if (typeof EM == 'undefined') {
    EM = {}
    // @ts-ignore
    window.ExternalModules = EM
}
/** @type {StopwatchDTO} DTO */
var DTO = EM.StopwatchEM_DTO || {}
EM.StopwatchEM_DTO = DTO

/** @type {Object<string, StopwatchData>} Holds data for each stopwatch widget (there can be multiple) */
var SWD = {}
/** @type {number} The interval (in ms) at which the stopwatch display is refreshed */
var TICKINTERVAL = 5
/** @type {number} The timer handle */
var CLOCK
/** @type {boolean} Indicates whether the clock is currently ticking */
var TICKING = false
/** @type {string[]} Missing Data Codes */
var MDC = []

//#endregion

//#region Logging --------------------------------------------------------------------------

/**
 * Logs stuff to the console when in debug mode.
 */
function log() {
    if (DTO.debug) {
        switch(arguments.length) {
            case 1: 
            console.log(arguments[0]); 
            return;
            case 2: 
            console.log(arguments[0], arguments[1]); 
            return;
            case 3: 
            console.log(arguments[0], arguments[1], arguments[2]); 
            return;
            case 4:
                console.log(arguments[0], arguments[1], arguments[2], arguments[3]); 
                return;
            default:
                console.log(arguments);
        }
    }
}

//#endregion

//#region HTML and Update ------------------------------------------------------------------

/**
 * Initial setup.
 */
function setup() {
    log('Stopwatch EM - Initializing:', DTO)
    // Get missing data codes.
    // @ts-ignore
    if (Array.isArray(missing_data_codes)) MDC = missing_data_codes
    // Add stopwatches.
    Object.keys(DTO.fields).forEach(function(field) {
        var params = DTO.fields[field]
        var $tr = $('tr[sq_id="' + field + '"]')
        if (typeof params.error != 'undefined') {
            error(field, params.error, $tr)
        }
        else {
            var $input = $('input[name="' + params.target + '"]')
            if (!$input.length) {
                $input = $('textarea[name="' + params.target + '"]')
            }
            if ($tr.length && $input.length) {
                create(field, params, $tr, $input)
            }
        }
    })
    // Locked data entry form?
    if($('#__SUBMITBUTTONS__-tr').css('display') == 'none' || 
        $('#__SUBMITBUTTONS__-div').css('display') == 'none') {
        $('.stopwatch-em-startstop').prop('disabled', true)
        $('.stopwatch-em-reset').prop('disabled', true)
    }
}

/**
 * Output a visible error message.
 * @param {string} id
 * @param {string} error
 * @param {JQuery} $tr
 */
function error(id, error, $tr) {
    var $error = $('<span></span>').addClass('stopwatch-em-error').text('@STOPWATCH: ' + error)
    // Determine insertion point.
    var $insertionPoint = $tr.find('td.data')
    if ($insertionPoint.length == 0) {
        $insertionPoint = $tr.find('div.space')
    }
    $insertionPoint.prepend($error)
    log('Stopwatch [' + id + '] - failed to create: ' + error)
}

/**
 * Create Stopwatch widget.
 * @param {string} id 
 * @param {StopwatchParams} params 
 * @param {JQuery} $tr
 * @param {JQuery} $input
 */
function create(id, params, $tr, $input) {
    // Template.
    var $sw = getTemplate('stopwatch-basic')
    $sw.attr('data-stopwatch-em-id', id)
    // Display components.
    var $display = $sw.find('.stopwatch-em-timerdisplay')
    var $hourglass = $sw.find('.stopwatch-em-hourglass')
    // Init data structure.
    /** @type {StopwatchData} */
    var swd = {
        id: id,
        initial: true,
        $stopwatch: $sw,
        $display: $display,
        $hourglass: $hourglass,
        $input: $input,
        $json: null,
        $thead: $sw.find('.stopwatch-em-thead'),
        $tbody: $sw.find('.stopwatch-em-tbody'),
        currentLap: null,
        $currentLapValue: null,
        $currentLapStops: null,
        $currentLapCumulated: null,
        params: params,
        elapsed: 0,
        startTime: null,
        stopTime: null,
        running: false,
        laps: [],
        captures: []
    }
    SWD[id] = swd
    // Hidden input field (for repeat storage only).
    if (params.store_format == 'repeating') {
        swd.$json = $('<input/>').attr('name', 'stopwatch-em-json-' + swd.id).appendTo($sw).hide()
    }
    // Table.
    swd.$thead.find('.stopwatch-em-row-header-elapsed').html(params.label_elapsed)
    swd.$thead.find('.stopwatch-em-row-header-cumulated').html(params.label_cumulated)
    // Buttons.
    swd.$srsBtn = $sw.find('.stopwatch-em-startstop')
    swd.$rclBtn = $sw.find('.stopwatch-em-reset')
    // Reset / Capture / Lap.
    swd.$rclBtn.attr('data-stopwatch-em-id', id)
    swd.$rclBtn.on('click', function(e) {
        e.preventDefault()
        if (swd.running) {
            // Add capture or lap.
            var now = new Date()
            if (params.mode == 'capture') {
                capture(swd, now, false)
            } 
            else if (params.mode == 'lap') {
                lap(swd, now, false)
            }
        }
        else {
            // Reset.
            reset(swd)
        }
    })
    // Start / Resume / Stop.
    swd.$srsBtn.attr('data-stopwatch-em-id', id)
    swd.$srsBtn.on('click', function(e) {
        e.preventDefault()
        if (swd.running) {
            stop(swd)
        }
        else {
            start(swd)
        }
    })
    // Hookup change event.
    $input.on('change blur', function() {
        // Set stopwatch to value (forcing stop when running).
        var val = $input.val().toString()
        var result = parseValue(swd, val)
        set(swd, result)
    })
    // MDC resilience (it shamelessly hides any buttons, how dare it!).
    var mut = new MutationObserver(function() {
        swd.$rclBtn.show()
        swd.$srsBtn.show()
    })
    mut.observe(swd.$srsBtn[0], { attributes: true })
    // Hide the target.
    hideTarget(swd)
    // Determine insertion point - this depends on whether the field with 
    // the action tag is itself the target field.
    if (swd.id == params.target) {
        // Inset above input control.
        swd.$input.before($sw)
        // For capture/lap mode, set vertical alignment of parent container to top.
        if (params.at_top && (params.mode == 'lap' || params.mode == 'capture')) {
            $input.parent().css('vertical-align','top')
        }
    }
    else {
        $tr.find('td.labelrc').last().append($sw)
    }
    // Set initial value and update UI.
    var val = $input.val().toString()
    var result = parseValue(swd, val)
    set(swd, result)
    log('Stopwatch [' + swd.id + '] - added to \'' + id + '\'')
}

/**
 * Hides target input/textarea.
 * @param {StopwatchData} swd 
 */
function hideTarget(swd) {
    if (!DTO.survey && !swd.params.show_target) {
        swd.$input.hide()
        if (swd.$input.is('textarea')) {
            swd.$input.siblings('.expandLinkParent').hide()
        }
    }
    if (DTO.survey && !swd.params.show_target_survey) {
        swd.$input.hide()
        if (swd.$input.is('textarea')) {
            swd.$input.siblings('.expandLinkParent').hide()
        }
    }
}

/**
 * Gets a template by name.
 * @param {string} name The name of the template (i.e. value of the data-emc attribute).
 * @param {string} elementType The type of the nested element to get.
 * @returns {JQuery} The jQuery representation of the template's content.
 */
function getTemplate(name, elementType = 'div') {
    // @ts-ignore
    return $('[data-stopwatch-em-template=' + name + ']').find(elementType).first().clone()
}

/**
 * Updates the stopwatch display.
 * @param {StopwatchData} swd 
 */
function updateDisplay(swd) {
    var totalElapsed = getTotalElapsed(swd)
    var totalText = format(totalElapsed, swd).display
    swd.$display.text(totalText)
    if (swd.params.mode == 'lap' && swd.currentLap) {
        var lapElapsed = getLapElapsed(swd)
        var lapText = format(lapElapsed, swd).display
        swd.$currentLapValue.text(lapText)
    }
}

/**
 * Updates the hourglass display.
 * @param {StopwatchData} swd 
 */
function updateHourglass(swd) {
    swd.$hourglass.removeClass(['fa-hourglass-start', 'fa-hourglass-half', 'fa-hourglass-end'])
    var hourglass = 'fa-hourglass-' + (swd.running ? 'half' : (swd.elapsed > 0 ? 'end' : 'start'))
    swd.$hourglass.addClass(hourglass)
}

/**
 * Inserts a time value into the target field.
 * @param {StopwatchData} swd 
 */
function insertElapsed(swd) {
    // Hard time_mm_ss limit (59:59)?
    if (swd.params.is_mm_ss && swd.elapsed > 3599499) {
        // TODO: tt-fy, nicer alert
        alert('Elapsed times > 59:59 cannot be inserted! Reseting to stored value (or blank).')
        var val = swd.$input.val().toString()
        var result = parseValue(swd, val)
        set(swd, result)
    }
    else {
        swd.$input.val(format(swd.elapsed, swd).store)
        // Trigger change so that REDCap will do branching etc.
        swd.$input.trigger('change')
        swd.$input.trigger('blur')
    }
}

/**
 * Inserts a capture data structure into the target field.
 * @param {StopwatchData} swd 
 */
function insertCaptures(swd) {
    var params = swd.params
    if (params.store_format == 'json') {
        var json = JSON.stringify(swd.captures, null, 2)
        swd.$input.val(json)
        swd.$input.trigger('change')
        swd.$input.trigger('blur')
    }
    else if (params.store_format == 'repeating') {
        var json = JSON.stringify(swd.captures)
        swd.$json.val(json)
    }
}

/**
 * Inserts a lap data structure into the target field.
 * @param {StopwatchData} swd 
 */
function insertLaps(swd) {
    var params = swd.params
    if (params.store_format == 'json') {
        var json = JSON.stringify(swd.laps, null, 2)
        swd.$input.val(json)
        swd.$input.trigger('change')
        swd.$input.trigger('blur')
    }
    else if (params.store_format == 'repeating') {
        var json = JSON.stringify(swd.laps)
        swd.$json.val(json)
    }
}

/**
 * Inserts a row into the captures table.
 * @param {StopwatchData} swd 
 * @param {CaptureInfo} capture 
 * @param {Number} n
 */
function addCaptureRow(swd, capture, n) {
    var $row = getTemplate('stopwatch-row', 'tr')
    var $label = $row.find('.stopwatch-em-row-label')
    var $stop = $row.find('.stopwatch-em-row-stop')
    var $elapsed = $row.find('.stopwatch-em-row-elapsed')
    $label.html(swd.params.label_capture + ' ' + n)
    $elapsed.text(format(capture.elapsed, swd).display)
    $stop.html(getStopSymbol(capture.is_stop))
    swd.$tbody.prepend($row)
    if (swd.params.max_rows > 0 && swd.captures.length > swd.params.max_rows) {
        swd.$tbody.children().last().remove()
    }
}

/**
 * Inserts a row into the laps table.
 * @param {StopwatchData} swd 
 * @param {Number} n
 */
function addLapRow(swd, n) {
    var $row = getTemplate('stopwatch-row', 'tr')
    var $label = $row.find('.stopwatch-em-row-label')
    var $stop = $row.find('.stopwatch-em-row-stop')
    var $elapsed = $row.find('.stopwatch-em-row-elapsed')
    var $cumulated = $row.find('.stopwatch-em-row-cumulated')
    $label.html(swd.params.label_lap + ' ' + n)
    $elapsed.text(format(swd.currentLap.elapsed, swd).display)
    if (swd.currentLap.elapsed > 0) { 
        $cumulated.text(format(swd.currentLap.cumulated, swd).display)
    }
    $stop.html(getStopSymbol(swd.currentLap.num_stops > 0))
    swd.$tbody.prepend($row)
    if (swd.params.max_rows > 0 && swd.laps.length > swd.params.max_rows) {
        swd.$tbody.children().last().remove()
    }
    swd.$currentLapValue = $elapsed
    swd.$currentLapStops = $stop
    swd.$currentLapCumulated = $cumulated
    if (swd.params.cumulated) {
        $cumulated.show()
        swd.$thead.show()
    }
}

/**
 * Gets the stopped symbol.
 * @param {boolean} stopped 
 */
function getStopSymbol(stopped) {
    return stopped ? '<i class="fas fa-stopwatch"></i>' : ''
}

//#endregion

//#region Clock functionality --------------------------------------------------------------

/**
 * Calculates the total time (in ms) elapsed since the last start of the stopwatch.
 * @param {StopwatchData} swd 
 */
function getTotalElapsed(swd) {
    if (swd.running) {
        var now = new Date()
        return swd.elapsed + (now.getTime() - swd.lapStartTime.getTime())
    }
    return swd.elapsed
}

/**
 * Calculates the lap time (in ms) elapsed since the last resume of the stopwatch.
 * @param {StopwatchData} swd 
 */
function getLapElapsed(swd) {
    var elapsed = swd.currentLap ? swd.currentLap.elapsed : 0
    if (swd.running) {
        var now = new Date()
        return elapsed + (now.getTime() - swd.lapStartTime.getTime())
    }
    return elapsed
}

/**
 * Controls the single timer for all stopwatches in a page.
 */
function timerSet() {
    var on = false
    Object.keys(SWD).forEach(function(id) {
        on = on || SWD[id].running
    })
    if (on && !TICKING) {
        CLOCK = setInterval(timerTick, TICKINTERVAL)
        TICKING = true
    }
    else if (!on && TICKING) {
        TICKING = false
        clearInterval(CLOCK)
    }
}

/**
 * Executed each time the timer ticks - updates the running stopwatches.
 */
function timerTick() {
    Object.keys(SWD).forEach(function(id) {
        var swd = SWD[id]
        if (swd.running) {
            updateDisplay(swd)
        }
    })
}

/**
 * Start a stopwatch.
 * @param {StopwatchData} swd 
 */
function start(swd) {
    var now = new Date()
    swd.initial = false
    if (swd.startTime == null) {
        swd.startTime = now
    }
    var params = swd.params
    if (params.mode == 'basic') {
        if (!swd.running) {
            swd.lapStartTime = now
            swd.startTime = now
            swd.running = true
        }
        // Update UI.
        swd.$rclBtn.prop('disabled', true)
        swd.$srsBtn.html(params.label_stop)
        swd.$srsBtn.addClass('stopwatch-em-running')
    }
    else if (params.mode == 'capture') {
        if (!swd.running) {
            swd.lapStartTime = now
            swd.startTime = now
            swd.running = true
        }
        // Update UI.
        swd.$rclBtn.prop('disabled', false)
        swd.$rclBtn.html(params.label_capture)
        swd.$srsBtn.html(params.label_stop)
        swd.$srsBtn.addClass('stopwatch-em-running')
    }
    else if (params.mode == 'lap') {
        swd.lapStartTime = now
        swd.running = true
        if (!swd.currentLap) {
            lap(swd, now, false)
        } 
        else {
            // need to increment number of stops
            swd.currentLap.num_stops++
        }
        // Update UI.
        swd.$rclBtn.prop('disabled', false)
        swd.$rclBtn.html(params.label_lap)
        swd.$srsBtn.html(params.label_stop)
        swd.$srsBtn.addClass('stopwatch-em-running')
    }
    // Update UI.
    updateHourglass(swd)
    timerSet()
    log('Stopwatch [' + swd.id + '] has been started at ' + now.toLocaleTimeString() + '.')
}

/**
 * Adds a capture.
 * @param {StopwatchData} swd
 * @param {Date} now
 * @param {boolean} stopped 
 */
function capture(swd, now, stopped) {
    swd.lapStopTime = now
    var elapsed = now.getTime() - swd.lapStartTime.getTime()
    swd.elapsed = swd.elapsed < 0 ? elapsed : swd.elapsed + elapsed
    /** @type {CaptureInfo} */
    var capture = {
        start:  swd.lapStartTime,
        stop: swd.lapStopTime,
        elapsed: swd.elapsed,
        is_stop: stopped && swd.params.resume
    }
    swd.captures.push(capture)
    swd.lapStartTime = now
    addCaptureRow(swd, capture, swd.captures.length)
    if (stopped) {
        insertCaptures(swd)
    }
}

/**
 * Adds a lap.
 * @param {StopwatchData} swd 
 * @param {Date} now
 * @param {boolean} stopped 
 */
function lap(swd, now, stopped) {
    var elapsed = now.getTime() - swd.lapStartTime.getTime() 
    swd.elapsed = swd.elapsed < 0 ? elapsed : swd.elapsed + elapsed
    if (!stopped) {
        // Is there a previous lap? Update it.
        if (swd.currentLap) {
            swd.currentLap.stop = now
            swd.currentLap.elapsed += elapsed
            swd.currentLap.cumulated = swd.elapsed
            swd.$currentLapValue.text(format(swd.currentLap.elapsed, swd).display)
            swd.$currentLapCumulated.text(format(swd.currentLap.cumulated, swd).display)
        }
        swd.lapStartTime = now
        // Add a new lap.
        /** @type {LapInfo} */
        swd.currentLap = {
            start: now,
            stop: null,
            elapsed: 0,
            cumulated: swd.elapsed,
            num_stops: 0
        }
        swd.laps.push(swd.currentLap)
        addLapRow(swd, swd.laps.length)
    }
    else {
        swd.currentLap.stop = now
        swd.currentLap.num_stops += (swd.params.resume ? 1 : 0)
        swd.currentLap.elapsed += elapsed
        swd.currentLap.cumulated = swd.elapsed
        swd.$currentLapValue.text(format(elapsed, swd).display)
        swd.$currentLapCumulated.text(format(swd.elapsed, swd).display)
        swd.$currentLapStops.html(getStopSymbol(swd.currentLap.num_stops > 0))
        insertLaps(swd)
    }
}

/**
 * Stops the timer.
 * @param {StopwatchData} swd 
 */
function stop(swd) {
    var now = new Date()
    swd.stopTime = now
    var params = swd.params
    if (params.mode == 'basic') {
        swd.running = false
        swd.lapStopTime = now
        var elapsed = now.getTime() - swd.lapStartTime.getTime()
        swd.elapsed = swd.elapsed < 0 ? elapsed : swd.elapsed + elapsed
        insertElapsed(swd)
    }
    else if (params.mode == 'capture') {
        swd.running = false
        capture(swd, now, true)
    }
    else if (params.mode == 'lap') {
        swd.running = false
        swd.lapStopTime = now
        lap(swd, now, true)
    }
    // Update displayed time so there is no discrepancy.
    timerSet()
    // Update UI.
    swd.$rclBtn.prop('disabled', false)
    swd.$rclBtn.html(params.label_reset)
    swd.$srsBtn.html(params.resume ? params.label_resume : params.label_start)
    swd.$srsBtn.removeClass('stopwatch-em-running')
    swd.$srsBtn.prop('disabled', params.resume == false)
    updateDisplay(swd)
    updateHourglass(swd)
    log('Stopwatch [' + swd.id + '] has been stopped at ' + swd.stopTime.toLocaleTimeString() + '. Elapsed: ' + format(swd.elapsed, swd).display)
}

/**
 * Resets the timer.
 * @param {StopwatchData} swd 
 */
function reset(swd) {
    // Reset.
    swd.elapsed = -1
    swd.initial = true
    swd.startTime = null
    swd.stopTime = null
    swd.lapStartTime = null
    swd.lapStopTime = null
    swd.currentLap = null
    swd.laps = []
    swd.captures = []
    swd.running = false
    // UI updates.
    swd.$srsBtn.prop('disabled', false)
    swd.$rclBtn.prop('disabled', true)
    swd.$srsBtn.html(swd.params.label_start)
    var val = swd.$input.val().toString()
    if (val != '' && !MDC.includes(val)) {
        swd.$input.val('')
        swd.$input.trigger('change')
        swd.$input.trigger('blur')
    }
    swd.$tbody.children().remove()
    swd.$thead.hide()
    timerSet()
    updateDisplay(swd)
    updateHourglass(swd)
    log('Stopwatch [' + swd.id + '] has been reset.')
}

/**
 * Sets the stopwatch to a value.
 * @param {StopwatchData} swd 
 * @param {ParseResult} result
 */
function set(swd, result) {
    if (result.elapsed < 0) {
        reset(swd)
    }
    else {
        var params = swd.params
        swd.running = false
        swd.elapsed = result.elapsed
        swd.captures = result.captures
        swd.laps = result.laps
        // Update rows.
        swd.$tbody.children().remove()
        swd.$stopwatch.find('.stopwatch-em-row-header').hide()
        if (swd.laps.length) {
            swd.laps.forEach(function(lap, idx) {
                swd.currentLap = lap
                addLapRow(swd, idx + 1)
            })
        }
        else if (swd.captures.length) {
            swd.captures.forEach(function(capture, idx) {
                addCaptureRow(swd, capture, idx + 1)
            })
        }
        // Update displayed time so there is no discrepancy.
        timerSet()
        // Update UI.
        swd.$rclBtn.html(params.label_reset)
        swd.$rclBtn.prop('disabled', swd.elapsed < 0 || params.only_once)
        swd.$srsBtn.html(params.label_start)
        if (swd.elapsed > -1 && params.resume && !swd.initial) {
            swd.$srsBtn.html(params.label_resume)
        }
        swd.$srsBtn.prop('disabled', swd.elapsed > -1 && (swd.params.resume == false || swd.initial))
        swd.$srsBtn.removeClass('stopwatch-em-running')
        updateDisplay(swd)
        updateHourglass(swd)
        log('Stopwatch [' + swd.id + '] has been set to ' + format(swd.elapsed, swd).display)
    }
    if (result.val != '' && MDC.includes(result.val)) {
        swd.$srsBtn.prop('disabled', true)
        swd.$rclBtn.prop('disabled', true)
    }
    hideTarget(swd)
}

//#endregion

//#region Formatting and Parsing ---------------------------------------------------------

/**
 * Left-pads a number with zeros.
 * @param {any} v 
 * @param {number} digits 
 * @param {string} fill
 */
function lpad(v, digits, fill) {
    if (typeof fill == 'undefined') fill = '0'
    var s = '' + v
    if (s.length < digits) {
        s = fill.repeat(digits) + s
        return s.substr(s.length - digits)
    }
    return s
}

/**
 * Right-pads a number with zeros.
 * @param {any} v 
 * @param {number} digits 
 * @param {string} fill
 */
function rpad(v, digits, fill) {
    if (typeof fill == 'undefined') fill = '0'
    var s = v + fill.repeat(digits)
    return s.substr(0, digits)
}


/**
 * Formats a time value (in ms)
 * @param {number} time_ms 
 * @param {StopwatchData} swd
 * @return {FormattedTime}
 */
function format(time_ms, swd) {
    var params = swd.params
    /** @type {FormattedTime} */
    var rv = {
        time_ms: time_ms,
        S: params.unset_display_symbol,
        F: params.unset_display_symbol,
        h: lpad(params.unset_display_symbol, params.h_digits, params.unset_display_symbol),
        m: lpad(params.unset_display_symbol, params.m_digits, params.unset_display_symbol),
        s: lpad(params.unset_display_symbol, params.s_digits, params.unset_display_symbol),
        f: rpad(params.unset_display_symbol, params.digits, params.unset_display_symbol),
        d: params.decimal_separator,
        g: params.group_separator
    }
    if (time_ms >= 0) {
        var S, F, h, m, s, ms, ms_rounded, f, rest
        F = time_ms
        rest = F
        h = 0
        if (!params.no_hours) {
            h = Math.floor(time_ms / 3600000) // 60 * 60 * 1000
            rest = rest - h * 3600000
        }
        m = 0
        if (!params.no_minutes) {
            m = Math.floor(rest / 60000) // 60 * 1000
            rest = rest - m * 60000
        }
        s = Math.floor(rest / 1000)
        ms = rest - s * 1000
        ms_rounded = (ms / 1000).toFixed(params.digits).substr(2)
        f = rpad(ms_rounded, params.digits, '0')
        // Add ms to s in case of rounding to 0 digits.
        if (params.digits == 0) {
            s = Math.round(s + ms / 1000)
            if (s == 60) { s = 0; m = m + 1; }
            if (m == 60) { m = 0; h = h + 1; }
        }
        S = (h * 3600 + m * 60 + s).toString()
        if (params.digits > 0) S = S + params.decimal_separator + f.toString()
        rv.S = S 
        rv.F = F.toString()
        rv.h = lpad(h, params.h_digits, '0')
        rv.m = lpad(m, params.m_digits, '0')
        rv.s = lpad(s, params.s_digits, '0')
        rv.f = f
        rv.display = formatValue(swd.running ? params.display_running : params.display_format, rv)
    }
    else {
        rv.display = formatValue(params.display_empty !== null ? 
            params.display_empty : params.display_format, rv)
    }
    // Always use two digits for m and s for storage.
    rv.m = lpad(rv.m, 2, '0')
    rv.s = lpad(rv.s, 2, '0')
    rv.store = formatValue(params.store_format, rv)
    return rv
}

/**
 * Formats an elapsed time.
 * @param {string} f 
 * @param {FormattedTime} t 
 */
function formatValue(f, t) {
    var r = []
    var known = 'SFhmsfdg'
    var esc = '/'
    var escaped = false
    for (var i = 0; i < f.length; i++) {
        var c = f[i]
        if (c == esc && !escaped) {
            escaped = true
        } 
        else if (escaped) {
            r.push(known.includes(c) ? t[c] : c)
            escaped = false
        } else {
            r.push(c)
        }
    }
    return r.join('')
}

/**
 * Reads a elapsed time based on a storage format.
 * @param {StopwatchData} swd
 * @param {string} val The value to parse
 * @return {ParseResult} Elapsed time
 */
function parseValue(swd, val) {
    var params = swd.params
    var rv = {
            val: val,
            elapsed: -1,
            laps: [],
            captures: []
    }
    // Empty or Missing Data Code?
    if (val == '' || MDC.includes(val)) {
        return rv
    }
    var f = params.store_format
    try {
        // Common storage formats.
        if (f == '/F') return {
            val: val,
            elapsed: parseInt(val),
            laps: [],
            captures: []
        }
        if (f == '/S') {
            rv.elapsed = parseFloat(val.replace(params.decimal_separator, '.')) * 1000
            return rv
        }
        if (f == '/m/g/s') {
            var m_s = val.split(params.group_separator)
            var m = parseInt(m_s[0]) * 60000
            var s = parseInt(m_s[1]) * 1000
            rv.elapsed = m + s
            return rv
        }
        if (params.mode == 'basic') {
            // Need to parse. This is quite limited in capability. It relies on non-digit-separators being present between any digit groups.
            var data = {
                h: '',
                m: '',
                s: '',
                f: ''
            }
            var known = 'hmsf'
            var digits = '0123456789'
            var esc = '/'
            var escaped = false
            var pos = 0 // Position in val
                for (var i = 0; i < f.length; i++) {
                var c = f[i]
                if (c == esc && !escaped) {
                    escaped = true
                } 
                else if (escaped) {
                    if (known.includes(c)) {
                        var num = ''
                        do {
                            var val_c = val.substr(pos, 1)
                            if (digits.includes(val_c)) {
                                num = num + val_c
                                pos++
                            }
                            else break
                        } while (pos < val.length)
                        data[c] = num
                    }
                    escaped = false
                } else {
                    pos++
                }
            }
            data.f = rpad(data.f.substr(0, 3), 3, '0')
            rv.elapsed = parseInt(data.h) * 3600000 + parseInt(data.m) * 60000 + parseInt(data.s) * 1000 + parseInt(data.f)
            return rv
        }
        else if (params.mode == 'capture') {
            var restore
            if (f == "json") {
                restore = JSON.parse(val)
            }
            else if (f == 'repeating') {
                restore = params.repeating_captures
            }
            if (Array.isArray(restore)) {
                for (var i = 0; i < restore.length; i++) {
                    /** @type {CaptureInfo} */
                    var capture = {
                        start: new Date(restore[i]['start']),
                        stop: new Date(restore[i]['stop']),
                        elapsed: parseInt(restore[i]['elapsed']),
                        is_stop: restore[i]['is_stop']
                    }
                    rv.captures.push(capture)
                }
                rv.elapsed = rv.captures[rv.captures.length - 1].elapsed
                return rv
            }
        }
        else if (params.mode == 'lap') {
            var restore
            if (f == "json") {
                restore = JSON.parse(val)
            }
            else if (f == 'repeating') {
                restore = params.repeating_laps
            }
            if (Array.isArray(restore)) {
                var sum = 0
                for (var i = 0; i < restore.length; i++) {
                    var elapsed = parseInt(restore[i]['elapsed'])
                    sum += elapsed
                    /** @type {LapInfo} */
                    var lap = {
                        start: new Date(restore[i]['start']),
                        stop: new Date(restore[i]['stop']),
                        elapsed: elapsed,
                        cumulated: sum,
                        num_stops: parseInt(restore[i]['num_stops'])
                    }
                    rv.laps.push(lap)
                }
                rv.elapsed = sum
                return rv
            }
        }
    }
    catch (ex) {
        log('Stopwatch [' + swd.id + '] - Failed to parse stored value: ' + val)
    }
    return rv
}

//#endregion

// Setup @STOPWATCH instances when the page is ready.
$(function() { setup() })

})();