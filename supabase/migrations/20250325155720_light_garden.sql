/*
  # Add devotion notes table

  1. New Tables
    - `devotion_notes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `devotion_id` (integer)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `devotion_notes` table
    - Add policies for authenticated users to:
      - Read their own notes
      - Create their own notes
      - Update their own notes
*/

-- Drop existing objects if they exist
DO $$ BEGIN
  -- Drop trigger if it exists
  DROP TRIGGER IF EXISTS update_devotion_notes_updated_at ON devotion_notes;
  
  -- Drop function if it exists
  DROP FUNCTION IF EXISTS update_updated_at_column();
  
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Users can read own notes" ON devotion_notes;
  DROP POLICY IF EXISTS "Users can create own notes" ON devotion_notes;
  DROP POLICY IF EXISTS "Users can update own notes" ON devotion_notes;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS devotion_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  devotion_id integer NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS devotion_notes_user_devotion_idx ON devotion_notes(user_id, devotion_id);

-- Enable RLS
ALTER TABLE devotion_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own notes"
  ON devotion_notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes"
  ON devotion_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON devotion_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_devotion_notes_updated_at
  BEFORE UPDATE ON devotion_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();