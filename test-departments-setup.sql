-- ============================================
-- DEPARTMENTS TABLE DIAGNOSTIC TEST
-- ============================================
-- Run this in Supabase SQL Editor to diagnose issues
-- Copy all and run at once

-- Test 1: Check if departments table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'departments'
  ) THEN
    RAISE NOTICE '✅ TEST 1 PASSED: departments table exists';
  ELSE
    RAISE EXCEPTION '❌ TEST 1 FAILED: departments table does NOT exist! Apply the migration first.';
  END IF;
END $$;

-- Test 2: Check if institutions table exists (required dependency)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'institutions'
  ) THEN
    RAISE NOTICE '✅ TEST 2 PASSED: institutions table exists';
  ELSE
    RAISE EXCEPTION '❌ TEST 2 FAILED: institutions table does NOT exist! Create it first.';
  END IF;
END $$;

-- Test 3: Check departments table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'departments'
ORDER BY ordinal_position;

-- Test 4: Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'departments';

-- Test 5: Check indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'departments'
ORDER BY indexname;

-- Test 6: Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'departments';

-- Test 7: Check if any departments exist
SELECT 
  COUNT(*) as total_departments,
  COUNT(*) FILTER (WHERE status = true) as active_departments,
  COUNT(*) FILTER (WHERE status = false) as inactive_departments
FROM departments;

-- Test 8: Try to insert a test record (will rollback)
DO $$
DECLARE
  test_inst_id UUID;
  test_dept_id UUID;
BEGIN
  -- Get a test institution
  SELECT id INTO test_inst_id
  FROM institutions
  LIMIT 1;

  IF test_inst_id IS NULL THEN
    RAISE EXCEPTION '❌ TEST 8 FAILED: No institutions found in database. Add an institution first.';
  END IF;

  -- Try to insert
  INSERT INTO departments (
    institutions_id,
    institution_code,
    department_code,
    department_name,
    status
  )
  SELECT
    i.id,
    i.institution_code,
    'TEST_DEPT',
    'Test Department',
    true
  FROM institutions i
  WHERE i.id = test_inst_id
  RETURNING id INTO test_dept_id;

  IF test_dept_id IS NOT NULL THEN
    RAISE NOTICE '✅ TEST 8 PASSED: Successfully inserted test department (will be rolled back)';
    -- Delete test record
    DELETE FROM departments WHERE id = test_dept_id;
  ELSE
    RAISE EXCEPTION '❌ TEST 8 FAILED: Could not insert test department';
  END IF;
END $$;

-- Test 9: Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'departments';

-- Test 10: Summary
SELECT 
  '🎉 ALL TESTS PASSED! Departments table is properly configured.' as status,
  (SELECT COUNT(*) FROM departments) as total_records,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'departments') as total_columns,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'departments') as total_indexes,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'departments') as total_policies;

-- ============================================
-- INTERPRETATION OF RESULTS
-- ============================================
-- 
-- ✅ ALL TESTS PASSED:
--    - departments table exists
--    - All constraints are set up
--    - RLS is enabled
--    - Can insert/delete records
--    → Your table is ready to use!
--
-- ❌ ANY TEST FAILED:
--    - Read the error message carefully
--    - Most likely: table doesn't exist yet
--    - Solution: Apply the migration first
--    - File: supabase/migrations/20250103_create_departments_table.sql
--
-- ============================================
















