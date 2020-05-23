<?php namespace DE\RUB\Utility;

use \REDCap;

class Record
{
    /** @var Project The project this record belongs to. */
    private $project;
    /** @var string The id of this record. */
    private $record_id;
    /** @var \ExternalModules\Framework The framework instance. */
    private $framework;

    function __construct($framework, $project, $record_id) {
        $this->project = $project;
        $this->record_id = $record_id;
        $this->framework = $framework;
    }


    /**
     * Adds (saves) new form instances.
     * 
     * Instance data must be supplied as an associative array, per instance, of the form
     * [
     *   [
     *     "field_1" => "value",
     *     "field_2" => "value",
     *     ...
     *   ]
     * ]
     * Data for a single instance must also be wrapped in an array.
     * 
     * @param string $form The form name (it must exist and be a repeating form).
     * @param string $event The event name or (numerical) event id.
     * @param array $instances An array of the instance data.
     * @return string A summary of the insertion: "event_id:first:last:count".
     * @throws Exception An exception is thrown in case of project data structure violations.
     */
    public function addFormInstances($form, $event, $instances) {
        // Check event.
        if (!$this->project->hasEvent($event)) {
            throw new \Exception("Event '{$event}' does not exist in project '{$this->project->getProjectId()}'.");
        }
        // Check form.
        if (!$this->project->hasForm($form) && !$this->project->isFormRepeating($form, $event)) {
            throw new \Exception("Form '{$form}' does not exist or is not repeating in event '{$event}'.");
        }
        // Check fields.
        foreach ($instances as $instance) {
            if (!is_array($instance)) {
                throw new \Exception("Invalid instance data format.");
            }
            foreach ($instance as $field => $value) {
                if (!(is_null($value) || is_string($value) || is_numeric($value) || is_bool($value))) {
                    throw new \Exception("Invalid value data type for field '$field'.");
                }
                if ($this->project->getFormByField($field) !== $form) {
                    throw new \Exception("Field '$field' is not on form '$form'.");
                }
            }
        }
        // Build data structure for REDCap::saveData().
        $event_id = $this->project->getEventId($event);
        $last_instance = $this->getFormLastInstanceNumber($form, $event);
        $first_instance = $last_instance + 1;
        $data = array();
        foreach ($instances as $instance_data) {
            $instance_data["{$form}_complete"] = 2;
            $data[++$last_instance] = $instance_data;
        }
        $data = array(
            $this->record_id => array(
                "repeat_instances" => array(
                    $event_id => array (
                        $form => $data
                    )
                )
            )
        );
        REDCap::saveData(
            $this->project->getProjectId(), // project_id
            "array",                        // dataFormat
            $data,                          // data
            "overwrite"                     // overwriteBehavior
        );
        $count = $last_instance - $first_instance + 1;
        return "{$event_id}:{$first_instance}:{$last_instance}:{$count}";
    }

    /**
     * Updates fields. 
     * The fields must all be on the same event and if repeating, 
     * on the same form (unless the event itself is repeating).
     * 
     * @param array $field_values An associative array (field_name => value).
     * @param string $event The name of the event or the (numerical) event id.
     * @param int|null $instance The repeat instance (optional).
     * @throws Exception for violations of the project data structure.
     */
    function updateFields($field_values, $event, $instance = null) {
        // Anything to do?
        if (!count($field_values)) return;
        // Validate and ensure instance exists.
        $fields = array_keys($field_values);
        $this->validateFields($fields, $event, $instance, true);
        
        // Verify record / instance exists.
        $event_id = $this->project->getEventId($event);
        $project_id = $this->project->getProjectId();
        $form = $this->project->getFormByField($fields[0]);
        $sql = "SELECT COUNT(*) AS `count`
                FROM redcap_data
                WHERE `project_id` = ? AND
                      `event_id`= ? AND
                      `record` = ? AND ";
        $parameters = array(
            $project_id, 
            $event_id, 
            $this->record_id
        );
        $event_repeating = $this->project->isEventRepeating($event);
        if ($event_repeating) {
            // Repeating event.
            $sql .= "`field_name` = ? AND `instance` ";
            array_push($parameters, $this->project->recordIdField());
            if ($instance == 1) {
                $sql .= "is null";
            }
            else {
                $sql .= "?";
                array_push($parameters, $instance);
            }
        }
        else if ($instance !== null) {
            // Repeating form.
            $sql .= "`field_name` = ? AND `instance` ";
            array_push($parameters, "{$form}_complete");
            if ($instance == 1) {
                $sql .= "is null";
            }
            else {
                $sql .= "?";
                array_push($parameters, $instance);
            }
        }
        else {
            // Plain. It's enough that record exists.
            $sql .= "`field_name` = ? AND `instance` is null";
            array_push($parameters, $this->project->recordIdField());
        }
        $result = $this->framework->query($sql, $parameters);
        $row = $result->fetch_assoc();
        if ($row == null || $row["count"] == 0) {
            throw new \Exception("Cannot update as record, event, or instance has no data yet.");
        }

        // Build data structure for REDCap::saveData().
        $data = null;
        if ($event_repeating) {
            $data = array(
                $this->record_id => array(
                    "repeat_instances" => array(
                        $event_id => array(
                            null => array(
                                $instance => $field_values
                            )
                        )
                    )
                )
            );
        }
        else if ($instance !== null) {
            $data = array(
                $this->record_id => array(
                    "repeat_instances" => array(
                        $event_id => array(
                            $form => array(
                                $instance => $field_values
                            )
                        )
                    )
                )
            );
        }
        else {
            $data = array(
                $this->record_id => array(
                    $event_id => $field_values
                )
            );
        }
        $result = REDCap::saveData(
            $project_id, // project_id
            "array",     // dataFormat
            $data,       // data
            "overwrite"  // overwriteBehavior
        );
    }

