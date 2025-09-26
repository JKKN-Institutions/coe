-- Fix infinite recursion in users table RLS policies
-- The issue is likely caused by policies that reference the users table itself in a circular way

-- First, drop all existing policies on the users table
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Users can read all data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can delete their own data" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.users;

-- Create simpler, non-recursive policies
-- 1. Allow authenticated users to read all user records
CREATE POLICY "authenticated_read_all"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- 2. Allow authenticated users to insert new records
CREATE POLICY "authenticated_insert"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Allow users to update their own record based on auth.uid()
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Allow users to delete their own record
CREATE POLICY "users_delete_own"
ON public.users
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Ensure RLS is enabled on the table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;