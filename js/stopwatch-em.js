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
        var $label = $('#label-' + field + ' td:first()')
        log('Adding Stopwatch to \'' + field + '\'', $label)
        var $sw = create(field, params)
        $label.append($sw)
    })
}

/**
 * Create HTML for a Stopwatch.
 * @param {string} field 
 * @param {StopwatchParams} params 
 * @returns {JQuery}
 */
function create(field, params) {
    var $html = $('<div>Stopwatch</div>')

    return $html
}




// Setup stopwatches when the page is ready.
$(function() {
    setup();
})

})();