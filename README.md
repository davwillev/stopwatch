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

## Configuration

- Configuration is done via action tag parameters.
- The format of the parameter string must be valid JSON (see https://jsonlint.com/).
- The following parameters are supported:
  - `elapsed`: The field to store the elapsed time in.
- In case the `elapsed` parameter is missing, the field the `@STOPWATCH` is on will be used, if compatible (see below).

## Format of the stored values

Stopwatch will honor the format (validation) of the target field. The target field has to be of type _text box_ or _notes box_.
Elapsed time will be stored as follows:
- _Integer_: elapsed time in milliseconds.
- _Number_ (any type): elapsed time in seconds (with fractional seconds).
- _Time (MM:SS)_: elapsed time in minutes and seconds (limited to max 59:59).

## Acknowledgements

This module uses some code from Andy Martin (ActionTagHelper and other bits).

## Changelog

Version | Description
------- | ---------------------
v1.0.0  | Initial release.
