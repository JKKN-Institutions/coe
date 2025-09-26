# OAuth Error Troubleshooting Guide

## 🚨 Current Error
```
Error updating user profile: {}
```

This error occurs during Google OAuth callback when trying to update an existing user profile.

## 🔍 Root Cause Analysis

The error is likely caused by one of these issues:

1. **RLS (Row Level Security) Policy Issues**
   - The user doesn't have permission to update their own profile
   - RLS policies are too restrictive

2. **Database Connection Issues**
   - Service role key not properly configured
   - Network connectivity problems

3. **Data Type Mismatches**
   - Invalid data being passed to the update query
   - Missing required fields

## 🛠️ Solutions Implemented

### 1. **Simplified OAuth Callback** ✅
- Removed complex profile updates during OAuth callback
- For existing users, just use the existing profile
- Background updates for non-critical fields (last_login)

### 2. **Enhanced Error Handling** ✅
- Added detailed logging for debugging
- Graceful fallback to existing profile
- Better error messages in console

### 3. **Debug Tools** ✅
- Added `/api/debug-oauth` endpoint
- Enhanced test page with debug functionality
- Database structure inspection

## 🧪 Testing Steps

### Step 1: Test Database Connection
1. Go to `http://localhost:3000/test-auth`
2. Click "Debug OAuth"
3. Check the response for any database issues

### Step 2: Test Google OAuth
1. Go to `http://localhost:3000/login`
2. Click "Continue with Google"
3. Complete the OAuth flow
4. Check browser console for detailed logs

### Step 3: Check User Creation
1. After successful OAuth, check Supabase dashboard
2. Go to "Authentication" → "Users"
3. Verify the user was created
4. Check the "users" table in the database

## 🔧 Manual Fixes

### Fix 1: Update RLS Policies
Run this SQL in your Supabase SQL Editor:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create a more permissive policy
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

-- Also allow service role to update any user
CREATE POLICY "Service role can update users" ON users
  FOR UPDATE USING (auth.role() = 'service_role');
```

### Fix 2: Verify Service Role Key
1. Go to Supabase Dashboard → Settings → API
2. Copy the "service_role" key
3. Update your `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
   ```

### Fix 3: Check Database Schema
Ensure your users table has the correct structure:

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public';
```

## 🐛 Debug Information

### Console Logs to Check
When testing OAuth, look for these logs in the browser console:

1. **OAuth Callback Start:**
   ```
   Creating new user profile for OAuth user: [user-id]
   ```
   or
   ```
   Using existing user profile for OAuth user: [user-id]
   ```

2. **Profile Creation/Update:**
   ```
   Updating user profile with data: {...}
   User ID: [user-id]
   ```

3. **Errors:**
   ```
   Error updating user profile: [error-details]
   ```

### API Debug Endpoint
Visit `http://localhost:3000/api/debug-oauth` to get:
- Database connection status
- RLS policy information
- Table structure details
- Environment configuration

## 🔄 Alternative Approach

If the issue persists, you can use this simplified OAuth callback:

```typescript
// Simplified version that doesn't update profiles
async handleOAuthCallback(): Promise<{ user: SupabaseUser | null; error: string | null }> {
  try {
    const { data, error } = await this.supabase.auth.getSession();
    
    if (error || !data.session?.user) {
      return { user: null, error: 'No active session' };
    }

    const authUser = data.session.user;
    
    // Just create a basic user object from auth data
    const user: SupabaseUser = {
      id: authUser.id,
      email: authUser.email || '',
      full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'User',
      phone_number: authUser.user_metadata?.phone_number,
      role: 'user',
      institution_id: null,
      is_super_admin: false,
      permissions: {},
      profile_completed: false,
      avatar_url: authUser.user_metadata?.avatar_url,
      last_login: new Date().toISOString(),
      created_at: authUser.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.setUser(user);
    this.setSession({
      id: data.session.access_token,
      expires_at: data.session.expires_at?.toString() || '',
      created_at: new Date().toISOString(),
    });

    return { user, error: null };
  } catch (error) {
    console.error('OAuth callback error:', error);
    return { user: null, error: 'OAuth callback failed' };
  }
}
```

## 📞 Next Steps

1. **Test the current fix** - The simplified OAuth callback should work now
2. **Check debug logs** - Use the debug tools to identify any remaining issues
3. **Update RLS policies** - If needed, run the SQL fixes above
4. **Verify service role key** - Ensure it's correctly configured

## ✅ Success Indicators

You'll know the fix worked when:
- Google OAuth completes without errors
- User is redirected to dashboard
- No "Error updating user profile" in console
- User appears in Supabase Authentication users list

---

**Note**: The current implementation prioritizes functionality over perfect data sync. User profiles will be created/used without complex updates during OAuth callback, which should resolve the immediate error.
