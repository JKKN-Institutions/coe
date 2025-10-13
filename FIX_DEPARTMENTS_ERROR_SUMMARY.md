# Fix: Departments API Error - Complete Solution

## ❌ The Error You're Seeing

```
Departments API - Query params: { institution_code: null }
get error
```

## 🔍 Root Cause

The **`departments` table does not exist** in your Supabase database. 

The API route `app/api/departments/route.ts` is trying to query a table that hasn't been created yet, causing the fetch to fail.

## ✅ Solution Implemented

I've created the following files to fix this:

### 1. **Migration File Created**
📄 `supabase/migrations/20250103_create_departments_table.sql`

This migration creates:
- ✅ `departments` table with all required columns
- ✅ Foreign key relationships to `institutions` table
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Auto-update triggers
- ✅ Constraints for data integrity

### 2. **Helper Script Created**
📄 `apply-departments-migration.bat` (Windows)

Double-click this file to automatically apply the migration.

### 3. **Documentation Created**
📄 `APPLY_DEPARTMENTS_MIGRATION.md`

Complete instructions with troubleshooting guide.

## 🚀 Quick Fix (Choose One Method)

### Method 1: Automatic (Easiest)
```bash
# Double-click this file:
apply-departments-migration.bat
```

### Method 2: Command Line
```bash
# Run in PowerShell/Command Prompt
supabase db push
```

### Method 3: Supabase Dashboard (If CLI doesn't work)

1. Go to your Supabase project: https://app.supabase.com
2. Click on **SQL Editor** in the left sidebar
3. Create a **New Query**
4. Copy the **entire contents** of this file:
   ```
   supabase/migrations/20250103_create_departments_table.sql
   ```
5. Paste into SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for "Success" message

## 🧪 Testing After Migration

### 1. Verify Table Created
Run this SQL in Supabase Dashboard:

```sql
-- Check if table exists
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'departments' 
ORDER BY ordinal_position;
```

Expected result: You should see all 12 columns listed.

### 2. Test the API
```bash
# Start your dev server (if not running)
npm run dev

# Open browser and go to:
http://localhost:3000/dashboard
```

Then navigate to **Departments** page.

### 3. Test CRUD Operations

Try these in order:

1. ✅ **Read**: Page should load without errors and show empty table
2. ✅ **Create**: Click "Add" button → Fill form → Save
3. ✅ **Update**: Click edit icon → Modify data → Save
4. ✅ **Delete**: Click delete icon → Confirm
5. ✅ **Upload**: Click "Upload" → Select Excel file → Import

## 📊 Expected Database Schema

After migration, your `departments` table will have:

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID | Yes | Primary key (auto-generated) |
| institutions_id | UUID | Yes | FK to institutions.id |
| institution_code | VARCHAR(50) | Yes | FK to institutions.institution_code |
| department_code | VARCHAR(50) | Yes | Unique dept code (e.g., "CSE") |
| department_name | VARCHAR(255) | Yes | Full name (e.g., "Computer Science") |
| display_name | VARCHAR(100) | No | Short display name (e.g., "CS") |
| description | TEXT | No | Optional description |
| stream | VARCHAR(50) | No | One of: Arts, Science, Management, Commerce, Engineering, Medical, Law |
| status | BOOLEAN | Yes | Active/Inactive (default: true) |
| created_at | TIMESTAMPTZ | Yes | Auto-generated |
| updated_at | TIMESTAMPTZ | Yes | Auto-updated |
| created_by | UUID | No | FK to auth.users |
| updated_by | UUID | No | FK to auth.users |

## 🔗 Dependencies

The `departments` table depends on:

1. ✅ **institutions** table (must exist first)
2. ✅ **auth.users** table (Supabase built-in)
3. ✅ **roles** and **user_roles** tables (for RLS policies)

If you get foreign key errors, ensure these tables exist first.

## 🐛 Common Issues & Solutions

### Issue 1: "table 'institutions' does not exist"

**Solution:**
```sql
-- Check if institutions table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'institutions';

-- If missing, create it first (check for institutions migration file)
```

### Issue 2: "permission denied"

**Solution:**
```bash
# Make sure you're using the service role key
# Check .env.local has:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Issue 3: Supabase CLI not found

**Solution:**
```bash
# Install Supabase CLI
npm install -g supabase

# Or use method 3 (Dashboard) instead
```

### Issue 4: Migration already applied

If you see "migration already applied", that's good! The table exists.

Check browser console for the actual error:
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Refresh the Departments page
4. Look for red error messages
5. Copy the error and search for solutions

## 📝 What Changed in Your Code

### Files Created:
- ✅ `supabase/migrations/20250103_create_departments_table.sql`
- ✅ `apply-departments-migration.bat`
- ✅ `APPLY_DEPARTMENTS_MIGRATION.md`
- ✅ `FIX_DEPARTMENTS_ERROR_SUMMARY.md` (this file)

### Files Already Exist (No Changes):
- ✅ `app/api/departments/route.ts` (already correct)
- ✅ `app/(authenticated)/department/page.tsx` (already correct)

## 🎯 Success Indicators

After fixing, you should see:

1. ✅ No console errors when visiting Departments page
2. ✅ Empty table with proper columns displayed
3. ✅ "Add Department" button works
4. ✅ Form opens and validates properly
5. ✅ Can create, update, and delete departments
6. ✅ Upload/Import Excel feature works

## 📞 Still Having Issues?

If the error persists after applying the migration:

1. **Check Browser Console** (F12 → Console tab)
   - Look for the actual error message
   - It might be a different issue (auth, RLS, etc.)

2. **Check Server Logs**
   - Look at your terminal where `npm run dev` is running
   - Check for detailed error messages

3. **Check Supabase Logs**
   - Go to Supabase Dashboard
   - Click **Logs** → **API Logs**
   - Look for failed queries

4. **Verify Connection**
   ```bash
   # Test if Supabase is connected
   supabase status
   ```

5. **Check Environment Variables**
   ```bash
   # Make sure .env.local has all required keys:
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

## 🎉 After Success

Once departments table is working:

1. You can add department records
2. Upload bulk data via Excel
3. Other features that depend on departments will work:
   - Programs (requires department_id)
   - Courses (may require department mapping)
   - Students (requires department assignment)

## 📚 Related Tables

After fixing departments, ensure these tables also exist:

- ✅ institutions
- ✅ degrees
- ✅ programs
- ✅ courses
- ✅ semesters
- ✅ sections

Run similar migrations if any are missing.

---

**Next Step:** Run `apply-departments-migration.bat` or follow Method 3 above!











