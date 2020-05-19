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
  - `target`: The field to store the elapsed time in.
  - `digits`: The precisison to show (0, 1, 2, or 3).
  - `h_digits`, `m_digits`, `s_digits`: (minimal) padding for hours, minutes, seconds.
  - `decimal_separator`: The decimal separator which is inserted between seconds and fractional seconds. This will be overriden by certain target field types.
  - `group_separator`: The character(s) inserted between hours, minutes, seconds.
  - `unset_display_symbol`: The symbol to be used as digit replacement when no value has been set yet.
  - `display_format`: The format for display in the stopwatch widget.
  - `store_format`: The format the elapsed time is stored in.
- In case the `target` parameter is missing, the field the `@STOPWATCH` is on will be used, if compatible (see below).

## Format of the stored values

Stopwatch will honor the format (validation) of the target field. The target field has to be of type _text box_ or _notes box_.
Elapsed time will be stored as follows:

- _Integer_: elapsed time in milliseconds.
- _Number_ (any type): elapsed time in seconds (with fractional seconds).
- _Time (MM:SS)_: elapsed time in minutes and seconds (limited to max 59:59).

To set storage formats for fields without one of the validations shown above, these placeholders can be used:

- `/h` - hours (1 or more digits)
- `/m` - minutes (2 digits)
- `/s` - seconds (2 digits)
- `/f` - fractional seconds
- `/S` - total seconds (with fractional seconds)
- `/F` - total milliseconds
- `/g` - group separator
- `/d` - decimal separator

Thus, the storage formats for the validated fields could be written as `/F`, `/S`, and `/m/g/s` (with `digits` being `0`), respectively.  
The display format for e.g. `0:02:33.12` can be written as `/h/g/m/g/s/d/f`.

## Acknowledgements

This module uses some code from Andy Martin (ActionTagHelper and other bits).

## Changelog

Version | Description
------- | ---------------------
beta.1  | First beta release.
