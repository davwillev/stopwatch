# Stopwatch

A REDCap External Module that provides a stopwatch widget that can be integrated into data entry forms or surveys. Results (elapsed time, times started/stopped) can be captured in a number of ways.

## Installation

- Clone this repo into `<redcap-root>/modules/stopwatch_v<version-number>`, or
- Obtain this module from the Consortium REDCap Repo via the Control Center.
- Go to Control Center > Technical / Developer Tools > External Modules and enable this module.
- Enable the module for the projects that want to make use of it.

## Use

- To include a stopwatch on a form or survey, add the @STOPWATCH action tag to any field.
- The stopwatch widget is appended to this field's label.
- Multiple stopwatches can be used on the same form.
- But only one action tag can ever be used for each field.

## Configuration

- Configuration is done via action tag parameters.
- The format of the parameter string must be valid JSON (see [https://jsonlint.com/](https://jsonlint.com/)).
- The following parameters are supported. _All are optional._
  - `mode`: Mode can be one of the following:
    - `basic`: A simple stopwatch with start/stop and reset button. The elapsed time is recorded. This is the default.
    - `capture`: A stopwatch that can record multiple captures of the (until then) elapsed time (see below for details).
    - `lap`: A stopwatch that can record multiple laps (see below for details).
  - `target`: The field to store the elapsed time in.
  - `hide_target`: Boolean (`true`|`false`) that determines whether the target input should be hidden (default to `true`).
  - `data`: Sets the storage format for `capture` and `lap`
  - `stops`: Boolean (`true`|`false`) that determines whether stopping (and resuming) the timer is allowed (defaults to `false`).
  - `digits`: The precisison to show (0, 1, 2, or 3).
  - `h_digits`, `m_digits`, `s_digits`: The (minimal) number of digits to use for hours, minutes, seconds (when shorter, values will be padded with 0).
  - `no_hours`: Boolean (`true`|`false`). If set to `true`, minutes will be the largest unit counted.
  - `no_minutes`: Boolean (`true`|`false`). If set to `true`, seconds will be the largest unit counted. This will imply `no_hours` = `true`.
  - `decimal_separator`: The decimal separator which is inserted between seconds and fractional seconds. This will be overriden by certain target field types.
  - `group_separator`: The character(s) inserted between hours, minutes, seconds.
  - `unset_display_symbol`: The symbol to be used as digit replacement when no value has been set yet.
  - `display_format`: The format for display in the stopwatch widget.
- In case the `target` parameter is missing, the field the `@STOPWATCH` is on will be used, if compatible (see below).

### Additional configuration for capture and lap modes

- `store_format`: This can be one of the following:
  - `json`: Data is stored as a JSON string. `target` must be a _Text Box_ (without validation) or a _Notes Box_. This is the default store format.
  - `plain`: Data is stored in plain text. `target` must be a _Notes Box_. Additional configuration can be done in the `plain` object.
  - `repeating`: Data is stored in the fields of a repeating form.

  For storage in repeating forms, the mapping of data items to fields must be set in the `capture_mapping` and `lap_mapping` objects, respectively. All fields must be on the same instrument. The exact storage format depends on the field type (see below). Plain text storage can be customized using the `plain_text` object.

- `capture_mapping`: A JSON object with the following keys:
  - `elapsed`: Field name for elapsed time.
  - `start`: Field name for the datetime the capture was (first) started.
  - `stop`: Field name for the datetiem the capture was (last) stopped.
  - `event`: The event name (or numerical id) of the event the repeating form is on. If not specified, the current event is assumed.

- `lap_mapping`: A JSON object with the following keys:
  - `elapsed`: Field name for elapsed time.
  - `start`: Field name for the datatime the lap was (first) started.
  - `stop`: Field name for the datetime the lap was (last) stopped.
  - `num_stops`: Field name for the number of times the timer was stopped during recording of a lap (the target field must be of type integer).
  - `event`: The event name (or numerical id) of the event the repeating form is on. If not specified, the current event is assumed.

- `only_once`: Boolean (`true`|`false`), or a custom value in case of `repeating` (which then is stored in the field specified by `target`, which must be a _Text Box_ without or with matching validation). When used, the stopwatch is cannot be used again when a value is stored in `target` (after a form save). The default is `false`.

## Format of the stored values

Stopwatch will honor the format (validation) of the target field(s). The target field has to be of type _Text Box_ or _Notes Box_.

Elapsed time will be stored as follows:
- _Integer_: elapsed time in milliseconds.
- _Number_ (any type): elapsed time in seconds (with fractional seconds).
- _Time (MM:SS)_: elapsed time in minutes and seconds (limited to max 59:59).
- No validation: the elapsed time will be stored as h:m:s.f (colons and dot).

For capture and lap data values other than elapsed time, the following automatic formats will be used, depending on the field type:
- _Integer_: the (local) time represented by number of milliseconds elapsed since the start of the epoch, 01 January, 1970 00:00:00 Universal Time (UTC).
- _Number_ (any type): as above, but in seconds (including fractional seconds).
- _Date_ (any type): The date. Time information will be lost.
- _Datetime_ (any type): The date and time. Some time information will be lost.
- No validation: A datetime value in the format `Y-M-D H:m:s.f` where Y = 4-digit year, M = 2-digit month, D = 2-digit day, H = 2-digit hour (0-23), m = 2-digit minute, s = 2-digit second, f = fractional second (up to ms precision, depending on the `digits` setting).

## Format of the timer display

To set the display format, these placeholders can be used:

- `/h` - hours (1 or more digits)
- `/m` - minutes (2 digits)
- `/s` - seconds (2 digits)
- `/f` - fractional seconds
- `/S` - total seconds (with fractional seconds)
- `/F` - total milliseconds
- `/g` - group separator
- `/d` - decimal separator

The display format for e.g. `0:02:33.12` can be written as `/h/g/m/g/s/d/f`, and `digits` would have to be set to `2`.

## Acknowledgements

This module uses some code from Andy Martin (ActionTagHelper and other bits).

## Changelog

Version | Description
------- | ---------------------
beta.3  | Bug fixes, small improvements, IE11 fixes, new plan for advanced stuff.
beta.2  | Bug fixes and behind-the-scenes updates.
beta.1  | First beta release.
