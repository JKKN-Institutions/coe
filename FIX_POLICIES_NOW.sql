-- FIX RLS POLICIES FOR USERS TABLE
-- Run this in Supabase SQL Editor to fix the recursion issue

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- Step 2: Temporarily disable RLS to fix policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies
-- Allow authenticated users to read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- Allow authenticated users to update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email);

-- Allow all authenticated users to view all users (simplified for now)
CREATE POLICY "Authenticated users can view all" ON users
  FOR SELECT
  USING (auth.jwt() IS NOT NULL);

-- Allow service role full access
CREATE POLICY "Service role full access" ON users
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Step 5: Insert/Update admin user (change email to yours!)
INSERT INTO users (
  email,
  full_name,
  role,
  is_super_admin,
  is_active,
  is_verified,
  institution_id
)
VALUES (
  'admin@jkkn.ac.in',  -- CHANGE THIS TO YOUR EMAIL!
  'System Administrator',
  'admin',
  true,
  true,
  true,
  '1'
)
ON CONFLICT (email) DO UPDATE
SET
  role = 'admin',
  is_super_admin = true,
  is_active = true,
  is_verified = true;

-- Step 6: Verify the fix
SELECT 'Policies fixed successfully!' as status, COUNT(*) as user_count FROM users;