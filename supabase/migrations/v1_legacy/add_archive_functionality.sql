-- Add archive functionality to training plans
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add index for archived status
CREATE INDEX IF NOT EXISTS training_plans_archived_idx ON training_plans (archived);

-- Add trigger to set archived_at when archived is set to true
CREATE OR REPLACE FUNCTION set_training_plan_archived_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.archived = true AND OLD.archived = false THEN
    NEW.archived_at = NOW();
  ELSIF NEW.archived = false THEN
    NEW.archived_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_plans_archived_at
  BEFORE UPDATE ON training_plans
  FOR EACH ROW
  EXECUTE FUNCTION set_training_plan_archived_at();