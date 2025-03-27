-- Add completed_devotions column to user_reading_progress if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_reading_progress' 
    AND column_name = 'completed_devotions'
  ) THEN
    ALTER TABLE user_reading_progress 
    ADD COLUMN completed_devotions integer[] DEFAULT '{}';
  END IF;
END $$;

-- Update reset_user_progress function to handle completed_devotions
CREATE OR REPLACE FUNCTION reset_user_progress(user_id_param uuid, new_start_date date DEFAULT CURRENT_DATE)
RETURNS SETOF user_reading_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result user_reading_progress;
BEGIN
  -- Verify user is authenticated and resetting their own progress
  IF auth.uid() IS NULL OR auth.uid() != user_id_param THEN
    RAISE EXCEPTION 'Unauthorized: Can only reset your own progress';
  END IF;

  -- Lock the user's rows to prevent concurrent modifications
  PERFORM pg_advisory_xact_lock(hashtext('reset_user_progress' || user_id_param::text));

  -- Delete all notes
  DELETE FROM devotion_notes
  WHERE user_id = user_id_param;

  -- Reset progress
  UPDATE user_reading_progress
  SET 
    start_date = new_start_date,
    current_devotion = 1,
    completed_devotions = '{}',
    updated_at = NOW()
  WHERE user_id = user_id_param
  RETURNING * INTO result;

  -- Verify update succeeded
  IF result IS NULL THEN
    RAISE EXCEPTION 'Failed to reset progress: User not found';
  END IF;

  -- Return the result
  RETURN NEXT result;
  RETURN;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Reset failed for user %: %', user_id_param, SQLERRM;
    RAISE;
END;
$$;