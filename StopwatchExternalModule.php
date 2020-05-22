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
            <div style="display:none;" data-stopwatch-em="stopwatch-basic">
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
            <div style="display:none;" data-stopwatch-em="capture-row">
                <tr>
                    <td class="stopwatch-em-rowlabel"></td>
                    <td class="stopwatch-em-rowvalue"></td>
                </tr>
            </div>
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
     * @param int $pid The project id.
     * @param string $instrument
     * @param string $field
     * @param array $param
     * @return array The supplemented parameters.
     */
    private function validateParams($pid, $instrument, $field, $params) {
        // Get the data structure of the project to validate field settings.
        $pds = $this->getProjectDataStructure($pid);
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
            if ($pds["fields"][$field]["form"] != $pds["fields"][$targetField]["form"]) {
                $params["error"] = "Invalid target field or @STOPWATCH and target field are not on the same instrument.";
                break;
            }
            // Get field metadata.
            $metadata = $pds["fields"][$targetField]["metadata"];
            $isAllowed = function($validation) {
                return 
                    $validation == null ||
                    $validation == "int" ||
                    $validation == "float" ||
                    substr($validation, 0, 6) == "number" ||
                    $validation == "time_mm_ss";
            };
            $validation = $metadata["element_validation_type"];
            if (@$metadata["element_type"] == "text" && $isAllowed($validation)) {
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
            // Validate field types.
            $target_metadata = $pds["fields"][$params["target"]]["metadata"];
            if ($params["store_format"] == "json") {
                if (!$target_metadata["element_type"] == "textarea" || ($target_metadata["element_type"] == "text" && $target_metadata["element_validation_type"] == null)) {
                    $params["error"] = "Invalid target field type.";
                    break;
                }
            } 
            else if ($params["store_format"] == "plain") {
                if (!$target_metadata["element_type"] == "textarea") {
                    $params["error"] = "Target field type must be of type 'Notes Box'.";
                    break;
                }
            }
            else {
                if ($params["only_once"] && $target_metadata["element_type"] != "text") {
                    $params["error"] = "Target field type must be of type 'Text Box'.";
                    break;
                }
                // TODO - Validate field mappings and plain.

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



    #region Project Data Structure Helper -----------------------------------------------------------------------------------

    /**
     * Gets the repeating forms and events in the current or specified project.
     * 
     * The returned array is structured like so:
     * [
     *   "forms" => [
     *      event_id => [
     *         "form name", "form name", ...
     *      ],
     *      ...
     *   ],
     *   "events" => [
     *      event_id => [
     *        "form name", "form name", ...
     *      ],
     *      ...
     *   ] 
     * ]
     * 
     * @param int|string|null $pid The project id (optional).
     * @return array An associative array listing the repeating forms and events.
     * @throws Exception From requireProjectId if no project id can be found.
     */
    function getRepeatingFormsEvents($pid = null) {
        $pid = $this->requireProjectId($pid);
        
        $result = $this->query('
            select event_id, form_name 
            from redcap_events_repeat 
            where event_id in (
                select m.event_id 
                from redcap_events_arms a
                join redcap_events_metadata m
                on a.arm_id = m.arm_id and a.project_id = ?
            )', $pid);

        $forms = array(
            "forms" => array(),
            "events" => array()
        );
        while ($row = $result->fetch_assoc()) {
            $event_id = $row["event_id"];
            $form_name = $row["form_name"];
            if ($form_name === null) {
                // Entire repeating event. Add all forms in it.
                $forms["events"][$event_id] = $this->getEventForms($event_id);
            }
            else {
                $forms["forms"][$event_id][] = $form_name;
            }
        }
        return $forms;
    }

    /**
     * Gets the names of the forms in the current or specified event.
     * 
     * @param int|null $event_id The event id (optional)
     * @return array An array of form names.
     * @throws Exception From requireProjectId or ExternalModules::getEventId if event_id, project_id cannot be deduced or multiple event ids are in a project.
     */
    function getEventForms($event_id = null) {
        if($event_id === null){
            $event_id = $this->getEventId();
        }
        $forms = array();
        $result = $this->query('
            select form_name
            from redcap_events_forms
            where event_id = ?
        ', $event_id);
        while ($row = $result->fetch_assoc()) {
            $forms[] = $row["form_name"];
        }
        return $forms;
    }


    /**
     * Gets the project structure (arms, events, forms, fields) of the current or specified project.
     * 
     * The returned array is structured like so:
     * [
     *   "forms" => [
     *      "form name" => [
     *          "name" => "form name",
     *          "repeating" => true|false,
     *          "repeating_event" => true|false,
     *          "arms" => [
     *              arm_id => [ 
     *                  "id" => arm_id 
     *              ], ...
     *          ],
     *          "events" => [
     *              event_id => [
     *                  "id" => event_id,
     *                  "name" => "event name",
     *                  "repeating" => true|false
     *              ], ...
     *          ],
     *          "fields" => [
     *              "field name", "field name", ...
     *          ]
     *      ], ...
     *   ],
     *   "events" => [
     *      event_id => [
     *          "id" => event_id,
     *          "name" => "event name",
     *          "repeating" => true|false,
     *          "arm" => arm_id,
     *          "forms" => [
     *              "form_name" => [
     *                  "name" => "form_name",
     *                  "repeating" => true|false
     *              ], ...
     *          ]
     *      ], ...
     *   ],
     *   "arms" => [
     *      arm_id => [
     *          "id" => arm_id
     *          "events" => [
     *              event_id => [
     *                  "id" => event_id,
     *                  "name" => "event name"
     *              ], ...
     *          ],
     *          "forms" => [
     *              "form name" => [
     *                  "name" => "form name"
     *              ], ...
     *          ]
     *      ], ...
     *   ],
     *   "fields" => [
     *      "field name" => [
     *          "name" => "field name",
     *          "form" => "form name",
     *          "repeating_form" => true|false,
     *          "repeating_event" => true|false,
     *          "events" => [
     *              event_id => [ 
     *                  (same as "events" => event_id -- see above)
     *              ], ...
     *          ],
     *          "metadata" => [
     *              (same as in $Proj)
     *          ]
     *      ], ...
     *   ]
     * ] 
     * @param int|string|null $pid The project id (optional).
     * @return array An array containing information about the project's data structure.
     */
    function getProjectDataStructure($pid = null) {
        $pid = $this->requireProjectId($pid);

        // Check cache.
        if (array_key_exists($pid, self::$ProjectDataStructureCache)) return self::$ProjectDataStructureCache[$pid];

        // Use REDCap's Project class to get some of the data. Specifically, unique event names are not in the backend database.
        $proj = new \Project($pid);
        $proj->getUniqueEventNames();

        // Prepare return data structure.
        $ps = array(
            "pid" => $pid,
            "forms" => array(),
            "events" => array(),
            "arms" => array(),
            "fields" => array(),
        );

        // Gather data - arms, events, forms.
        // Some of this might be extractable from $proj, but this is just easier.
        $result = $this->query('
            select a.arm_id, m.event_id, f.form_name
            from redcap_events_arms a
            join redcap_events_metadata m
            on a.arm_id = m.arm_id and a.project_id = ?
            join redcap_events_forms f
            on f.event_id = m.event_id
        ', $pid);
        while ($row = $result->fetch_assoc()) {
            $ps["arms"][$row["arm_id"]]["id"] = $row["arm_id"];
            $ps["arms"][$row["arm_id"]]["events"][$row["event_id"]] = array(
                "id" => $row["event_id"],
                "name" => $proj->uniqueEventNames[$row["event_id"]]
            );
            $ps["arms"][$row["arm_id"]]["forms"][$row["form_name"]] = array(
                "name" => $row["form_name"]
            );
            $ps["events"][$row["event_id"]]["id"] = $row["event_id"];
            $ps["events"][$row["event_id"]]["name"] = $proj->uniqueEventNames[$row["event_id"]];
            $ps["events"][$row["event_id"]]["repeating"] = false;
            $ps["events"][$row["event_id"]]["arm"] = $row["arm_id"];
            $ps["events"][$row["event_id"]]["forms"][$row["form_name"]] = array(
                "name" => $row["form_name"],
                "repeating" => false
            );
            $ps["forms"][$row["form_name"]]["name"] = $row["form_name"];
            $ps["forms"][$row["form_name"]]["repeating"] = false;
            $ps["forms"][$row["form_name"]]["repeating_event"] = false;
            $ps["forms"][$row["form_name"]]["arms"][$row["arm_id"]] = array(
                "id" => $row["arm_id"]
            );
            $ps["forms"][$row["form_name"]]["events"][$row["event_id"]] = array(
                "id" => $row["event_id"],
                "name" => $proj->uniqueEventNames[$row["event_id"]],
                "repeating" => false
            );
        }
        // Gather data - fields. Again, this could be got from $proj, but this is more straightforward to process.
        $result = $this->query('
            select field_name, form_name
            from redcap_metadata
            where project_id = ?
            order by field_order asc
        ', $pid);
        while ($row = $result->fetch_assoc()) {
            $ps["fields"][$row["field_name"]] = array(
                "name" => $row["field_name"],
                "form" => $row["form_name"],
                "repeating_form" => false,
                "repeating_event" => false,
            );
            $ps["forms"][$row["form_name"]]["fields"][] = $row["field_name"];
        }
        // Gather data - repeating forms, events.
        $repeating = $this->getRepeatingFormsEvents($pid);
        foreach ($repeating["forms"] as $eventId => $forms) {
            foreach ($forms as $form) {
                $ps["events"][$eventId]["forms"][$form]["repeating"]= true;
                $ps["forms"][$form]["repeating"] = true;
                // Augment fields.
                foreach ($ps["fields"] as $field => &$field_info) {
                    if ($field_info["form"] == $form) {
                        $field_info["repeating_form"] = true;
                    }
                }
            }
        }
        foreach ($repeating["events"] as $eventId => $forms) {
            $ps["events"][$eventId]["repeating"] = true;
            foreach ($forms as $form) {
                $ps["forms"][$form]["repeating_event"] = true;
                $ps["forms"][$form]["events"][$eventId]["repeating"] = true;
                // Augment fields.
                foreach ($ps["fields"] as $field => &$field_info) {
                    if ($field_info["form"] == $form) {
                        $field_info["repeating_event"] = true;
                    }
                }
            }
        }
        // Augment fields with events.
        foreach ($ps["forms"] as $formName => $formInfo) {
            foreach ($formInfo["fields"] as $field) {
                foreach ($formInfo["events"] as $eventId => $_) {
                    $ps["fields"][$field]["events"][$eventId] = $ps["events"][$eventId];
                }
            }
        }
        // Augment fields with field metadata.
        foreach ($ps["fields"] as $field => &$field_data) {
            $field_data["metadata"] = $proj->metadata[$field];
        }

        // Add to cache.
        self::$ProjectDataStructureCache[$pid] = $ps;

        return $ps;
    }

    private static $ProjectDataStructureCache = array();

    #endregion --------------------------------------------------------------------------------------------------------------

}
