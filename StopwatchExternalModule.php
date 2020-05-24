<?php namespace DE\RUB\StopwatchExternalModule;

use ExternalModules\AbstractExternalModule;
use \REDCap;
use \Stanford\Utility\ActionTagHelper;
use \DE\RUB\Utility\InjectionHelper;
use \DE\RUB\Utility\Project;

/**
 * ExternalModule class for Configuration Design Study.
 */
class StopwatchExternalModule extends AbstractExternalModule {

    /** @var string $STOPWATCH The name of the action tag. */
    private $STOPWATCH = "@STOPWATCH";

    function redcap_every_page_top($project_id) {
        // Inject action tag info.
        // TODO
    }

    function redcap_data_entry_form($project_id, $record, $instrument, $event_id, $group_id, $repeat_instance) {
        $this->insertStopwatch($project_id, $record, $instrument, $event_id, $repeat_instance, false);
    }

    function redcap_survey_page($project_id, $record, $instrument, $event_id, $group_id, $survey_hash, $response_id, $repeat_instance) {
        $this->insertStopwatch($project_id, $record, $instrument, $event_id, $repeat_instance, true);
    }

    function redcap_save_record($project_id, $record_id, $instrument, $event_id, $group_id, $survey_hash, $response_id, $repeat_instance) {
        $debug = $this->getProjectSetting("debug-js") == true;
        $fields = $this->getFieldParams($project_id, $record_id, $instrument, $event_id, $repeat_instance);
        foreach ($fields as $field => $params) {
            if (empty($params["error"]) && $params["store_format"] == "repeating") {
                $data = json_decode($_POST["stopwatch-em-json-{$field}"], true);
                if (is_array($data)) {
                    if (!class_exists("\DE\RUB\Utility\Project")) include_once("classes/Project.php");
                    $project = Project::load($this->framework, $project_id);
                    $record = $project->getRecord($record_id);
                    $mappings = $params["mode"] == "lap" ? $params["lap_mapping"] : $params["capture_mapping"];
                    $instances_data = array();
                    foreach ($data as $item) {
                        $instance_data = array();
                        foreach ($mappings as $key => $store_key) {
                            if ($project->getFieldType($store_key) !== "text") continue;
                            $target_type = $project->getFieldValidation($store_key);
                            $value = $this->convertToStorage($key, $target_type, $item[$key]);
                            $instance_data[$store_key] = $value;
                        }
                        $instances_data[] = $instance_data;
                    }
                    try {
                        // Save instances.
                        $rv = $record->addFormInstances($params["form"], $params["event"], $instances_data);
                        // Store return value into target field.
                        $record->updateFields(array($params["target"] => $rv), $event_id);
                    }
                    catch (\Exception $e) {
                        if ($debug) REDCap::logEvent(
                            "@STOPWATCH ('{$field}')",
                            "Exception was thrown: " . $e->getMessage(),
                            null,
                            $record_id,
                            $event_id,
                            $project_id
                        );
                    }
                    catch (\Error $e) {
                        if ($debug) REDCap::logEvent(
                            "@STOPWATCH ('{$field}')",
                            "Error occured: " . $e->getMessage() . "\n" . $e->getTraceAsString(),
                            null,
                            $record_id,
                            $event_id,
                            $project_id
                        );
                    }
                }
            }
        }
    }

