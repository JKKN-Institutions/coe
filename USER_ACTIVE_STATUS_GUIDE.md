# User Active Status Control Guide

## 🔒 Overview

The JKKN COE application now includes an `is_active` field that controls user authentication. Only users with `is_active = TRUE` can login to the system. This provides administrators with granular control over user access.

## ✅ Implementation Details

### 1. **Database Schema Changes** ✅
- **Added Field**: `is_active BOOLEAN NOT NULL DEFAULT true`
- **Index**: Created for better query performance
- **Migration**: SQL script provided for existing databases

### 2. **Authentication Logic** ✅
- **Login Validation**: Checks `is_active` status before allowing login
- **OAuth Support**: Google OAuth also respects `is_active` status
- **Error Messages**: Clear messaging for inactive accounts

### 3. **User Interface** ✅
- **Test Page**: `/test-user-status` for testing functionality
- **Status Display**: Shows user active/inactive status
- **Admin Tools**: Database commands for user management

## 🗄️ Database Schema

### Users Table Structure
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR NOT NULL,
  phone_number VARCHAR,
  role VARCHAR NOT NULL,
  institution_id UUID,
  is_super_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,  -- NEW FIELD
  permissions JSONB DEFAULT '{}',
  profile_completed BOOLEAN DEFAULT false,
  avatar_url VARCHAR,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Migration Script
```sql
-- Add is_active field to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing users to be active by default
UPDATE users 
SET is_active = true 
WHERE is_active IS NULL;

-- Make is_active column NOT NULL after setting default values
ALTER TABLE users 
ALTER COLUMN is_active SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
```

## 🔐 Authentication Flow

### 1. **Email/Password Login**
```typescript
// Check user profile from database
const { data: profile, error: profileError } = await this.supabase
  .from('users')
  .select('*')
  .eq('id', data.user.id)
  .single();

// Check if user account is active
if (!profile.is_active) {
  return { user: null, error: 'Your account is inactive. Please contact JKKN COE Admin for assistance.' };
}
```

### 2. **Google OAuth Login**
```typescript
// For existing users, check active status
if (!userProfile.is_active) {
  return { user: null, error: 'Your account is inactive. Please contact JKKN COE Admin for assistance.' };
}

// For new OAuth users, set active by default
is_active: true, // OAuth users are active by default
```

## 🎯 User Experience

### Active Users
- **Login Success**: Normal authentication flow
- **Full Access**: All system features available
- **Status Display**: Green "Active" badge in UI

### Inactive Users
- **Login Blocked**: Authentication fails immediately
- **Clear Message**: "Your account is inactive. Please contact JKKN COE Admin for assistance."
- **No Access**: Cannot access any system features

## 🛠️ Admin Management

### Database Commands

#### Check User Status
```sql
SELECT id, email, full_name, is_active, created_at 
FROM users 
ORDER BY created_at DESC;
```

#### Find Inactive Users
```sql
SELECT id, email, full_name, is_active 
FROM users 
WHERE is_active = false;
```

#### Deactivate User
```sql
UPDATE users 
SET is_active = false, updated_at = NOW() 
WHERE email = 'user@example.com';
```

#### Activate User
```sql
UPDATE users 
SET is_active = true, updated_at = NOW() 
WHERE email = 'user@example.com';
```

#### Bulk Operations
```sql
-- Deactivate all users in a specific role
UPDATE users 
SET is_active = false, updated_at = NOW() 
WHERE role = 'student';

-- Activate all users
UPDATE users 
SET is_active = true, updated_at = NOW() 
WHERE is_active = false;
```

### User Statistics
```sql
-- Count active vs inactive users
SELECT 
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
  COUNT(*) as total_users
FROM users;
```

## 🧪 Testing

### Test Page: `/test-user-status`
- **Current User Status**: Shows logged-in user's active status
- **Test Login Form**: Try logging in with different accounts
- **Database Information**: Schema details and admin commands
- **Real-time Testing**: Immediate feedback on login attempts

### Test Scenarios
1. **Active User Login**
   - Should succeed normally
   - User data should display with "Active" status

2. **Inactive User Login**
   - Should fail with inactive account message
   - No user data should be loaded

3. **OAuth with Inactive User**
   - Should fail even with valid Google credentials
   - Should show inactive account message

## 🔧 Configuration

### Default Behavior
- **New Users**: `is_active = true` by default
- **OAuth Users**: Active by default when created
- **Existing Users**: Migrated to active status

### Error Messages
Customize error messages in:
- `lib/auth/supabase-auth-service.ts` (login method)
- `lib/auth/supabase-auth-service.ts` (OAuth callback)

## 📊 Use Cases

### 1. **Temporary Suspension**
```sql
-- Suspend user temporarily
UPDATE users 
SET is_active = false, updated_at = NOW() 
WHERE email = 'problematic@example.com';
```

### 2. **Role-based Deactivation**
```sql
-- Deactivate all students during exam period
UPDATE users 
SET is_active = false, updated_at = NOW() 
WHERE role = 'student';
```

### 3. **Bulk User Management**
```sql
-- Reactivate all users after maintenance
UPDATE users 
SET is_active = true, updated_at = NOW() 
WHERE is_active = false;
```

### 4. **Institution-wide Control**
```sql
-- Deactivate all users from specific institution
UPDATE users 
SET is_active = false, updated_at = NOW() 
WHERE institution_id = 'institution-uuid';
```

## 🚨 Security Considerations

### 1. **Immediate Effect**
- Status changes take effect immediately
- No need to wait for token expiration
- Users are logged out on next request

### 2. **Audit Trail**
- Track who deactivated/activated users
- Log all status changes
- Monitor suspicious activity

### 3. **Backup Access**
- Ensure admin accounts remain active
- Have multiple admin users
- Document emergency procedures

## 🔄 Integration Points

### 1. **Session Management**
- Inactive users cannot refresh sessions
- Existing sessions remain valid until expiration
- New login attempts are blocked

### 2. **API Endpoints**
- All protected endpoints check user status
- Consistent error responses
- Proper HTTP status codes

### 3. **UI Components**
- Status indicators throughout the app
- Conditional rendering based on status
- Clear messaging for inactive users

## 📈 Monitoring

### Key Metrics
- **Active Users**: Count of users with `is_active = true`
- **Inactive Users**: Count of users with `is_active = false`
- **Login Attempts**: Track failed logins due to inactive status
- **Status Changes**: Monitor admin actions

### Alerts
- **High Inactive Count**: Alert if too many users are inactive
- **Suspicious Activity**: Monitor rapid status changes
- **Admin Actions**: Log all status modifications

## 🛡️ Best Practices

### 1. **Admin Procedures**
- Always verify before deactivating users
- Document reasons for status changes
- Notify users before deactivation when possible

### 2. **Database Maintenance**
- Regular cleanup of inactive users
- Archive old inactive accounts
- Monitor database performance

### 3. **User Communication**
- Clear messaging about account status
- Provide contact information for reactivation
- Explain the process for regaining access

---

**Note**: The `is_active` field provides powerful control over user access. Use it responsibly and always maintain proper audit trails for administrative actions. This feature enhances security while providing flexibility for user management in the JKKN COE system.
