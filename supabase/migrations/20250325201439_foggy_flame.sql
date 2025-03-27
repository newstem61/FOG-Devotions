/*
  # Remove reset_user_progress function
  
  1. Changes
    - Drop the reset_user_progress function as we're now handling resets directly in the application
    - This avoids potential transaction/timeout issues with the function
*/

DROP FUNCTION IF EXISTS reset_user_progress(uuid);