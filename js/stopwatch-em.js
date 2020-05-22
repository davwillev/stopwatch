// @ts-check
//
// Stopwatch External Module
//
;(function() {
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

//#region Globals --------------------------------------------------------------------------

/** @type {Object<string, StopwatchData>} Holds data for each stopwatch widget (there can be multiple) */
var SWD = {}
/** @type {number} The interval (in ms) at which the stopwatch display is refreshed */
var TICKINTERVAL = 5
/** @type {number} The timer handle */
var CLOCK
/** @type {boolean} Indicates whether the clock is currently ticking */
var TICKING = false

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
    log('Stopwatch EM - Setup', DTO)
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
    log('Failed to add Stopwatch to \'' + id + '\': ' + error)
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
        $display: $display,
        $hourglass: $hourglass,
        $input: $input,
        $json: null,
        $table: $sw.find('.stopwatch-em-table'),
        currentLap: null,
        $currentLapValue: null,
        $currentLapStops: null,
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
    $input.on('change', function() {
        // Set stopwatch to value (forcing stop when running).
        var val = $input.val().toString()
        var elapsed = parseValue(swd, val)
        set(swd, elapsed)
    })
    // Determine insertion point.
    var $insertionPoint = $tr.find('td.data')
    if ($insertionPoint.length == 0) {
        $insertionPoint = $tr.find('div.space')
    }
    if ($insertionPoint.length == 0) {
        $insertionPoint = $tr.find('td.labelrc').last()
    }
    $insertionPoint.prepend($sw)
    if (params.hide_target) {
        $input.hide()
    }
    // Set initial value and update UI.
    var val = $input.val().toString()
    var elapsed = parseValue(swd, val)
    set(swd, elapsed)
    log('Added Stopwatch to \'' + id + '\'', $insertionPoint)
}

/**
 * Gets a template by name.
 * @param {string} name The name of the template (i.e. value of the data-emc attribute).
 * @returns {JQuery} The jQuery representation of the template's content.
 */
function getTemplate(name) {
    // @ts-ignore
    return $('[data-stopwatch-em-template=' + name + ']').first().children().first().clone()
}

/**
 * Updates the stopwatch display.
 * @param {StopwatchData} swd 
 */
function updateDisplay(swd) {
    var totalElapsed = getTotalElapsed(swd)
    var totalText = format(totalElapsed, swd.params).display
    swd.$display.text(totalText)
    if (swd.params.mode == 'lap' && swd.currentLap) {
        var lapElapsed = getLapElapsed(swd)
        var lapText = format(lapElapsed, swd.params).display
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
        var elapsed = parseValue(swd, val)
        set(swd, elapsed)
    }
    else {
        swd.$input.val(format(swd.elapsed, swd.params).store)
        // Trigger change so that REDCap will do branching etc.
        swd.$input.trigger('change')
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
    }
    else if (params.store_format == 'repeating') {
        var json = JSON.stringify(swd.captures)
        swd.$json.val(json)
    }
    else if (params.store_format == 'plain') {
        log('Plain text caputres not implemented yet')
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
    }
    else if (params.store_format == 'repeating') {
        var json = JSON.stringify(swd.laps)
        swd.$json.val(json)
    }
    else if (params.store_format == 'plain') {
        log('Plain text laps not implemented yet')
    }
}

/**
 * Inserts a row into the captures table.
 * @param {StopwatchData} swd 
 * @param {CaptureInfo} capture 
 */
function addCaptureRow(swd, capture) {
    var $row = getTemplate('stopwatch-row')
    var $label = $row.find('.stopwatch-em-rowlabel')
    var $stop = $row.find('.stopwatch-em-rowstop')
    var $value = $row.find('.stopwatch-em-rowvalue')
    $label.text('Capture ' + swd.captures.length)
    $value.text(format(capture.elapsed, swd.params).display)
    $stop.html(getStopSymbol(capture.isStop))
    swd.$table.prepend($row)
    if (swd.params.max_rows > 0 && swd.captures.length > swd.params.max_rows) {
        swd.$table.children().last().remove()
    }
}

/**
 * Inserts a row into the laps table.
 * @param {StopwatchData} swd 
 */
function addLapRow(swd) {
    var $row = getTemplate('stopwatch-row')
    var $label = $row.find('.stopwatch-em-rowlabel')
    var $stop = $row.find('.stopwatch-em-rowstop')
    var $value = $row.find('.stopwatch-em-rowvalue')
    $label.text('Lap ' + swd.laps.length)
    $value.text(format(swd.currentLap.elapsed, swd.params).display)
    $stop.html(getStopSymbol(swd.currentLap.num_stops > 0))
    swd.$table.prepend($row)
    if (swd.params.max_rows > 0 && swd.laps.length > swd.params.max_rows) {
        swd.$table.children().last().remove()
    }
    swd.$currentLapValue = $value
    swd.$currentLapStops = $stop
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
        swd.$srsBtn.text(params.label_stop)
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
        swd.$rclBtn.text(params.label_capture)
        swd.$srsBtn.text(params.label_stop)
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
        swd.$rclBtn.text(params.label_lap)
        swd.$srsBtn.text(params.label_stop)
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
        stop: swd.stopTime,
        elapsed: swd.elapsed,
        isStop: stopped
    }
    swd.captures.push(capture)
    swd.lapStartTime = now
    addCaptureRow(swd, capture)
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
            swd.$currentLapValue.html(format(swd.currentLap.elapsed, swd.params).display)
        }
        swd.lapStartTime = now
        // Add a new lap.
        /** @type {LapInfo} */
        swd.currentLap = {
            start: now,
            stop: null,
            elapsed: 0,
            num_stops: 0
        }
        swd.laps.push(swd.currentLap)
        addLapRow(swd)
    }
    else {
        swd.currentLap.stop = now
        swd.currentLap.elapsed += elapsed
        swd.$currentLapValue.html(format(elapsed, swd.params).display)
        swd.$currentLapStops.html(getStopSymbol(true))
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
    swd.$rclBtn.text(params.label_reset)
    swd.$srsBtn.text(params.stops ? params.label_resume : params.label_start)
    swd.$srsBtn.removeClass('stopwatch-em-running')
    swd.$srsBtn.prop('disabled', params.stops == false)
    updateDisplay(swd)
    updateHourglass(swd)
    log('Stopwatch [' + swd.id + '] has been stopped at ' + now.toLocaleTimeString() + '. Elapsed: ' + format(elapsed, params).display)
}

