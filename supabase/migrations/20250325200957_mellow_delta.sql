/*
  # Fix reset user progress function

  1. Changes
    - Add proper transaction handling
    - Add input validation
    - Add explicit error handling
    - Add row-level security checks

  2. Security
    - Function is security definer to bypass RLS
    - Validates user can only reset their own progress
*/

CREATE OR REPLACE FUNCTION reset_user_progress(user_id_param uuid)
RETURNS user_reading_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result user_reading_progress;
  auth_user_id uuid;
BEGIN
  -- Get authenticated user ID
  auth_user_id := auth.uid();
  
  -- Verify user is resetting their own progress
  IF auth_user_id IS NULL OR auth_user_id != user_id_param THEN
    RAISE EXCEPTION 'Unauthorized: Can only reset your own progress';
  END IF;

  -- Start transaction
  BEGIN
    -- Delete all notes for the user
    DELETE FROM devotion_notes
    WHERE user_id = user_id_param;

    -- Reset progress
    UPDATE user_reading_progress
    SET 
      start_date = CURRENT_DATE,
      current_devotion = 1,
      updated_at = NOW()
    WHERE user_id = user_id_param
    RETURNING * INTO result;

    -- Verify update succeeded
    IF result IS NULL THEN
      RAISE EXCEPTION 'Failed to reset progress: User not found';
    END IF;

    RETURN result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Roll back transaction on any error
      RAISE EXCEPTION 'Reset failed: %', SQLERRM;
  END;
END;
$$;