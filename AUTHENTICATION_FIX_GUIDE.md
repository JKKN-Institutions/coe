# Authentication Fix Guide: "User not found in the system" Error

## Problem Description

You're encountering the error: **"This user cannot access the portal. User not found in the system."**

This error occurs because the JKKN COE Portal uses a **pre-authorized user system**. Users must be added to the database **before** they can login with Google OAuth.

## Root Cause Analysis

Looking at the authentication flow in `lib/auth/supabase-auth-service.ts`, here's what happens:

1. User clicks "Login with Google"
2. Google OAuth redirects back to the app with user data
3. The system checks if the user's email exists in the `users` table
4. **If email is NOT found** → Error: "User not found in the system"
5. **If email is found BUT inactive** → Error: "User account is inactive"
6. **If email is found AND active** → Login successful

## Quick Fix Solutions

### Option 1: Add User via SQL (Recommended for immediate fix)

1. **Go to your Supabase Dashboard** → SQL Editor
2. **Use the pre-made script** located at `scripts/add-user.sql`
3. **Replace the placeholder values:**

```sql
INSERT INTO users (
    email,
    full_name,
    phone_number,
    role,
    institution_id,
    is_super_admin,
    is_active,
    permissions,
    profile_completed,
    created_at,
    updated_at
) VALUES (
    'your-google-email@gmail.com',  -- ⚠️ REPLACE THIS
    'Your Full Name',               -- ⚠️ REPLACE THIS
    NULL,                           -- Phone (optional)
    'admin',                        -- Role: admin/teacher/student/user
    'JKKN-COE',                    -- Institution
    true,                          -- Super admin (true for full access)
    true,                          -- ✅ MUST be true for login
    '{"users.view": true, "users.create": true, "users.edit": true, "users.delete": true, "courses.view": true, "courses.create": true, "courses.edit": true, "courses.delete": true}',
    false,                         -- Profile completed
    NOW(),                         -- Created at
    NOW()                          -- Updated at
);
```

4. **Click "Run"** to execute the SQL
5. **Verify the user was added:**

```sql
SELECT id, email, full_name, role, is_active, created_at
FROM users
WHERE email = 'your-google-email@gmail.com';
```

### Option 2: Use the Admin Script (Recommended for ongoing management)

1. **Install dependencies:**
```bash
npm install @supabase/supabase-js dotenv
```

2. **Ensure you have the service role key** in `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

3. **Run the admin script:**
```bash
node scripts/admin-add-user.js
```

4. **Follow the interactive prompts** to add the user

### Option 3: Use the Existing Web Interface

1. **Login as an existing admin user** (if you have one)
2. **Navigate to** `/users/add` in your application
3. **Fill out the user form** to add the new user
4. **Ensure `is_active` is set to `true`**

## Understanding User Roles and Permissions

### Available Roles:
- **`admin`** - Full system access
- **`teacher`** - Can manage courses and students
- **`student`** - Can view courses and submit assignments
- **`user`** - Basic portal access

### Key Fields Required for Login:
1. **`email`** - Must match the Google account email exactly
2. **`is_active`** - Must be `true` (this is the critical field!)
3. **`role`** - Must be set to a valid role

### Admin Permissions (JSON):
```json
{
  "users.view": true,
  "users.create": true,
  "users.edit": true,
  "users.delete": true,
  "courses.view": true,
  "courses.create": true,
  "courses.edit": true,
  "courses.delete": true,
  "batches.view": true,
  "batches.create": true,
  "batches.edit": true,
  "batches.delete": true,
  "regulations.view": true,
  "regulations.create": true,
  "regulations.edit": true,
  "regulations.delete": true
}
```

## Step-by-Step Fix Process

### Step 1: Identify the Google Email
The email that appears in the error log is the email trying to authenticate. Check your browser console or server logs for messages like:
```
Google OAuth login denied - user not found: user@example.com
```

### Step 2: Add the User to Database
Use one of the three options above to add the user with:
- Exact email address from the error
- Appropriate role
- `is_active = true`

### Step 3: Verify the Fix
1. **Check the user was added:**
```sql
SELECT * FROM users WHERE email = 'the-email@example.com';
```

2. **Test login** - Have the user try logging in again

## Common Issues and Solutions

### Issue: "User account is inactive"
**Solution:** Update the user's `is_active` field:
```sql
UPDATE users SET is_active = true WHERE email = 'user@example.com';
```

### Issue: "User role not assigned"
**Solution:** Set a valid role:
```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

### Issue: Service role key missing
**Error:** "Missing Supabase environment variables"
**Solution:** Add `SUPABASE_SERVICE_ROLE_KEY` to your `.env.local`

### Issue: RLS (Row Level Security) blocking access
**Solution:** Ensure you're using the service role key (not anon key) for admin operations

## Database Schema Reference

The `users` table structure:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  role VARCHAR(50) DEFAULT 'user',
  institution_id VARCHAR(255),
  is_super_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,  -- ⚠️ Critical for login
  permissions JSONB DEFAULT '{}',
  profile_completed BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Files and Scripts Created

1. **`scripts/add-user.sql`** - SQL script for manual user addition
2. **`scripts/admin-add-user.js`** - Interactive Node.js script for user management
3. **`AUTHENTICATION_FIX_GUIDE.md`** - This comprehensive guide

## Next Steps After Adding Users

1. **Test the login** to ensure it works
2. **Document the process** for your team
3. **Consider creating a first admin user** who can then manage other users through the web interface
4. **Set up proper backup procedures** for your user database

## Security Notes

- Never commit service role keys to version control
- Use environment variables for sensitive credentials
- Regularly audit user permissions and roles
- Monitor login attempts and user activity

---

**Need Help?** Check the authentication flow in `lib/auth/supabase-auth-service.ts` lines 209-224 for the exact logic that validates users during Google OAuth login.