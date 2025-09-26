-- JKKN COE Users Table Creation Script
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop existing table if it exists
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Create the users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  location TEXT,
  date_of_birth DATE,
  phone VARCHAR(20),
  phone_number VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT TRUE,
  role VARCHAR(50) DEFAULT 'user',
  institution_id VARCHAR(255),
  is_super_admin BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  profile_completed BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies (Fixed to avoid recursion)
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Service role can manage all users" ON users
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Simplified admin policies to avoid recursion
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN (
      SELECT email FROM users WHERE role = 'admin' OR is_super_admin = true
    )
  );

CREATE POLICY "Admins can manage users" ON users
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN (
      SELECT email FROM users WHERE role = 'admin' OR is_super_admin = true
    )
  );

-- Step 5: Create Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_institution_id ON users(institution_id);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Step 6: Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Create function to set username from email
CREATE OR REPLACE FUNCTION set_username_from_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username = NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger for username
CREATE TRIGGER set_users_username
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_username_from_email();

-- Step 10: Insert initial admin user (replace email with your email)
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
  'admin@jkkn.ac.in',  -- Change this to your email
  'System Administrator',
  'admin',
  true,
  true,
  true,
  '1'
)
ON CONFLICT (email) DO UPDATE
SET
  role = EXCLUDED.role,
  is_super_admin = EXCLUDED.is_super_admin,
  is_active = EXCLUDED.is_active,
  is_verified = EXCLUDED.is_verified;

-- Verify the table was created
SELECT
  'Table created successfully!' as status,
  COUNT(*) as user_count
FROM users;