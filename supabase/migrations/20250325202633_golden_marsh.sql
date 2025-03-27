/*
  # Fix reset function for user progress and notes

  1. Changes
    - Drop existing function
    - Create new reset function with proper signature and transaction handling
    - Add proper error handling
    - Add date parameter support

  2. Security
    - Function runs with SECURITY DEFINER
    - Verifies user can only reset their own progress
    - Uses explicit search path for security
*/

-- First drop the existing function
DROP FUNCTION IF EXISTS reset_user_progress(uuid);
DROP FUNCTION IF EXISTS reset_user_progress(uuid, date);

-- Create the new reset function with proper transaction handling
CREATE OR REPLACE FUNCTION reset_user_progress(user_id_param uuid, new_start_date date DEFAULT CURRENT_DATE)
RETURNS SETOF user_reading_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result user_reading_progress;
  notes_count int;
BEGIN
  -- Verify user is authenticated and resetting their own progress
  IF auth.uid() IS NULL OR auth.uid() != user_id_param THEN
    RAISE EXCEPTION 'Unauthorized: Can only reset your own progress';
  END IF;

  -- Start an explicit transaction
  BEGIN
    -- First count existing notes
    SELECT COUNT(*) INTO notes_count
    FROM devotion_notes
    WHERE user_id = user_id_param;

    -- Delete all notes for the user
    DELETE FROM devotion_notes
    WHERE user_id = user_id_param;

    -- Verify notes were deleted
    IF (SELECT COUNT(*) FROM devotion_notes WHERE user_id = user_id_param) > 0 THEN
      RAISE EXCEPTION 'Failed to delete all notes';
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

    -- If we get here, both operations succeeded
    RETURN NEXT result;
    RETURN;
  EXCEPTION
    WHEN OTHERS THEN
      -- Roll back transaction on any error
      RAISE EXCEPTION 'Reset failed: %', SQLERRM;
  END;
END;
$$;