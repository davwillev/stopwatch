// @ts-check

// Stopwatch External Module
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

/** @type {Object<string, StopwatchData>} Holds data for each stopwatch widget (there can be multiple) */
var SWD = {}
/** @type {number} The interval (in ms) at which the stopwatch display is refreshed */
var TIMERINTERVAL = 5

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
                try {
                    console.log(...arguments);
                }
                catch {
                    console.log(arguments);
                }
        }
    }
}

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
                if (params.mode == 'basic') {
                    createBasic(field, params, $tr, $input)
                }
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
    var $error = $('<span></span>').addClass('stopwatch-em-error').text(error)
    // Determine insertion point.
    var $insertionPoint = $tr.find('td.data')
    if ($insertionPoint.length == 0) {
        $insertionPoint = $tr.find('div.space')
    }
    $insertionPoint.prepend($error)
    log('Failed to add Stopwatch to \'' + id + '\': ' + error)
}

/**
 * Create HTML for a basic Stopwatch.
 * TODO: This will have to be adapted to work with various modes.
 * @param {string} id 
 * @param {StopwatchParams} params 
 * @param {JQuery} $tr
 * @param {JQuery} $input
 */
function createBasic(id, params, $tr, $input) {
    // Is there a previously saved value?
    var val = $input.val()
    // Template.
    var $sw = getTemplate('basic')
    $sw.attr('data-stopwatch-em-id', id)
    // Display components.
    var $display = $sw.find('.stopwatch-em-timerdisplay')
    var $hourglass = $sw.find('.stopwatch-em-hourglass')
    // Init data structure and update display.
    var elapsed = calculateElapsed(params, $input)
    SWD[id] = {
        id: id,
        $display: $display,
        $hourglass: $hourglass,
        params: params,
        elapsed: elapsed,
        running: false,
        laps: []
    }
    updateElapsed(id)
    updateHourglass(id)
    // Buttons
    var $reset = $sw.find('.stopwatch-em-reset')
    $reset.attr('data-stopwatch-em-id', id)
    $reset.prop('disabled', elapsed < 0)
    $reset.on('click', function(e) {
        e.preventDefault()
        reset(id)
        return false
    })
    var $startStop = $sw.find('.stopwatch-em-startstop')
    $startStop.attr('data-stopwatch-em-id', id)
    $startStop.prop('disabled', elapsed > -1)
    $startStop.on('click', function(e) {
        e.preventDefault()
        if (SWD[id].running) {
            stop(id)
            $reset.prop('disabled', false)
            $startStop.text('Start')
            $startStop.removeClass('stopwatch-em-running')
            $startStop.prop('disabled', true)
            insertElapsed(SWD[id], $input)
        }
        else {
            $reset.prop('disabeld', true)
            $startStop.text('Stop')
            $startStop.addClass('stopwatch-em-running')
            start(id)
        }
    })
    $reset.on('click', function(e) {
        e.preventDefault()
        reset(id)
        $startStop.prop('disabled', false)
        $input.val('')
    })
    // Hookup change event.
    $input.on('change', function() {
        var elapsed = calculateElapsed(params, $input)
        // Set stopwatch to value (forcing stop if necessary) and update display.
        set(id, elapsed)
        $startStop.text('Start')
        $startStop.removeClass('stopwatch-em-running')
        $startStop.prop('disabled', elapsed > -1)
        $reset.prop('disabled', elapsed < 0)
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
    log('Added Stopwatch to \'' + id + '\'', $insertionPoint)
}

/**
 * Gets a template by name.
 * @param {string} name The name of the template (i.e. value of the data-emc attribute).
 * @returns {JQuery} The jQuery representation of the template's content.
 */
function getTemplate(name) {
    // @ts-ignore
    return $(document.querySelector('template[data-stopwatch-em=' + name + ']').content.firstElementChild.cloneNode(true))
}


/**
 * Inserts a time value into the target field.
 * @param {StopwatchData} sw 
 * @param {JQuery} $input 
 */
function insertElapsed(sw, $input) {
    // Hard time_mm_ss limit (59:59)?
    if (sw.params.is_mm_ss && sw.elapsed > 3599499) {
        // TODO: tt-fy, nicer alert
        alert('Elapsed times > 59:59 cannot be inserted! Reseting to stored value (or blank).')
        var elapsed = calculateElapsed(sw.params, $input)
        set(sw.id, elapsed)
    }
    else {
        $input.val(format(sw.elapsed, sw.params).store)
        // Trigger change so that REDCap will do branching etc.
        $input.trigger('change')
    }
}


/**
 * Gets a time value from a target field and calculates the elapsed time.
 * @param {StopwatchParams} params 
 * @param {JQuery} $input 
 * @returns {number} The elapsed time in ms.
 */
function calculateElapsed(params, $input) {
    var val = $input.val().toString()
    if (val == '') return -1
    var fv = $input.attr('fv')
    if (fv == 'integer') {
        return parseInt(val)
    }
    else if (fv.startsWith('number')) {
        return Math.round(parseFloat(val.split(params.decimal_separator).join('.')) * 1000)
    }
    else if (fv == 'time_mm_ss') {
        var m_s = val.split(':')
        var m = parseInt(m_s[0])
        var s = parseInt(m_s[1])
        return (m * 60 + s) * 1000
    }
}


/**
 * Calculates the time (in ms) elapsed since the last start of the stopwatch.
 * @param {string} id 
 */
function getElapsed(id) {
    var sw = SWD[id]
    if (sw.running) {
        var now = new Date()
        return sw.elapsed + (now.getTime() - sw.lapStartTime.getTime())
    }
    return sw.elapsed
}

/**
 * Updates the stopwatch display.
 * @param {string} id 
 */
function updateElapsed(id) {
    var sw = SWD[id]
    var elapsed = getElapsed(id)
    var text = format(elapsed, sw.params).display
    sw.$display.text(text)
}

/**
 * Updates the hourglass display.
 * @param {string} id 
 */
function updateHourglass(id) {
    var sw = SWD[id]
    sw.$hourglass.removeClass(['fa-hourglass-start', 'fa-hourglass-half', 'fa-hourglass-end'])
    var hourglass = 'fa-hourglass-' + (sw.running ? 'half' : (sw.elapsed > 0 ? 'end' : 'start'))
    sw.$hourglass.addClass(hourglass)
}



/**
 * Start or resume timer.
 * @param {string} id 
 */
function start(id) {
    var sw = SWD[id]
    var now = new Date()
    sw.lapStartTime = now
    if (!sw.running) {
        sw.startTime = now
        sw.running = true
        sw.clocktimer = setInterval(function() {
            updateElapsed(id)
        }, TIMERINTERVAL)
    }
    updateHourglass(id)
    log('Stopwatch [' + id + '] has been started at ' + now.toLocaleTimeString() + '.')
}

/**
 * Stops the timer.
 * @param {string} id 
 */
function stop(id) {
    var sw = SWD[id]
    var now = new Date()
    clearInterval(sw.clocktimer)
    sw.running = false
    sw.lapStopTime = now
    sw.stopTime = now
    var elapsed = now.getTime() - sw.lapStartTime.getTime()
    sw.elapsed = elapsed
    sw.laps.push({
        lapStartTime: sw.lapStartTime,
        lapStopTime: now,
        elapsed: elapsed,
        isStop: true
    })
    // Update displayed time so there is no discrepancy.
    updateElapsed(id)
    updateHourglass(id)
    log('Stopwatch [' + id + '] has been stopped at ' + now.toLocaleTimeString() + '. Elapsed: ' + format(elapsed, sw.params).display)
}

/**
 * Sets the stopwatch to a value.
 * @param {string} id 
 * @param {number} elapsed
 */
function set(id, elapsed) {
    var sw = SWD[id]
    if (sw.running) {
        clearInterval(sw.clocktimer)
        sw.running = false
    }
    sw.elapsed = elapsed
    sw.laps = []
    // Update displayed time so there is no discrepancy.
    updateElapsed(id)
    updateHourglass(id)
    log('Stopwatch [' + id + '] has been set to ' + format(elapsed, sw.params).display)
}



/**
 * Resets the timer.
 * @param {string} id 
 */
function reset(id) {
    var sw = SWD[id]
    if (sw.running) return
    // Reset.
    sw.elapsed = -1
    sw.startTime = null
    sw.stopTime = null
    sw.lapStartTime = null
    sw.lapStopTime = null
    sw.laps = []
    sw.running = false
    updateElapsed(id)
    updateHourglass(id)
    log('Stopwatch [' + id + '] has been reset.')
}

/**
 * Left-pads a number with zeros.
 * @param {any} v 
 * @param {number} digits 
 * @param {string} fill
 */
function lpad(v, digits, fill = '0') {
    var s = fill.repeat(digits) + v
    return s.substr(s.length - digits)
}

/**
 * Right-pads a number with zeros.
 * @param {any} v 
 * @param {number} digits 
 * @param {string} fill
 */
function rpad(v, digits, fill = '0') {
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
        h: params.unset_display_symbol,
        m: lpad(params.unset_display_symbol, 2, params.unset_display_symbol),
        s: lpad(params.unset_display_symbol, 2, params.unset_display_symbol),
        f: rpad(params.unset_display_symbol, params.digits, params.unset_display_symbol),
        d: params.decimal_separator,
        g: params.group_separator
    }
    if (time_ms >= 0) {
        var S, F, h, m, s, ms, ms_rounded, f, rest
        F = time_ms
        h = Math.floor(time_ms / 3600000) // 60 * 60 * 1000
        rest = time_ms - h * 3600000
        m = Math.floor(rest / 60000) // 60 * 1000
        rest -= m * 60000
        s = Math.floor(rest / 1000)
        ms = rest - s * 1000
        S = h * 3600 + m * 60 + s
        ms_rounded = (ms / 1000).toFixed(params.digits).substr(2)
        f = rpad(ms_rounded, params.digits)
        // Add ms to s in case of rounding to 0 digits.
        if (params.digits == 0) {
            s = Math.round(s + ms / 1000)
            if (s == 60) { s = 0; m = m + 1; }
            if (m == 60) { m = 0; h = h + 1; }
        }
        rv.S = S.toString() + params.decimal_separator + f.toString()
        rv.F = F.toString()
        rv.h = h.toString()
        rv.m = lpad(m, 2)
        rv.s = lpad(s, 2)
        rv.f = f
    }
    rv.display = params.display_format.split('').map(function(c) { return rv[c] }).join('')
    rv.store = params.store_format.split('').map(function(c) { return rv[c] }).join('')
    return rv
}


// Setup stopwatches when the page is ready.
$(function() {
    setup();
})

})();