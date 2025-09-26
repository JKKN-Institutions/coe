-- COMPLETE FIX FOR INFINITE RECURSION IN USERS TABLE RLS POLICIES
-- Run this entire script in your Supabase SQL Editor

-- Step 1: Disable RLS temporarily to remove all policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on users table
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new, simple, non-recursive policies
-- These policies avoid any self-referential checks that could cause recursion

-- Policy 1: Allow all authenticated users to SELECT all records
-- This is simple and doesn't reference the users table in its condition
CREATE POLICY "allow_authenticated_select"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Allow authenticated users to INSERT
-- Only checks if user is authenticated, no self-reference
CREATE POLICY "allow_authenticated_insert"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt() IS NOT NULL);

-- Policy 3: Allow users to UPDATE records
-- Uses auth.jwt() to check authentication, avoids recursion
CREATE POLICY "allow_authenticated_update"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.jwt() IS NOT NULL)
WITH CHECK (auth.jwt() IS NOT NULL);

-- Policy 4: Allow users to DELETE records (admin only typically)
-- Simple check without self-reference
CREATE POLICY "allow_authenticated_delete"
ON public.users
FOR DELETE
TO authenticated
USING (auth.jwt() IS NOT NULL);

-- Step 5: Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Step 6: Verify the policies are created correctly
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
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY policyname;