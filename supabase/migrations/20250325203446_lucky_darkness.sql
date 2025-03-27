/*
  # Fix reset function syntax and improve batch processing

  1. Changes
    - Fix DECLARE block syntax
    - Improve batch processing for note deletion
    - Add proper transaction handling
    - Add timeout protection
    - Add proper error handling

  2. Security
    - Maintain SECURITY DEFINER
    - Keep RLS checks
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS reset_user_progress(uuid);
DROP FUNCTION IF EXISTS reset_user_progress(uuid, date);

-- Create the reset function with improved transaction handling
CREATE OR REPLACE FUNCTION reset_user_progress(user_id_param uuid, new_start_date date DEFAULT CURRENT_DATE)
RETURNS SETOF user_reading_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result user_reading_progress;
  notes_count int;
  start_time timestamptz;
  batch_size int := 100;
  max_duration interval := interval '5 seconds';
BEGIN
  -- Verify user is authenticated and resetting their own progress
  IF auth.uid() IS NULL OR auth.uid() != user_id_param THEN
    RAISE EXCEPTION 'Unauthorized: Can only reset your own progress';
  END IF;

  -- Lock the user's rows to prevent concurrent modifications
  PERFORM pg_advisory_xact_lock(hashtext('reset_user_progress' || user_id_param::text));

  -- Initialize start time
  start_time := clock_timestamp();

  -- Get initial note count
  SELECT COUNT(*) INTO notes_count
  FROM devotion_notes
  WHERE user_id = user_id_param;

  -- Delete notes in batches
  WHILE EXISTS (
    SELECT 1 
    FROM devotion_notes 
    WHERE user_id = user_id_param
    LIMIT 1
  ) AND clock_timestamp() - start_time < max_duration LOOP
    -- Delete a batch of notes
    DELETE FROM devotion_notes
    WHERE id IN (
      SELECT id 
      FROM devotion_notes 
      WHERE user_id = user_id_param 
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );

    -- Check if we've exceeded our time limit
    IF clock_timestamp() - start_time >= max_duration THEN
      RAISE EXCEPTION 'Operation timed out while deleting notes';
    END IF;
  END LOOP;

  -- Verify all notes were deleted
  IF EXISTS (
    SELECT 1 
    FROM devotion_notes 
    WHERE user_id = user_id_param
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Failed to delete all notes within timeout';
  END IF;

  -- Reset progress
  UPDATE user_reading_progress
  SET 
    start_date = new_start_date,
    current_devotion = 1,
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
    -- Log the error details
    RAISE WARNING 'Reset failed for user %: %', user_id_param, SQLERRM;
    -- Re-raise the exception
    RAISE;
END;
$$;