/**
 * Resets the timer.
 * @param {StopwatchData} swd 
 */
function reset(swd) {
    // Reset.
    swd.elapsed = -1
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
    swd.$srsBtn.text(swd.params.label_start)
    swd.$input.val('')
    swd.$table.children().remove()
    timerSet()
    updateDisplay(swd)
    updateHourglass(swd)
    log('Stopwatch [' + swd.id + '] has been reset.')
}

/**
 * Sets the stopwatch to a value.
 * @param {StopwatchData} swd 
 * @param {number} elapsed
 */
function set(swd, elapsed) {
    var params = swd.params
    swd.running = false
    swd.elapsed = elapsed
    // Update displayed time so there is no discrepancy.
    timerSet()
    // Update UI.
    swd.$rclBtn.text(params.label_reset)
    swd.$rclBtn.prop('disabled', elapsed < 0)
    swd.$srsBtn.text(params.label_start)
    if (elapsed > -1 && params.stops && !swd.initial) {
        swd.$srsBtn.text(params.label_resume)
    }
    swd.$srsBtn.prop('disabled', elapsed > -1 && (swd.params.stops == false || swd.initial))
    swd.$srsBtn.removeClass('stopwatch-em-running')
    updateDisplay(swd)
    updateHourglass(swd)
    swd.initial = false
    log('Stopwatch [' + swd.id + '] has been set to ' + format(elapsed, swd.params).display)
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
 * @param {StopwatchParams} params
 * @return {FormattedTime}
 */
function format(time_ms, params) {
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
    }
    rv.display = formatValue(params.display_format, rv)
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
 * @return {number} Elapsed time
 */
function parseValue(swd, val) {
    var params = swd.params
    // Empty.
    if (val == '') return -1
    var f = params.store_format
    try {
        // Common storage formats.
        if (f == '/F') return parseInt(val)
        if (f == '/S') return parseFloat(val.replace(params.decimal_separator, '.')) * 1000
        if (f == '/m/g/s') {
            var m_s = val.split(params.group_separator)
            var m = parseInt(m_s[0]) * 60000
            var s = parseInt(m_s[1]) * 1000
            return m + s
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
            var elapsed = parseInt(data.h) * 3600000 + parseInt(data.m) * 60000 + parseInt(data.s) * 1000 + parseInt(data.f)
            return elapsed
        }
        else if (params.mode == 'capture') {
            if (f == "json") {
                var json = JSON.parse(val)
                if (Array.isArray(json)) {
                    for (var i = 0; i < json.length; i++) {
                        /** @type {CaptureInfo} */
                        var capture = {
                            start: new Date(json[i]['start']),
                            stop: new Date(json[i]['stop']),
                            elapsed: parseInt(json[i]['elapsed']),
                            isStop: json[i]['isStop']
                        }
                        swd.captures.push(capture)
                        addCaptureRow(swd, capture)
                    }
                }
                return swd.captures[swd.captures.length - 1].elapsed
            }
        }
        else if (params.mode == 'lap') {
            if (f == "json") {
                var json = JSON.parse(val)
                var sum = 0
                if (Array.isArray(json)) {
                    for (var i = 0; i < json.length; i++) {
                        /** @type {LapInfo} */
                        var lap = {
                            start: new Date(json[i]['start']),
                            stop: new Date(json[i]['stop']),
                            elapsed: parseInt(json[i]['elapsed']),
                            num_stops: parseInt(json[i]['num_stops'])
                        }
                        swd.laps.push(lap)
                        swd.currentLap = lap
                        addLapRow(swd)
                        sum += lap.elapsed
                    }
                }
                return sum
            }
        }
    }
    catch (ex) {
        log('Stopwatch - Failed to parse stored value: ' + val)
    }
    return -1
}

//#endregion

// Setup stopwatches when the page is ready.
$(function() {
    setup();
})

})();