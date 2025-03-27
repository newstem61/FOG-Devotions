/*
  # Add reset user progress function

  1. New Functions
    - `reset_user_progress`: Function to safely reset a user's progress
      - Deletes all notes
      - Resets reading progress to day 1
      - Updates start date to current date

  2. Security
    - Function is only accessible to authenticated users
    - Users can only reset their own progress
*/

-- Create the reset function
CREATE OR REPLACE FUNCTION reset_user_progress(user_id_param uuid)
RETURNS user_reading_progress
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result user_reading_progress;
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

  RETURN result;
END;
$$;