/*
  # Fix note deletion policies

  1. Changes
    - Add delete policy for devotion_notes table
    - Ensure users can delete their own notes
    - Fix verification query to work with RLS

  2. Security
    - Maintain RLS protection
    - Only allow users to delete their own notes
*/

-- Add delete policy for devotion_notes
CREATE POLICY "Users can delete own notes"
  ON devotion_notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);