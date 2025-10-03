# Regulations Table Setup Guide

The "Failed to create regulation" error occurs because the `regulations` table doesn't exist in your Supabase database. Follow these steps to fix the issue:

## Quick Fix

### Method 1: Run the Setup Script (Recommended)

1. Open your terminal in the project root
2. Run the setup script:
   ```bash
   node scripts/setup-regulations-table.js
   ```
3. Follow the instructions displayed in the terminal

### Method 2: Manual Database Setup

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ndnulujelcnnnhydfyum
2. Navigate to **SQL Editor** in the left sidebar
3. Copy and paste the following SQL:

```sql
-- Create regulations table
CREATE TABLE IF NOT EXISTS regulations (
  id BIGSERIAL PRIMARY KEY,
  regulation_year INT NOT NULL,
  regulation_code VARCHAR(50) NOT NULL UNIQUE,
  status BOOLEAN NOT NULL DEFAULT true,
  
  minimum_internal NUMERIC(5,2) DEFAULT 0,
  minimum_external NUMERIC(5,2) DEFAULT 0,
  minimum_attendance NUMERIC(5,2) NOT NULL,
  minimum_total NUMERIC(5,2) DEFAULT 0,
  
  maximum_internal NUMERIC(5,2) DEFAULT 0,
  maximum_external NUMERIC(5,2) DEFAULT 0,
  maximum_total NUMERIC(5,2) DEFAULT 0,
  maximum_qp_marks NUMERIC(5,2) DEFAULT 0,
  
  condonation_range_start NUMERIC(5,2) DEFAULT 0,
  condonation_range_end NUMERIC(5,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_regulations_year ON regulations(regulation_year);
CREATE INDEX IF NOT EXISTS idx_regulations_code ON regulations(regulation_code);
CREATE INDEX IF NOT EXISTS idx_regulations_status ON regulations(status);
CREATE INDEX IF NOT EXISTS idx_regulations_created_at ON regulations(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE regulations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for service role to manage all regulations
CREATE POLICY "Service role can manage all regulations" ON regulations
  FOR ALL USING (auth.role() = 'service_role');

-- Policy for authenticated users to read regulations
CREATE POLICY "Authenticated users can read regulations" ON regulations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for authenticated users to insert regulations (if they have proper permissions)
CREATE POLICY "Authenticated users can insert regulations" ON regulations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to update regulations (if they have proper permissions)
CREATE POLICY "Authenticated users can update regulations" ON regulations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for authenticated users to delete regulations (if they have proper permissions)
CREATE POLICY "Authenticated users can delete regulations" ON regulations
  FOR DELETE USING (auth.role() = 'authenticated');
```

4. Click **Run** to execute the SQL
5. You should see a success message indicating the table was created

## What Was Fixed

1. **Created Migration File**: Added `supabase/migrations/20250102_create_regulations_table.sql` with the complete table schema
2. **Improved Error Handling**: Enhanced error messages in both the API and frontend to show specific error details
3. **Added Setup Script**: Created `scripts/setup-regulations-table.js` to help diagnose and provide setup instructions

## Error Handling Improvements

The application now provides better error messages for:
- Missing regulations table
- Duplicate regulation codes
- Missing required fields
- Database connection issues

## Testing

After setting up the table:
1. Go to the Regulations page in your application
2. Click "Add" to create a new regulation
3. Fill in the required fields (Regulation Code, Year, and Minimum Attendance)
4. Click "Create Regulation"
5. You should see a success message

## Troubleshooting

If you still encounter issues:

1. **Check Environment Variables**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are properly set
2. **Verify Table Creation**: Check in Supabase Dashboard that the `regulations` table exists
3. **Check RLS Policies**: Ensure the Row Level Security policies are properly configured
4. **Review Console Logs**: Check browser console and server logs for specific error details

## File Changes Made

- `supabase/migrations/20250102_create_regulations_table.sql` - New migration file
- `app/api/regulations/route.ts` - Enhanced error handling
- `app/(authenticated)/regulations/page.tsx` - Improved error messages
- `scripts/setup-regulations-table.js` - Setup helper script
