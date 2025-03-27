/*
  # Fix note deletion with cascade and improved policies

  1. Changes
    - Drop existing delete policy
    - Create new delete policy with improved conditions
    - Add cascade delete trigger for user deletion
    - Add function to handle user deletion cleanup

  2. Security
    - Maintain RLS protection
    - Ensure complete cleanup on user deletion
*/

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete own notes" ON devotion_notes;

-- Create improved delete policy
CREATE POLICY "Users can delete own notes"
  ON devotion_notes
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR 
    EXISTS (
      SELECT 1 
      FROM user_reading_progress 
      WHERE user_id = auth.uid() 
      AND user_reading_progress.user_id = devotion_notes.user_id
    )
  );

-- Create function to handle user deletion cleanup
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all notes for the user
  DELETE FROM devotion_notes WHERE user_id = OLD.id;
  
  -- Delete user progress
  DELETE FROM user_reading_progress WHERE user_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger for user deletion
DROP TRIGGER IF EXISTS on_user_deleted ON auth.users;
CREATE TRIGGER on_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON devotion_notes TO authenticated;
GRANT ALL ON user_reading_progress TO authenticated;