# Google Authentication Implementation Guide

## Overview
This application now has a complete Google OAuth2 authentication system with user validation that checks:
1. Email exists in the users table
2. User has a valid role assigned
3. User account is active (is_active = TRUE)

## Key Features
✅ Google Sign-In Integration
✅ JWT Token-based Sessions
✅ Backend Token Verification
✅ User Validation Chain
✅ Protected Routes with Middleware
✅ Role-based Access Control
✅ Automatic Session Management

## Setup Instructions

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google+ API
4. Navigate to **Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Configure OAuth consent screen:
   - Add your app name
   - Add authorized domains
   - Add required scopes (email, profile)
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized JavaScript origins:
     - `http://localhost:3000` (development)
     - Your production domain
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback`
     - Your production callback URL

### 2. Environment Variables
Update your `.env.local` file:

```env
# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# JWT Secret for session management
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Existing Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Database Requirements
Ensure your `users` table has these fields:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    google_id VARCHAR(255),
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_is_active ON users(is_active);
```

## File Structure

### Backend API Routes
- `/app/api/auth/google/route.ts` - Handles Google token verification and user validation
- `/app/api/auth/verify/route.ts` - Verifies JWT tokens for protected routes

### Authentication Services
- `/lib/auth/google-auth-service.ts` - Google authentication service with token management
- `/lib/auth/auth-context.tsx` - Updated auth context with Google support

### UI Components
- `/components/google-sign-in-button.tsx` - Reusable Google Sign-In button
- `/app/login/page.tsx` - Updated login page with Google authentication

### Protection & Security
- `/middleware.ts` - Route protection middleware
- `/hooks/use-auth-guard.ts` - React hook for client-side route protection
- `/app/unauthorized/page.tsx` - Unauthorized access page

### Testing
- `/app/test-google-auth/page.tsx` - Test page to verify authentication flow

## Authentication Flow

1. **User clicks "Continue with Google"**
   - Google Sign-In button is rendered
   - User selects their Google account

2. **ID Token sent to backend**
   - `/api/auth/google` receives the Google ID token
   - Token is verified using Google Auth Library

3. **User Validation Chain**
   ```
   Google Token Valid? → Email in DB? → Role Assigned? → Is Active? → Access Granted
                    ↓            ↓             ↓            ↓
              Invalid Token  Not Found   No Role    Inactive
                    ↓            ↓             ↓            ↓
                  Denied       Denied       Denied       Denied
   ```

4. **JWT Session Created**
   - JWT token generated with user data
   - Token stored in localStorage
   - User redirected to dashboard

5. **Protected Route Access**
   - Middleware checks JWT token
   - Token verified on each request
   - User active status re-validated

## User Access Control

### Access Denied Scenarios
Users will see "This user cannot access the portal" when:
- Email not found in users table
- No role assigned to user
- Account is inactive (is_active = FALSE)

### Managing Users
Administrators must:
1. Add user email to the users table
2. Assign appropriate role
3. Set is_active = TRUE

Example:
```sql
-- Add a new user
INSERT INTO users (email, role, is_active, name)
VALUES ('user@example.com', 'admin', true, 'John Doe');

-- Activate existing user
UPDATE users
SET is_active = true
WHERE email = 'user@example.com';

-- Deactivate user
UPDATE users
SET is_active = false
WHERE email = 'user@example.com';
```

## Testing the Implementation

1. **Navigate to Test Page**
   ```
   http://localhost:3000/test-google-auth
   ```

2. **Test Authentication Flow**
   - Click "Sign In with Google"
   - Select your Google account
   - Check authentication state
   - Test token verification
   - Test protected API calls

3. **Verify Access Control**
   - Test with user in database (should succeed)
   - Test with user not in database (should show error)
   - Test with inactive user (should show error)

## Security Features

1. **Token Verification**
   - Google ID tokens verified server-side
   - JWT tokens for session management
   - Tokens expire after 24 hours

2. **Route Protection**
   - Middleware protects all routes except public ones
   - Client-side guards for additional protection
   - Role-based access control support

3. **User Validation**
   - Real-time active status checking
   - Database validation on each protected request
   - Immediate access revocation when deactivated

## Troubleshooting

### Common Issues

1. **"Google Sign-In not available"**
   - Check NEXT_PUBLIC_GOOGLE_CLIENT_ID is set
   - Ensure Google script is loaded

2. **"This user cannot access the portal"**
   - Verify user email exists in database
   - Check user has role assigned
   - Confirm is_active = TRUE

3. **Token verification fails**
   - Check JWT_SECRET is set
   - Verify token hasn't expired
   - Ensure backend routes are accessible

4. **Redirect loops**
   - Clear browser localStorage
   - Check middleware configuration
   - Verify public routes list

## Production Deployment

1. **Update OAuth Credentials**
   - Add production domain to authorized origins
   - Add production callback URLs

2. **Environment Variables**
   - Set production Google credentials
   - Use strong JWT_SECRET
   - Configure Supabase production keys

3. **Security Headers**
   - Add Content Security Policy for Google
   - Configure CORS for your domain

4. **Monitoring**
   - Log authentication attempts
   - Monitor failed login patterns
   - Track user activation/deactivation

## API Reference

### POST /api/auth/google
Verifies Google ID token and creates session

**Request:**
```json
{
  "idToken": "google-id-token"
}
```

**Success Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "admin"
  }
}
```

**Error Response:**
```json
{
  "error": "This user cannot access the portal",
  "details": "User not found in the system"
}
```

### POST /api/auth/verify
Verifies JWT token validity

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response:**
```json
{
  "valid": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "admin"
  }
}
```

## Support
For issues or questions, contact the JKKN COE administrator.