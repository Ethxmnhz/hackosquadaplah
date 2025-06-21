/*
  # Add Challenge Metadata Fields

  1. New Fields
    - Add short_description, scenario, learning_objectives, tools_required, and references fields to challenges table
    - Add hints and solution_explanation fields to challenge_questions table

  2. Changes
    - These fields will store additional metadata for challenges
    - This allows for a more comprehensive challenge experience
    - Enables better display of challenge information on the solving page
*/

-- Add new fields to challenges table
ALTER TABLE IF EXISTS challenges
ADD COLUMN IF NOT EXISTS short_description text,
ADD COLUMN IF NOT EXISTS scenario text,
ADD COLUMN IF NOT EXISTS learning_objectives text[],
ADD COLUMN IF NOT EXISTS tools_required text[],
ADD COLUMN IF NOT EXISTS references text[];

-- Add new fields to challenge_questions table
ALTER TABLE IF EXISTS challenge_questions
ADD COLUMN IF NOT EXISTS hints text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS solution_explanation text;

-- Update existing challenges with sample data (optional)
UPDATE challenges
SET 
  short_description = 'A brief introduction to the challenge',
  scenario = 'You are a security researcher who discovered a vulnerable web application...',
  learning_objectives = ARRAY['Learn SQL injection basics', 'Understand authentication bypasses'],
  tools_required = ARRAY['Web browser', 'Burp Suite'],
  references = ARRAY['https://owasp.org/www-community/attacks/SQL_Injection', 'https://portswigger.net/web-security/sql-injection']
WHERE short_description IS NULL
LIMIT 10;

-- Update existing questions with sample hints (optional)
UPDATE challenge_questions
SET 
  hints = ARRAY['Look at the login form', 'Try special SQL characters'],
  solution_explanation = 'The solution involves using a SQL injection payload like admin\' --'
WHERE hints IS NULL OR hints = '{}'
LIMIT 20;