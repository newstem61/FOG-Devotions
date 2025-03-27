-- Create a function to handle the reset process
CREATE OR REPLACE FUNCTION reset_user_progress(
  user_id_param uuid,
  new_start_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all notes for the user
  DELETE FROM devotion_notes
  WHERE user_id = user_id_param;

  -- Reset the user's reading progress
  UPDATE user_reading_progress
  SET 
    start_date = new_start_date,
    current_devotion = 1,
    updated_at = now()
  WHERE user_id = user_id_param;

  -- Return success
  RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reset_user_progress TO authenticated;