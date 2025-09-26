# Create Users Table - Setup Guide

The users table is required for the application to function properly. Follow one of these methods to create it:

## Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ndnulujelcnnnhydfyum

2. Navigate to **SQL Editor** in the left sidebar

3. Copy the entire contents of one of these files:
   - `lib/setup-users-table-fixed.sql`
   - `supabase/migrations/20240109_create_users_table.sql`

4. Paste the SQL into the SQL Editor

5. Click **Run** to execute the SQL

6. You should see a success message indicating the table was created

## Method 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref ndnulujelcnnnhydfyum

# Run the migration
supabase db push
```

## Method 3: Manual Table Creation

If the above methods don't work, you can manually create the table:

1. Go to **Table Editor** in Supabase Dashboard
2. Click **New Table**
3. Name it `users`
4. Add the following columns:

| Column Name | Type | Default | Constraints |
|------------|------|---------|------------|
| id | uuid | gen_random_uuid() | Primary Key |
| email | varchar(255) | | NOT NULL, UNIQUE |
| full_name | varchar(255) | | NOT NULL |
| username | varchar(255) | | UNIQUE |
| avatar_url | text | | |
| bio | text | | |
| website | text | | |
| location | text | | |
| date_of_birth | date | | |
| phone | varchar(20) | | |
| phone_number | varchar(20) | | |
| is_active | boolean | true | |
| is_verified | boolean | true | |
| role | varchar(50) | 'user' | |
| institution_id | varchar(255) | | |
| is_super_admin | boolean | false | |
| permissions | jsonb | {} | |
| preferences | jsonb | {} | |
| metadata | jsonb | {} | |
| profile_completed | boolean | false | |
| last_login | timestamptz | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

5. Enable Row Level Security (RLS)
6. Add the policies as described in the SQL file

## Verify Table Creation

After creating the table, verify it exists:

1. Run the test script:
```bash
node scripts/create-users-table.js
```

2. Or check in Supabase Dashboard > Table Editor

## Troubleshooting Login Issues

Once the users table is created:

1. Make sure you have at least one user in the table with matching email from Google OAuth
2. The user should have `is_active = true` and `is_verified = true`
3. Test login at http://localhost:3000/login

## Sample User Data

To add a test admin user, run this SQL in Supabase Dashboard:

```sql
INSERT INTO users (email, full_name, role, is_super_admin, is_active, is_verified, institution_id)
VALUES
  ('your-email@gmail.com', 'Your Name', 'admin', true, true, true, '1')
ON CONFLICT (email) DO UPDATE
SET
  role = EXCLUDED.role,
  is_super_admin = EXCLUDED.is_super_admin,
  is_active = EXCLUDED.is_active,
  is_verified = EXCLUDED.is_verified;
```

Replace `your-email@gmail.com` with your actual Google account email.