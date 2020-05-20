<?php namespace DE\RUB\StopwatchExternalModule;

use ExternalModules\AbstractExternalModule;
use \REDCap;
use \Stanford\Utility\ActionTagHelper as ActionTagHelper;
use \DE\RUB\Utility\InjectionHelper as InjectionHelper;

/**
 * ExternalModule class for Configuration Design Study.
 */
class StopwatchExternalModule extends AbstractExternalModule {

    /** @var string $STOPWATCH The name of the action tag. */
    private $STOPWATCH = "@STOPWATCH";

    function redcap_every_page_top($project_id) {
        // Inject action tag info.
    }

    function redcap_data_entry_form($project_id, $record, $instrument, $event_id, $group_id, $repeat_instance) {
        $this->insertStopwatch($project_id, $instrument, $event_id, false);
    }

    function redcap_survey_page($project_id, $record, $instrument, $event_id, $group_id, $survey_hash, $response_id, $repeat_instance) {
        $this->insertStopwatch($project_id, $instrument, $event_id, true);
    }


    private function insertStopwatch($project_id, $instrument, $event_id, $isSurvey) {
        $fields = $this->getFieldParams($project_id, $instrument);
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
            <template data-stopwatch-em="basic">
                <div class="stopwatch-em stopwatch-em-container" aria-label="Stopwatch EM">
                    <div class="input-group input-group-sm">
                        <div class="input-group-prepend">
                            <div class="input-group-text"><i class="fas fa-hourglass-start stopwatch-em-hourglass"></i></div>
                        </div>
                        <div class="input-group-append">
                            <div class="input-group-text stopwatch-em-timerdisplay"></div>
                        </div>
                        <div class="input-group-append">
                            <button role="button" class="btn btn-secondary stopwatch-em-startstop">Start</button>
                        </div>
                        <div class="input-group-append">
                            <button role="button" class="btn btn-secondary stopwatch-em-reset">Reset</button>
                        </div>
                    </div>
                </div>
            </template>
            <?php
        }
    }


    /**
     * Returns an array containing active fields and parameters for each field.
     * TODO: This currently fails to alert the user about action tags with malformed JSON, as these are ignored by the ActionTagHelper.
     * @return array
     */
    private function getFieldParams($project_id, $instrument) {
        $field_params = array();
        if (!class_exists("\Stanford\Utility\ActionTagHelper")) include_once("classes/ActionTagHelper.php");
        $action_tag_results = ActionTagHelper::getActionTags($this->STOPWATCH);
        if (isset($action_tag_results[$this->STOPWATCH])) {
            foreach ($action_tag_results[$this->STOPWATCH] as $field => $param_array) {
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
                    $params = $this->validateParams($project_id, $instrument, $field, $params);
                }
                $field_params[$field] = $params;
            }
        }
        return $field_params;
    }

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
     * @param int $pid The project id.
     * @param string $instrument
     * @param string $field
     * @param array $param
     * @return array The supplemented parameters.
     */
    private function validateParams($pid, $instrument, $field, $params) {
        // Add defaults.
        $parmas["is_mm_ss"] = false;
        if (!isset($params["mode"])) {
            $params["mode"] = "basic";
        }
        if ($params["mode"] == "basic" && !isset($params["target"])) {
            $params["target"] = $field;
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
        if ($params["mode"] == "basic") {
            // Verify and setup basic requirements.
            $targetField = @$params["target"];
            // Get field metadata.
            $metadata = REDCap::getDataDictionary($pid, 'array', false, null, $instrument);
            $metadata = @$metadata[$targetField];
            $isAllowed = function($validation) {
                return 
                    $validation == "" ||
                    $validation == "integer" ||
                    substr($validation, 0, 6) == "number" ||
                    $validation == "time_mm_ss";
            };
            $validation = @$metadata["text_validation_type_or_show_slider_number"];
            if (@$metadata["field_type"] == "text" && $isAllowed($validation)) {
                if ($validation == "integer") {
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
                else if (strpos($validation, "number") !== false) {
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
        }
        return $params;
    }
}
