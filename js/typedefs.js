// JavaScript Type Definitions for Stopwatch EM

/**
 * @typedef ExternalModules
 * @type {{
 *  StopwatchEM_DTO?: StopwatchDTO
 * }}
 */

/**
 * @typedef StopwatchDTO
 * @type {{
 *  fields: Object<string, StopwatchParams>
 *  debug: boolean
 *  survey: boolean
 * }}
 */

/**
 * @typedef CaptureMapping
 * @type {{
 *  elapsed: string
 *  start: string
 *  stop: string
 * }}
 */

/**
 * @typedef LapMapping
 * @type {{
 *  elapsed: string
 *  start: string
 *  stop: string
 *  num_stops: string
 * }}
 */

/**
 * @typedef Plain
 * @type {{
 *  items: string[]
 *  delimiter: string
 *  header: boolean
 *  start: string
 *  stop: string
 *  num_stops: string
 *  elapsed: string
 * }}
 */

/**
 * @typedef StopwatchParams
 * @type {{
 *  mode: string
 *  label_start: string
 *  label_resume: string
 *  label_stop: string
 *  label_reset: string
 *  label_lap: string
 *  label_capture: string
 *  label_elapsed: string
 *  label_cumulated: string
 *  is_mm_ss : boolean
 *  resume: boolean
 *  target: string
 *  show_target: boolean
 *  show_target_survey: boolean
 *  only_once?: boolean|string
 *  decimal_separator: string
 *  group_separator: string
 *  unset_display_symbol : string
 *  digits: number
 *  h_digits: number
 *  m_digits: number
 *  s_digits: number
 *  no_hours: boolean
 *  no_minutes: boolean
 *  display_format: string
 *  display_running: string
 *  display_empty: string
 *  store_format: string
 *  max_rows: number
 *  cumulated: boolean
 *  repeating_laps: LapInfo[]
 *  repeating_captures: CaptureInfo[]
 *  error: string
 *  at_top: boolean
 * }}
 */

/**
 * @typedef StopwatchData
 * @type {{
 *  id: string
 *  initial: boolean
 *  $stopwatch: JQuery
 *  $srsBtn?: JQuery
 *  $rclBtn?: JQuery
 *  $display: JQuery
 *  $hourglass: JQuery
 *  $input: JQuery
 *  $json: JQuery
 *  $thead: JQuery
 *  $tbody: JQuery
 *  currentLap: LapInfo
 *  $currentLapValue: JQuery
 *  $currentLapStops: JQuery
 *  $currentLapCumulated: JQuery
 *  params: StopwatchParams
 *  running: boolean
 *  elapsed: number
 *  laps: LapInfo[]
 *  captures: CaptureInfo[]
 *  startTime: Date
 *  stopTime: Date
 *  lapStartTime?: Date
 *  lapStopTime?: Date
 * }}
 */

/**
 * @typedef ParseResult
 * @type {{
 *  val: string
 *  elapsed: Number
 *  laps: LapInfo[]
 *  captures: CaptureInfo[]
 * }}
 */


/**
 * @typedef LapInfo
 * @type {{
 *  index: number
 *  start: Date
 *  stop: Date
 *  elapsed: number
 *  cumulated: number
 *  num_stops: number
 * }}
 */

/**
 * @typedef CaptureInfo
 * @type {{
 *  index: number
 *  start: Date
 *  stop: Date
 *  elapsed: number
 *  is_stop: boolean
 * }}
 */

/**
 * @typedef FormattedTime
 * @type {{
 *  time_ms: number
 *  S: string
 *  F: string
 *  h: string
 *  m: string
 *  s: string
 *  f: string
 *  d: string
 *  g: string
 *  display?: string
 *  store?: string
 * }}
 */
