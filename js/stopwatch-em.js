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
            var $input = $('input[name="' + params.elapsed + '"]')
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
 * Create HTML for a Stopwatch.
 * TODO: This will have to be adapted to work with various modes.
 * @param {string} id 
 * @param {StopwatchParams} params 
 * @param {JQuery} $tr
 * @param {JQuery} $input
 */
function create(id, params, $tr, $input) {
    // Determine decimal char and digits (for time_mm_ss).
    var fv = $input.attr('fv')
    params.decimal = (fv.includes('number') && fv.includes('comma')) ? ',' : '.'
    if (fv == 'time_mm_ss') params.digits = 0
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
    $reset.prop('disabled', elapsed == 0)
    $reset.on('click', function(e) {
        e.preventDefault()
        reset(id)
        return false
    })
    var $startStop = $sw.find('.stopwatch-em-startstop')
    $startStop.attr('data-stopwatch-em-id', id)
    $startStop.prop('disabled', elapsed > 0)
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
    var fv = $input.attr('fv')
    if (fv == 'integer') {
        $input.val(sw.elapsed)
    }
    else if (fv.startsWith('number')) {
        var elapsed = format(sw.elapsed, sw.params)
        var val = elapsed.time_s + (elapsed.ms_digits > 0 ? elapsed.ms_decimal + elapsed.ms : '')
        $input.val(val)
    }
    else if (fv == 'time_mm_ss') {
        var elapsed = format(sw.elapsed, sw.params)
        $input.val(elapsed.mm_ss)
    }
    // Trigger change so that REDCap will do branching etc.
    $input.trigger('change')
}


/**
 * Gets a time value from a target field and calculates the elapsed time.
 * @param {StopwatchParams} params 
 * @param {JQuery} $input 
 * @returns {number} The elapsed time in ms.
 */
function calculateElapsed(params, $input) {
    var val = $input.val().toString()
    if (val == '') return 0
    var fv = $input.attr('fv')
    if (fv == 'integer') {
        return parseInt(val)
    }
    else if (fv.startsWith('number')) {
        return Math.round(parseFloat(val.split(params.decimal).join('.')) * 1000)
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
    var text = format(elapsed, sw.params).string
    sw.$display.text(text)
}

/**
 * Updates the hourglass display.
 * @param {string} id 
 */
function updateHourglass(id) {
    var sw = SWD[id]
    sw.$hourglass.removeClass(['fa-hourglass-start', 'fa-hourglass-half', 'fa-hourglass-end'])
    var hourglass = 'fa-hourglass-' + (sw.running ? 'half' : (sw.elapsed > 1 ? 'end' : 'start'))
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
    log('Stopwatch [' + id + '] has been stopped at ' + now.toLocaleTimeString() + '. Elapsed: ' + format(elapsed, sw.params).string )
}

/**
 * Resets the timer.
 * @param {string} id 
 */
function reset(id) {
    var sw = SWD[id]
    if (sw.running) return
    // Reset.
    sw.elapsed = 0
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
 * @param {number} num 
 * @param {number} digits 
 */
function pad(num, digits) {
    var s = '0'.repeat(digits) + num
    return s.substr(s.length - digits)
}

/**
 * Formats a time value (in ms) as a string of the format 'hours:mm:ss.nnn'
 * @param {number} time_ms 
 * @param {StopwatchParams} params
 * @return {FormattedTime}
 */
function format(time_ms, params) {
    var ms_digits = params.digits
    var ms_decimal = params.decimal
    ms_digits = Math.max(0, Math.min(3, ms_digits))
    var h = Math.floor(time_ms / 3600000) // 60 * 60 * 1000
    var rest = time_ms - h * 3600000
    var m = Math.floor(rest / 60000) // 60 * 1000
    rest -= m * 60000
    var s = Math.floor(rest / 1000)
    var ms = rest - s * 1000
    ms = Math.round(ms / Math.pow(10, 3 - ms_digits))
    // Add ms to s in case of rounding to 0 digits.
    s = ms_digits == 0 ? s + ms : s
    var formatted = [h, pad(m, 2), pad(s, 2)].join(':') + (ms_digits > 0 ? ms_decimal + pad(ms, ms_digits) : '')
    var mm_ss = m < 60 ? [pad(m, 2), pad(s, 2)].join(':') : '' // Max is 59:59
    return {
        time_ms: time_ms,
        time_s: Math.floor(time_ms / 1000),
        h: h.toString(),
        m: m.toString(),
        s: s.toString(),
        ms: ms_digits == 0 ? '' : ms.toString(),
        ms_digits: ms_digits,
        ms_decimal: ms_decimal,
        string: formatted,
        mm_ss: mm_ss
    }
}




// Setup stopwatches when the page is ready.
$(function() {
    setup();
})

})();