    /**
     * Gets field values for the specified event and repeat instance.
     * The fields must all be on the same event and if repeating, 
     * on the same form (unless the event itself is repeating).
     * 
     * @param array $fields An array of field names.
     * @param string $event The name of the event or the (numerical) event id.
     * @param int|null $instance The repeat instance (optional).
     * @return array An associative array (field_name => value).
     * @throws Exception for violations of the project data structure.
     */
    public function getFieldValues($fields, $event, $instance = null) {
        // Anything to do?
        if (!count($fields)) return array();
        $this->validateFields($fields, $event, $instance);
        $event_id = $this->project->getEventId($event);
        $project_id = $this->project->getProjectId();

        $all = REDCap::getData($project_id, "array", $this->record_id);

        $data = REDCap::getData(
            $project_id,       // project_id
            "array",           // return_format
            $this->record_id,  // records
            $fields,           // fields
            $event_id          // events
        );

        if ($instance === null) {
            // Plain, non repeating.

        }
        $event_repeating = $this->project->isEventRepeating($event);
        
        
    }


    /**
     * Validates compatibility of "fields, event, instance" combinations with project data structure.
     * 
     * @param array $fields A list of field names.
     * @param string $event The event name of (numerical) event id.
     * @param int|null $instance The repeat instance (optional).
     * @throws Excetion in case of violations.
     */
    private function validateFields($fields, $event, $instance, $instance_must_exist = false) {
        // Anything to do?
        if (!count($fields)) return;
        // Check event.
        $event_id = $this->project->getEventId($event);
        $project_id = $this->project->getProjectId();
        if ($event_id === null) {
            throw new \Exception("Event '{$event}' does not exist in project '{$project_id}'.");
        }
        $event_repeating = $this->project->isEventRepeating($event);
        if ($event_repeating) {
            // Instance provided?
            if($instance == null) {
                throw new \Exception("Must provide a valid instance number when updating fields on repeating events.");
            }
            // All fields on this event?
            foreach ($fields as $field) {
                if (!$this->project->isFieldOnEvent($field, $event)) {
                    throw new \Exception("Field '{$field}' is not on event '{$event}'.");
                }
            }
        }
        else if ($instance !== null) {
            // This implies a repeating form. Are all fields on the same form?
            if (!$this->project->areFieldsOnSameForm($fields)) {
                throw new \Exception("All fields must be on the same repeating form.");
            }
            // Check if the form is repeating.
            $form = $this->project->getFormByField($fields[0]);
            if (!$this->project->isFormRepeating($form, $event)) {
                throw new \Exception("Form '{$form}' is not repeating on event '{$event}'.");
            }
        }
        else {
            // Plain fields. None of the fields must be on a repeating form.
            foreach ($fields as $field) {
                if ($this->project->isFieldOnRepeatingForm($field, $event)) {
                    throw new \Exception("Field '{$field}' on event '{$event}' must not be on a repeating form.");
                }
            }
        }
    }




    /**
     * Gets the number of the form instances saved. Returns null if the form does not exist or is not repeating.
     * @param string $form The form name.
     * @param string|int $event The event name or event id.
     * @return null|int
     */
    public function getFormInstancesCount($form, $event) {
        if ($this->project->hasForm($form) && 
            $this->project->isFormRepeating($form, $event) &&
            $this->project->hasEvent($event)) {
            $event_id = $this->project->getEventId($event);
            $sql = "
                SELECT COUNT(*) as `count` 
                FROM redcap_data 
                WHERE `project_id` = ? AND 
                      `event_id` = ? AND 
                      `record` = ? AND 
                      `field_name` = ?";
            $result = $this->framework->query($sql, [
                $this->project->getProjectId(),
                $event_id,
                $this->record_id,
                "{$form}_complete"
            ]);
            $row = $result->fetch_assoc();
            return $row["count"];
        }
        else {
            return null;
        }

    }

    /**
     * Gets the last instance number of the form. Returns null if the form does not exist or is not repeating, and 0 if there are no instances saved yet.
     * @param string $form The form name.
     * @param string|int $event The event name or event id.
     * @return null|int
     */
    public function getFormLastInstanceNumber($form, $event) {
        if ($this->project->hasForm($form) && 
            $this->project->isFormRepeating($form, $event) &&
            $this->project->hasEvent($event)) {
            $event_id = $this->project->getEventId($event);
            $sql = "
                SELECT IF(`instance` IS NULL, 1, `instance`) AS instance 
                FROM redcap_data 
                WHERE `project_id` = ? AND 
                      `event_id` = ? AND 
                      `record` = ? AND 
                      `field_name` = ? 
                ORDER BY instance DESC 
                LIMIT 1";
            $result = $this->framework->query($sql, [
                $this->project->getProjectId(),
                $event_id,
                $this->record_id,
                "{$form}_complete"
            ]);
            $row = $result->fetch_assoc();
            return $row == null ? 0 : $row["instance"];
        }
        else {
            return null;
        }
    }



}