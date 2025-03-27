/*
  # Add personal notes for devotions

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
    - Add policies for users to manage their own notes
*/

CREATE TABLE IF NOT EXISTS devotion_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  devotion_id integer NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE devotion_notes ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own notes
CREATE POLICY "Users can read own notes"
  ON devotion_notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to insert their own notes
CREATE POLICY "Users can insert own notes"
  ON devotion_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own notes
CREATE POLICY "Users can update own notes"
  ON devotion_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS devotion_notes_user_devotion_idx 
  ON devotion_notes (user_id, devotion_id);