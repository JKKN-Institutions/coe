# JKKN COE Authentication Setup

This document explains how to set up and use the new Supabase-based authentication system.

## 🚀 Quick Start

### 1. Environment Setup
Your `.env.local` file should contain:
```env
NEXT_PUBLIC_SUPABASE_URL=https://ndnulujelcnnnhydfyum.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. Database Setup
Run the SQL script in your Supabase SQL Editor:

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/ndnulujelcnnnhydfyum/sql)
2. Copy and paste the contents of `lib/setup-users-table.sql`
3. Execute the SQL

### 3. Test the Application
1. Start the development server: `npm run dev`
2. Visit `http://localhost:3000/test-auth` to test the connection
3. Visit `http://localhost:3000/login` to test user registration/login

## 🔧 Features

### Authentication Methods
- **Email/Password Login**: Direct authentication with Supabase
- **User Registration**: New users can create accounts
- **Session Management**: Automatic token refresh
- **Role-Based Access**: Permission system maintained

### User Management
- Users are stored in the `users` table
- Each user has a role and permissions
- Profile information is managed
- Last login tracking

### Security
- Row Level Security (RLS) enabled
- Users can only access their own data
- Service role can manage all users
- Secure password handling

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  role VARCHAR(50) DEFAULT 'user',
  institution_id VARCHAR(255),
  is_super_admin BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '{}',
  profile_completed BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🧪 Testing

### Test Pages
- `/test-auth` - Test Supabase connection and view user details
- `/login` - User registration and login interface

### Test Flow
1. **Connection Test**: Verify Supabase connectivity
2. **User Registration**: Create a new user account
3. **User Login**: Authenticate with credentials
4. **Session Verification**: Check authentication state

## 🔄 Migration from Parent App

The application has been migrated from parent app authentication to direct Supabase authentication:

### What Changed
- ✅ Removed parent app dependency
- ✅ Added direct Supabase authentication
- ✅ Updated login page with email/password form
- ✅ Maintained role and permission system
- ✅ Added user registration functionality

### What Stayed the Same
- ✅ User interface design
- ✅ Role-based access control
- ✅ Permission system
- ✅ Session management
- ✅ Dashboard functionality

## 🛠️ Troubleshooting

### Common Issues

1. **"Module not found: Can't resolve '@/components/ui/alert'"**
   - Fixed by creating the missing Alert component
   - Alternative error display implemented

2. **"Users table does not exist"**
   - Run the SQL script in Supabase SQL Editor
   - Check database permissions

3. **"Authentication failed"**
   - Verify Supabase environment variables
   - Check network connectivity
   - Ensure RLS policies are set up correctly

### Debug Steps
1. Check browser console for errors
2. Verify environment variables
3. Test Supabase connection at `/test-auth`
4. Check Supabase logs in dashboard

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Testing
- `GET /api/test-supabase-auth` - Test Supabase connection

## 🔐 Security Considerations

- Passwords are handled securely by Supabase Auth
- RLS policies prevent unauthorized data access
- Service role key should be kept secure
- Regular security audits recommended

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review Supabase logs
3. Test with the provided test pages
4. Verify database setup

---

**Note**: This authentication system replaces the previous parent app integration and provides direct user management through Supabase.
