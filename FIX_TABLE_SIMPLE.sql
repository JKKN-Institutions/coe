-- SIMPLE FIX FOR USERS TABLE
-- This will disable RLS temporarily to allow access

-- Step 1: Disable RLS completely (temporary fix)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Add your user (CHANGE THE EMAIL!)
INSERT INTO users (
  email,
  full_name,
  username,
  role,
  is_super_admin,
  is_active,
  is_verified,
  institution_id
)
VALUES (
  'your-email@gmail.com',  -- ⚠️ CHANGE THIS TO YOUR GOOGLE EMAIL!
  'Admin User',
  'your-email@gmail.com',  -- ⚠️ CHANGE THIS TOO!
  'admin',
  true,
  true,
  true,
  '1'
)
ON CONFLICT (email)
DO UPDATE SET
  role = 'admin',
  is_super_admin = true,
  is_active = true,
  is_verified = true;

-- Step 3: Verify
SELECT
  'Success! User added. You can now login.' as message,
  email,
  role,
  is_active
FROM users
WHERE email = 'your-email@gmail.com';  -- ⚠️ CHANGE THIS TO MATCH YOUR EMAIL!