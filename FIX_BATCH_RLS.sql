-- Fix Row Level Security for batch table
-- Run this script in Supabase SQL Editor

-- Option 1: Disable RLS entirely (simplest solution for development)
ALTER TABLE batch DISABLE ROW LEVEL SECURITY;

-- Option 2: If you need RLS, create permissive policies
-- First, enable RLS
-- ALTER TABLE batch ENABLE ROW LEVEL SECURITY;

-- Then create policies that allow all operations for authenticated users
-- DROP POLICY IF EXISTS "Enable read access for all users" ON batch;
-- DROP POLICY IF EXISTS "Enable insert for all users" ON batch;
-- DROP POLICY IF EXISTS "Enable update for all users" ON batch;
-- DROP POLICY IF EXISTS "Enable delete for all users" ON batch;

-- CREATE POLICY "Enable read access for all users" ON batch
--   FOR SELECT USING (true);

-- CREATE POLICY "Enable insert for all users" ON batch
--   FOR INSERT WITH CHECK (true);

-- CREATE POLICY "Enable update for all users" ON batch
--   FOR UPDATE USING (true) WITH CHECK (true);

-- CREATE POLICY "Enable delete for all users" ON batch
--   FOR DELETE USING (true);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'batch'
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'batch';

-- View existing policies (if any)
SELECT * FROM pg_policies WHERE tablename = 'batch';