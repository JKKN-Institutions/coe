# Fix Database Access Issue

The users page is not showing data because:

1. **The database is empty** - There are 0 users in the users table
2. **Row Level Security (RLS) is blocking inserts** - Cannot add users due to security policies
3. **Missing proper SERVICE_ROLE_KEY** - The current key in .env.local doesn't have admin privileges

## Solution

### Option 1: Get the Correct SERVICE_ROLE_KEY (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (ndnulujelcnnnhydfyum)
3. Go to Settings → API
4. Copy the `service_role` key (NOT the anon key)
5. Update your `.env.local` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJ... [the actual service role key]
   ```

### Option 2: Temporarily Disable RLS (For Testing Only)

1. Go to your Supabase Dashboard
2. Navigate to Authentication → Policies
3. Find the `users` table
4. Temporarily disable RLS:
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ```
5. After testing, re-enable it:
   ```sql
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ```

### Option 3: Create RLS Policies

Add these policies in Supabase SQL Editor:

```sql
-- Allow service role to do everything
CREATE POLICY "Service role can do anything" ON users
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users to read all users
CREATE POLICY "Users can view all users" ON users
FOR SELECT
USING (true);

-- Allow authenticated users to insert (for admin users)
CREATE POLICY "Admins can insert users" ON users
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND roles = 'admin'
  )
);
```

### Option 4: Add Users Directly via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to Table Editor → users
3. Click "Insert row"
4. Add users manually with these sample values:

```json
{
  "full_name": "Admin User",
  "email": "admin@jkkn.edu",
  "username": "admin",
  "phone": "+91 9876543210",
  "is_active": true,
  "is_verified": true,
  "roles": "admin",
  "institution_id": "default-id",
  "preferences": {},
  "metadata": {}
}
```

## After Fixing

Once you've applied one of the above solutions:

1. Run the seed script:
   ```bash
   node seed-users-fixed.js
   ```

2. Or manually insert users via the API:
   ```bash
   curl -X POST http://localhost:3001/api/users \
     -H "Content-Type: application/json" \
     -d '{
       "full_name": "Test User",
       "email": "test@jkkn.edu",
       "roles": "user",
       "institution_id": "test-id"
     }'
   ```

3. Refresh the users page in your browser

## Current Status

- API endpoint is working: `GET /api/users` returns `[]` (empty array)
- Database connection is successful
- The issue is only that there's no data and RLS is blocking inserts

## Note

The users page UI is fully functional and will display data once users are added to the database. All features including:
- Search
- Filtering
- Pagination
- Export
- Delete
- Statistics

are ready to work once data is available.