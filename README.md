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
    - `capture-json`, `capture-notes`, `capture-repeating`: A stopwatch that can record multiple captures of the (until then) elapsed time. Data is stored either as JSON data structure (requires `target` to be a _Text Box_ or _Notes Box_ field without validation), plain text (`target` must be a _Notes Box_ field), or as multiple entries in a separate repeating form (see below for details).
    - `lap-json`, `lap-notes`, `lap-repeating`: A stopwatch that can record multiple laps. Data is stored either as JSON data structure (requires `target` to be a _Text Box_ or _Notes Box_ field without validation), plain text (`target` must be a _Notes Box_ field), or as multiple entries in a separate repeating form (see below for details).
  - `target`: The field to store the elapsed time in.
  - `hide_target`: Boolean (`true`|`false`) that determines whether the target input should be hidden (default to `true`).
  - `stops`: Boolean (`true`|`false`) that determines whether stopping (and resuming) the timer is allowed (defaults to `false`).
  - `digits`: The precisison to show (0, 1, 2, or 3).
  - `h_digits`, `m_digits`, `s_digits`: (minimal) padding for hours, minutes, seconds.
  - `no_hours`: Boolean (`true`|`false`). If set to `true`, minutes will be the largest unit counted.
  - `no_minutes`: Boolean (`true`|`false`). If set to `true`, seconds will be the largest unit counted. This will imply `no_hours` = `true`.
  - `decimal_separator`: The decimal separator which is inserted between seconds and fractional seconds. This will be overriden by certain target field types.
  - `group_separator`: The character(s) inserted between hours, minutes, seconds.
  - `unset_display_symbol`: The symbol to be used as digit replacement when no value has been set yet.
  - `display_format`: The format for display in the stopwatch widget.
- In case the `target` parameter is missing, the field the `@STOPWATCH` is on will be used, if compatible (see below).

### Basic stopwatch configuration

The basic stopwatch supports this additional parameter:

- `store_format`: The format the elapsed time is stored in.

### Capture stopwatch configuration

This advanced stopwatch supports the following additional configuration options:

- `capture`: A JSON object with the following keys. The permissible values depend on the mode:

  Setting           | _lap-json_      | _lap-notes_     | _lap-repeating_
  ----------------- | --------------- | --------------- | ------------------
  `capture_elapsed` | n/a             | n/a             | field name
  `capture_start`   | n/a             | _true_\|_false_ | field name
  `capture_stop`    | n/a             | _true_\|_false_ | field name
  `event`           | n/a             | n/a             | event name (or numerical id)
  `only_once`       | _true_\|_false_ | _true_\|_false_ | _true_\|_false_\|custom value

In case of `capture-repeating`, all fields **must** be on the same instrument. The `only_once` custom value (or a value depending on the field validation) will be stored in `target` (which must be a _Text Box_ with either Integer, Number, Date, or Datetime validation).  
When `only_once` is set, the stopwatch cannot be used again once a value has been saved (to `target`).

### Lap stopwatch configuration

This advanced stopwatch supports the following additional configuration options:

- `lap`: A JSON object with the following keys. The permissible values depend on the mode:

  Setting       | _lap-json_      | _lap-notes_     | _lap-repeating_
  ------------- | --------------- | --------------- | ------------------
  `lap_start`   | n/a             | _true_\|_false_ | field name
  `lap_end`     | n/a             | _true_\|_false_ | field name
  `lap_elapsed` | n/a             | _true_\|_false_ | field name
  `lap_stops`   | n/a             | _true_\|_false_ | field name
  `event`       | n/a             | n/a             | event name (or numerical id)
  `only_once`   | _true_\|_false_ | _true_\|_false_ | _true_\|_false_\|custom value

In case of `lap-repeating`, all fields **must** be on the same instrument. The `only_once` custom value (or a value depending on the field validation) will be stored in `target` (which must be a _Text Box_ with either Integer, Number, Date, or Datetime validation).  
When `only_once` is set, the stopwatch cannot be used again once a value has been saved (to `target`).

## Format of the stored values

Stopwatch will honor the format (validation) of the target field(s). The target field has to be of type _Text Box_ or _Notes Box_.
Elapsed time will be stored as follows:

- _Integer_: elapsed time in milliseconds.
- _Number_ (any type): elapsed time in seconds (with fractional seconds).
- _Time (MM:SS)_: elapsed time in minutes and seconds (limited to max 59:59).
- No validation: the elapsed time will be stored as h:m:s.f (colons and dot).

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
beta.2  | Bug fixes and behind-the-scenes updates.
beta.1  | First beta release.