    private function convertForStorage($field, $target_type, $value) {
        // num_stops
        if ($field == "num_stops") return $value;
        // elapsed
        if ($field == "elapsed") {
            if ($target_type == "int") return $value;
            if ($target_type == "float") return $value / 1000;
            if ($target_type == "number_comma_decimal") {
                $value = $value / 1000;
                $value = "{$value}";
                return str_replace(".", ",", $value);
            }
        }
        // start or stop
        if ($target_type == null) return $value;
        // Parse ISO 8601 (2020-05-23T13:19:45.407Z) into PHP-compatible datetime structure.
        // https://regex101.com/r/VCo1Tt
        $re = '/(?\'Y\'\d+)-(?\'m\'\d+)-(?\'d\'\d+)T(?\'H\'\d+):(?\'i\'\d+):(?\'s\'\d+)(\.(?\'f\'\d+))?/m';
        preg_match_all($re, $value, $matches, PREG_SET_ORDER, 0);
        if (count($matches) == 1) {
            $match = $matches[0];
            $ms = isset($match["f"]) ? $match["f"] : "0";
            $ms_digits = strlen($ms);
            $ms_frac = $ms / (1000 / pow(10, 3 - $ms_digits));
            $datetime = new \DateTime();
            $datetime->setDate($match["Y"], $match["m"], $match["d"]);
            $datetime->setTime($match["H"], $match["i"], $match["s"], $ms);
            $ts = $datetime->getTimestamp();
            if ($target_type == "int") {
                $value = $ts * 1000 + $ms;
                return "$value";
            } 
            if ($target_type == "float") {
                $value = $ts + $ms_frac;
                return "$value";
            } 
            if ($target_type == "number_comma_decimal") {
                $value = $ts + $ms_frac;
                return str_replace(".", ",", "$value");
            }
            if ($target_type == "date_dmy") return date("d-m-Y", $ts);
            if ($target_type == "date_mdy") return date("m-d-Y", $ts);
            if ($target_type == "date_ymd") return date("Y-m-d", $ts);
            if ($target_type == "datetime_dmy") return date("d-m-Y H:i", $ts);
            if ($target_type == "datetime_dmy") return date("d-m-Y H:i", $ts);
            if ($target_type == "datetime_mdy") return date("m-d-Y H:i", $ts);
            if ($target_type == "datetime_seconds_mdy") return date("m-d-Y H:i:s", $ts);
            if ($target_type == "datetime_seconds_ymd") return date("Y-m-d H:i:s", $ts);
            if ($target_type == "datetime_seconds_ymd") return date("Y-m-d H:i:s", $ts);
        }
        return null;
    }

    private function insertStopwatch($project_id, $record, $instrument, $event_id, $instance, $isSurvey) {
        $fields = $this->getFieldParams($project_id, $record, $instrument, $event_id, $instance);
        if (count($fields)) {
            if (!class_exists("\RUB\Utility\InjectionHelper")) include_once("classes/InjectionHelper.php");
            $ih = InjectionHelper::init($this);
            $ih->js("js/stopwatch-em.js", $isSurvey);
            $ih->css("css/stopwatch-em.css", $isSurvey);
            $debug = $this->getProjectSetting("debug-js") == true;
            // Transfer data to the JavaScript implementation.
            ?>
            <script>
                var DTO = window.ExternalModules.StopwatchEM_DTO;
                DTO.debug = <?=json_encode($debug)?>;
                DTO.fields = <?=json_encode($fields)?>;
            </script>
            <div style="display:none;" data-stopwatch-em-template="stopwatch-basic">
                <div class="stopwatch-em stopwatch-em-container" aria-label="Stopwatch EM">
                    <div class="input-group input-group-sm">
                        <div class="input-group-prepend">
                            <div class="input-group-text"><i class="fas fa-hourglass-start stopwatch-em-hourglass"></i></div>
                        </div>
                        <div class="input-group-append">
                            <div class="input-group-text stopwatch-em-timerdisplay"></div>
                        </div>
                        <div class="input-group-append">
                            <button role="button" class="btn btn-secondary stopwatch-em-reset">Reset</button>
                        </div>
                        <div class="input-group-append">
                            <button role="button" class="btn btn-secondary stopwatch-em-startstop">Start</button>
                        </div>
                    </div>
                    <div class="stopwatch-em-captures">
                        <table class="stopwatch-em-table"></table>
                    </div>
                </div>
            </div>
            <table style="display:none;" data-stopwatch-em-template="stopwatch-row">
                <tr>
                    <td class="stopwatch-em-rowlabel"></td>
                    <td class="stopwatch-em-rowstop"></td>
                    <td class="stopwatch-em-rowvalue"></td>
                </tr>
            </table>
            <?php
        }
    }


