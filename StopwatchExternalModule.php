<?php namespace UoB\StopwatchExternalModule;

use ExternalModules\AbstractExternalModule;
use \REDCap;
use \Stanford\Utility\ActionTagHelper as ActionTagHelper;
use \RUB\Utility\InjectionHelper as InjectionHelper;

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
        $instrument_fields = REDCap::getFieldNames($instrument);
        $fields = array_intersect_key($this->getFieldParams(), array_flip($instrument_fields));
        if (count($fields)) {
            if (!class_exists("\RUB\Utility\InjectionHelper")) include_once("classes/InjectionHelper.php");
            $ih = InjectionHelper::init($this);
            $ih->js("js/stopwatch-em.js", $isSurvey);
            $debug = $this->getProjectSetting("debug-js") == true;
            ?>
            <script>
                var DTO = window.ExternalModules.StopwatchEM_DTO;
                DTO.debug = <?=json_encode($debug)?>;
                DTO.fields = <?=json_encode($fields)?>;
            </script>
            <?php
        }
    }


    /**
     * Returns an array containing active fields and parameters for each field.
     * @return array
     */
    private function getFieldParams() {
        $field_params = array();
        if (!class_exists("\Stanford\Utility\ActionTagHelper")) include_once("classes/ActionTagHelper.php");
        $action_tag_results = ActionTagHelper::getActionTags($this->STOPWATCH);
        if (isset($action_tag_results[$this->STOPWATCH])) {
            foreach ($action_tag_results[$this->STOPWATCH] as $field => $param_array) {
                $params = $param_array['params'];
                if ($params === "") {
                    $params = "{\"elapsed\":\"$field\"}";
                }
                $params = json_decode($params, true);
                if ($params == null) {
                    $params = array(
                        "error" => "Invalid JSON supplied for {$this->STOPWATCH} action tag of field '{$field}'."
                    );
                }
                $field_params[$field] = $params;
            }
        }
        return $field_params;
    }
}
