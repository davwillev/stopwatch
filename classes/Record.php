<?php namespace DE\RUB\Utility;

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
                if (!is_string($value) || !is_numeric($value) || !is_bool($value)) {
                    throw new \Exception("Invalid value data type for field '$field'.");
                }
                if ($this->project->getFormByField($field) !== $form) {
                    throw new \Exception("Field '$field' is not on form '$form'.");
                }
            }
        }
        // Build data structure for REDCap::saveData().
        $last_instance = $this->getFormLastInstanceNumber($form, $event);
        



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