    /**
     * Returns an array containing active fields and parameters for each field.
     * TODO: This currently fails to alert the user about action tags with malformed JSON, as these are ignored by the ActionTagHelper.
     * @return array
     */
    private function getFieldParams($project_id, $record_id, $instrument, $event_id, $instance) {
        $field_params = array();
        if (!class_exists("\DE\RUB\Utility\Project")) include_once("classes/Project.php");
        $project = Project::load($this->framework, $project_id);
        if (!class_exists("\Stanford\Utility\ActionTagHelper")) include_once("classes/ActionTagHelper.php");
        $action_tag_results = ActionTagHelper::getActionTags($this->STOPWATCH);
        if (isset($action_tag_results[$this->STOPWATCH])) {
            foreach ($action_tag_results[$this->STOPWATCH] as $field => $param_array) {
                // Skip if not on current instrument.
                if ($project->getFormByField($field) !== $instrument) continue; 
                // Validate parameters and add.
                $params = $param_array['params'];
                if (empty($params)) {
                    $params = array(
                        "mode" => "basic",
                    );
                }
                else {
                    $params = json_decode($params, true);
                }
                if ($params == null) {
                    $params = array(
                        "error" => "Invalid JSON supplied for {$this->STOPWATCH} action tag of field '{$field}'."
                    );
                }
                else {
                    $params = $this->validateParams($project, $record, $instrument, $event_id, $instance, $field, $params);
                }
                $field_params[$field] = $params;
            }
        }
        return $field_params;
    }

    private $VALID_STORE_FORMATS = ["json", "plain", "repeating"];

