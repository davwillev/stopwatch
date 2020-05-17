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
 * }}
 */

/**
 * @typedef StopwatchParams
 * @type {{
 *  elapsed: string
 *  decimal?: string
 *  digits: number
 *  error?: string
 * }}
 */

/**
 * @typedef StopwatchData
 * @type {{
 *  id: string
 *  $display: JQuery
 *  params: StopwatchParams
 *  running: boolean
 *  elapsed: number
 *  laps: LapInfo[]
 *  clocktimer?: number
 *  startTime?: Date
 *  stopTime?: Date
 *  lapStartTime?: Date
 *  lapStopTime?: Date
 * }}
 */

/**
 * @typedef LapInfo
 * @type {{
 *  lapStartTime: Date
 *  lapStopTime: Date
 *  elapsed: number
 *  isStop: boolean
 * }}
 */

/**
 * @typedef FormattedTime
 * @type {{
 *  time_ms: number
 *  time_s: number
 *  h: string
 *  m: string
 *  s: string
 *  ms: string
 *  ms_digits: number
 *  ms_decimal : string
 *  string: string
 *  mm_ss: string
 * }}
 */
