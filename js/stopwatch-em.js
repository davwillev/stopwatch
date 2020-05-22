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
        params: params,
        elapsed: 0,
        running: false,
        laps: [],
        captures: []
    }
    SWD[id] = swd
    // Buttons.
    swd.$srsBtn = $sw.find('.stopwatch-em-startstop')
    swd.$rclBtn = $sw.find('.stopwatch-em-reset')
    // Reset / Capture / Lap.
    swd.$rclBtn.attr('data-stopwatch-em-id', id)
    swd.$rclBtn.on('click', function(e) {
        e.preventDefault()
        reset(swd)
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
    swd.$rclBtn.on('click', function(e) {
        e.preventDefault()
        reset(swd)
    })
    // Hookup change event.
    $input.on('change', function() {
        // Set stopwatch to value (forcing stop when running).
        var val = $input.val().toString()
        var elapsed = parseValue(params, val)
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
    var elapsed = parseValue(params, val)
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
    return $('div[data-stopwatch-em=' + name + ']').first().children().first().clone()
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
        var elapsed = parseValue(swd.params, val)
        set(swd, elapsed)
    }
    else {
        swd.$input.val(format(swd.elapsed, swd.params).store)
        // Trigger change so that REDCap will do branching etc.
        swd.$input.trigger('change')
    }
}


/**
 * Updates the stopwatch display.
 * @param {StopwatchData} swd 
 */
function updateElapsed(swd) {
    var elapsed = getElapsed(swd)
    var text = format(elapsed, swd.params).display
    swd.$display.text(text)
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

//#endregion

//#region Clock functionality --------------------------------------------------------------

/**
 * Calculates the time (in ms) elapsed since the last start of the stopwatch.
 * @param {StopwatchData} swd 
 */
function getElapsed(swd) {
    if (swd.running) {
        var now = new Date()
        return swd.elapsed + (now.getTime() - swd.lapStartTime.getTime())
    }
    return swd.elapsed
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
            updateElapsed(swd)
        }
    })
}

/**
 * Start a stopwatch.
 * @param {StopwatchData} swd 
 */
function start(swd) {
    var now = new Date()
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
    else if (params.mode.startsWith('capture')) {
        log('Stopwatch EM: Capture mode not implemented yet.')
    }
    else if (params.mode.startsWith('lap')) {
        log('Stopwatch EM: Laps mode not implemented yet.')
    }
    // Update UI.
    updateHourglass(swd)
    timerSet()
    log('Stopwatch [' + swd.id + '] has been started at ' + now.toLocaleTimeString() + '.')
}

/**
 * Stops the timer.
 * @param {StopwatchData} swd 
 */
function stop(swd) {
    var now = new Date()
    var params = swd.params
    if (params.mode == 'basic') {
        swd.running = false
        swd.lapStopTime = now
        swd.stopTime = now
        var elapsed = now.getTime() - swd.lapStartTime.getTime()
        swd.elapsed = swd.elapsed < 0 ? elapsed : swd.elapsed + elapsed
        insertElapsed(swd)
    }
    else if (params.mode.startsWith('capture')) {
        log('Stopwatch EM: Capture mode not implemented yet.')
    }
    else if (params.mode.startsWith('lap')) {
        log('Stopwatch EM: Lap mode not implemented yet.')
        // sw.laps.push({
        //     lapStartTime: sw.lapStartTime,
        //     lapStopTime: now,
        //     elapsed: elapsed,
        //     isStop: true
        // })
    }
    // Update displayed time so there is no discrepancy.
    timerSet()
    // Update UI.
    swd.$rclBtn.prop('disabled', false)
    swd.$srsBtn.text(params.stops ? params.label_resume : params.label_start)
    swd.$srsBtn.removeClass('stopwatch-em-running')
    swd.$srsBtn.prop('disabled', params.stops == false)
    updateElapsed(swd)
    updateHourglass(swd)
    log('Stopwatch [' + swd.id + '] has been stopped at ' + now.toLocaleTimeString() + '. Elapsed: ' + format(elapsed, params).display)
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
    swd.laps = []
    swd.captures = []
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
    updateElapsed(swd)
    updateHourglass(swd)
    swd.initial = false
    log('Stopwatch [' + swd.id + '] has been set to ' + format(elapsed, swd.params).display)
}

/**
 * Resets the timer.
 * @param {StopwatchData} swd 
 */
function reset(swd) {
    if (swd.running) return
    // Reset.
    swd.elapsed = -1
    swd.startTime = null
    swd.stopTime = null
    swd.lapStartTime = null
    swd.lapStopTime = null
    swd.laps = []
    swd.captures = []
    swd.running = false
    timerSet()
    // UI updates.
    swd.$srsBtn.prop('disabled', false)
    swd.$rclBtn.prop('disabled', true)
    swd.$srsBtn.text(swd.params.label_start)

    swd.$input.val('')
    updateElapsed(swd)
    updateHourglass(swd)
    log('Stopwatch [' + swd.id + '] has been reset.')
}

//#endregion

//#region Formatting -----------------------------------------------------------------------

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
 * @param {StopwatchParams} params
 * @param {string} val The value to parse
 * @return {number} Elapsed time
 */
function parseValue(params, val) {
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