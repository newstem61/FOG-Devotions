/*
  # Add User Reading Progress Table

  1. New Tables
    - `user_reading_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `start_date` (date, when user started reading)
      - `current_devotion` (integer, current devotion number 1-200)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage their own progress
*/

CREATE TABLE IF NOT EXISTS user_reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  current_devotion integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_reading_progress_user_id_key UNIQUE (user_id),
  CONSTRAINT user_reading_progress_current_devotion_check CHECK (current_devotion BETWEEN 1 AND 200)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS user_reading_progress_user_id_idx ON user_reading_progress(user_id);

-- Enable RLS
ALTER TABLE user_reading_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own progress"
  ON user_reading_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress"
  ON user_reading_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_reading_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_user_reading_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_reading_progress_updated_at
  BEFORE UPDATE ON user_reading_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reading_progress_updated_at();