    /**
     * Adds format parameters (based on field type).
     * 
     * Display / store format:
     *  - h = hours (1 or more digits)
     *  - m = minute (2 digits)
     *  - s = seconds (2 digits)
     *  - f = fractional seconds (milliseconds)
     *  - S = total seconds (without fractional seconds)
     *  - F = total milliseconds
     *  - g = group seperator
     *  - d = decimal seperator
     * 
     * @param \DE\RUB\Utility\Project $project
     * @param \DE\RUB\Utility\Record $record
     * @param string $instrument
     * @param string $event_id
     * @param int|null $instance
     * @param string $field
     * @param array $param
     * @return array The supplemented parameters.
     */
    private function validateParams($project, $record, $instrument, $event_id, $instance, $field, $params) {
        // Add defaults.
        if (!isset($params["label_start"])) {
            $params["label_start"] = "Start"; 
        }
        if (!isset($params["label_resume"])) {
            $params["label_resume"] = "Resume";
        }
        if (!isset($params["label_stop"])) {
            $params["label_stop"] = "Stop";
        }
        if (!isset($params["label_reset"])) {
            $params["label_reset"] = "Reset";
        }
        if (!isset($params["label_lap"])) {
            $params["label_lap"] = "Lap";
        }
        if (!isset($params["label_capture"])) {
            $params["label_capture"] = "Capture";
        }
        $parmas["is_mm_ss"] = false;
        if (!isset($params["mode"])) {
            $params["mode"] = "basic";
        }
        if (!isset($params["target"])) {
            $params["target"] = $field;
        }
        if (!isset($params["hide_target"])) {
            $params["hide_target"] = true; 
        }
        if (!isset($params["stops"])) {
            $params["stops"] = false;
        }
        if (!isset($params["no_hours"])) {
            $params["no_hours"] = false;
        }
        if (!isset($params["no_minutes"])) {
            $params["no_minutes"] = false;
        }
        if ($params["no_minutes"]) {
            $params["no_hours"] = true;
        }
        if (!isset($params["digits"])) {
            $params["digits"] = 3;
        }
        $params["digits"] = min(3, max($params["digits"], 0));
        if (!isset($params["h_digits"])) {
            $params["h_digits"] = 1;
        }
        $params["h_digits"] = max($params["h_digits"], 1);
        if (!isset($params["m_digits"])) {
            $params["m_digits"] = 2;
        }
        $params["m_digits"] = min(2, max($params["m_digits"], 1));
        if (!isset($params["s_digits"])) {
            $params["s_digits"] = 2;
        }
        $params["s_digits"] = min(2, max($params["s_digits"], 1));
        if (!isset($params["decimal_separator"])) {
            $params["decimal_separator"] = ".";
        }
        if (!isset($params["group_separator"])) {
            $params["group_separator"] = ":";
        }
        if (!isset($params["unset_display_symbol"])) {
            $params["unset_display_symbol"] = "–";
        }
        //
        // Basic mode
        //
        while ($params["mode"] == "basic") {
            // Verify and setup basic requirements.
            $targetField = $params["target"];
            // Valid target?
            if (!$project->areFieldsOnSameForm([$field, $targetField])) {
                $params["error"] = "Invalid target field or @STOPWATCH and target field are not on the same instrument.";
                break;
            }
            // Validate field metadata.
            $isAllowed = function($validation) {
                return 
                    $validation == null ||
                    $validation == "int" ||
                    $validation == "float" ||
                    $validation == "number_comma_decimal" ||
                    $validation == "time_mm_ss";
            };
            $validation = $project->getFieldValidation($targetField);
            if ($project->getFieldType($targetField) == "text" && $isAllowed($validation)) {
                if ($validation == "int") {
                    // Text Box with Integer validation.
                    $params["display_format"] = "/h/g/m/g/s" . ($params["digits"] > 0 ? "/d/f" : "");
                    $params["store_format"] = "/F";
                }
                else if ($validation == "time_mm_ss") {
                    // Text Box with Time (MM:SS) validation.
                    $params["display_format"] = "/m/g/s";
                    $params["store_format"] = "/m/g/s";
                    $params["digits"] = 0;
                    $params["is_mm_ss"] = true;
                }
                else if ($validation == "float" || strpos($validation, "number") !== false) {
                    // Text Box with Number (any) validation.
                    $params["decimal_separator"] = strpos($validation, "comma") === false ? "." : ",";
                    $params["display_format"] = "/h/g/m/g/s" . ($params["digits"] > 0 ? "/d/f" : "");
                    $params["store_format"] = "/S";
                }
                else {
                    // Text Box without validation.
                    $params["display_format"] = "/h/g/m/g/s" . ($params["digits"] > 0 ? "/d/f" : "");
                    $params["store_format"] = "/h:/m:/s" . ($params["digits"] > 0 ? "./f" : "");
                }
            }
            else {
                $params["error"] = "Invalid or missing target field. Target field must be of type 'Text Box' and either Integer, Number, or Time (MM:SS) validation and be located on the same instrument as {$this->STOPWATCH}.";
            }
            break;
        }
        //
        // Lap and capture modes
        //
        while ($params["mode"] == "capture" || $params["mode"] == "lap") {
            if ($this->requireInt($params["max_rows"], 0) === null) {
                $params["max_rows"] = 0;
            }
            if (!isset($params["store_format"])) {
                $params["store_format"] = "json";
            }
            if (!in_array(@$params["store_format"], $this->VALID_STORE_FORMATS, true)) {
                $params["error"] = "Invalid value for 'store_format'.";
                break;
            }
            if (!isset($params["only_once"])) {
                $params["only_once"] = false;
            }
            if ($params["only_once"] !== false && empty($params["only_once"])) {
                $params["error"] = "Invalid value for 'only_once'.";
                break;
            }
            if (!isset($params["display_format"])) {
                $params["display_format"] = "/h/g/m/g/s" . ($params["digits"] > 0 ? "/d/f" : "");
            }
            // Validate field types.
            // JSON.
            if ($params["store_format"] == "json") {
                if (!($project->getFieldType($params["target"]) == "textarea" || ($project->getFieldType($params["target"]) == "text" && $project->getFieldValidation($params["target"]) == null))) {
                    $params["error"] = "Invalid target field type.";
                    break;
                }
            } 
            // Plain text.
            else if ($params["store_format"] == "plain") {
                if (!$project->getFieldType($params["target"]) == "textarea") {
                    $params["error"] = "Target field type must be of type 'Notes Box'.";
                    break;
                }
            }
            // Repeating form.
            else {
                if ($project->getFieldType($params["target"]) != "text" || $project->getFieldValidation($params["target"]) !== null) {
                    $params["error"] = "Target field type must be of type 'Text Box' without validation.";
                    break;
                }
                $repeating_field_names = array("elapsed", "start", "stop");
                if ($params["mode"] == "lap") $repeating_field_names[] = "num_stops";
                $repeating_fields = array();
                foreach ($repeating_field_names as $fieldname) {
                    $mapping = @$params[$params["mode"]."_mapping"][$fieldname];
                    if (!empty($mapping)) {
                        $repeating_fields[$fieldname] = $mapping;
                    }
                }
                if (!count($repeating_fields)) {
                    $params["error"] = "Storage field mappings must be provided.";
                    break;
                }
                if (!isset($params["event"])) $params["event"] = $event_id;
                if ($project->getEventId($params["event"]) == null) {
                    $params["error"] = "Invalid event.";
                    break;
                }
                if (!$project->areFieldsOnSameForm(array_values($repeating_fields)) || !$project->isFieldOnRepeatingForm($repeating_fields[array_key_first($repeating_fields)], $params["event"])) {
                    $params["error"] = "Invalid field mappings. All fields must exist and be on the same repeating form.";
                    break;
                }
                $allowedType = array(
                    "elapsed" => array(
                        "int", "float", "number_comma_decimal", null
                    ),
                    "start" => array(
                        "int", "float", "number_comma_decimal", null, "date_dmy", "date_ymd", "date_mdy", "datetime_dmy", "datetime_ymd", "datetime_mdy", "datetime_seconds_dmy", "datetime_seconds_ymd", "datetime_seconds_mdy"
                    ),
                    "num_stops" => array(
                        "int"
                    )
                );
                $allowedType["stop"] = $allowedType["start"];
                foreach ($repeating_fields as $map_name => $target_name) {
                    if ($project->getFieldType($target_name) != "text") {
                        $params["error"] = "Mapping field '{$target_name}' must be of type 'Text Box'.";
                    }
                    $validation_type = $project->getFieldValidation($target_name);
                    if (!in_array($validation_type, $allowedType[$map_name], true)) {
                        $params["error"] = "Field '{$target_name}' has an invalid type.";
                        break 2;
                    }
                }
                $params["form"] = $project->getFormByField($repeating_fields[array_key_first($repeating_fields)]);
                if (!$project->isFormOnEvent($params["form"], $params["event"])) {
                    $params["error"] = "Form '{$params["form"]}' is not on event '{$params["event"]}'.";
                }
                
            }
            break;
        }
        //
        // Capture mode
        //
        while ($params["mode"] == "capture") {
            break;
        }
        //
        // Lap mode
        //
        while ($params["mode"] == "lap") {

            break;
        }
        return $params;
    }


    /**
     * Ensures that a value is an integer inside the given bounds.
     * @param mixed $val
     * @param int $lower (Optional) lower bounds.
     * @param int $upper (Optional) upper bounds.
     * @return int|null
     */
    function requireInt($val, $lower = null, $upper = null) {
        if (!is_numeric($val)) return null;
        $int = $val * 1;
        if (!is_integer($int)) return null;
        if ($lower !== null) {
            $int = max($lower, $int);
        }
        if ($upper !== null) {
            $int = min($upper, $int);
        }
        return $int;
    }
}
