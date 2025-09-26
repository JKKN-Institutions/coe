# Fix for Infinite Recursion RLS Policy Error

## Issue
The error "infinite recursion detected in policy for relation 'users'" occurs when Row Level Security policies reference the users table in a way that creates a circular dependency.

## Immediate Solution Applied
1. **Temporary Bypass**: The application now detects this error and creates a minimal user object from authentication data, allowing users to continue using the app while the database issue is resolved.

2. **Error Message**: You'll see in the console:
   ```
   RLS Policy Error: Infinite recursion detected. Please run FIX_RLS_COMPLETE.sql in Supabase SQL Editor to fix this issue.
   ```

## Permanent Database Fix

### Steps to Fix the Database:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor tab

2. **Run the Fix Script**
   - Open the file `FIX_RLS_COMPLETE.sql` in this directory
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click "Run" to execute

3. **What the Script Does:**
   - Temporarily disables RLS on the users table
   - Removes ALL existing policies (which are causing the recursion)
   - Re-enables RLS
   - Creates new, simple, non-recursive policies
   - Grants proper permissions

4. **Verify the Fix**
   - After running the script, refresh your application
   - The error should no longer appear
   - Users should be able to authenticate normally

## Alternative Quick Fix (If the above doesn't work)

If you continue to have issues, you can temporarily disable RLS entirely:

```sql
-- TEMPORARY: Disable RLS completely (NOT RECOMMENDED for production)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

Then work on creating proper policies one by one.

## Prevention
To avoid this issue in the future:
- Never create policies that reference the same table in complex ways
- Keep policies simple and use `auth.uid()` or `auth.jwt()` for authentication checks
- Avoid policies that check user properties by querying the users table itself
- Test policies incrementally, adding one at a time

## Support
If the issue persists after running the fix script, check:
1. The Supabase logs for any other policy-related errors
2. Ensure all old policies were properly removed
3. Consider reaching out to Supabase support with the error details