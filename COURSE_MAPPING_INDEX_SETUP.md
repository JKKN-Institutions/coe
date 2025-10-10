# Course Mapping Index Page Setup

This document explains the new Course Mapping Index page that displays grouped course mappings by institution, program, regulation, and batch.

## Overview

The Course Mapping Index page provides a listing view of all course mappings grouped by:
- Institution Code
- Program Code
- Regulation Code
- Batch Code

This allows users to quickly see all existing course mappings and navigate to edit them or generate PDF reports.

## Files Created

### 1. Frontend Page
**File:** `app/(authenticated)/course-mapping-index/page.tsx`

**Features:**
- ✅ Displays grouped course mappings in a table
- ✅ Shows total courses per group
- ✅ Search functionality across all fields
- ✅ Pagination (10, 25, 50, 100 entries per page)
- ✅ Edit button that navigates to course-mapping page with pre-filled values
- ✅ PDF generation button for each group
- ✅ Responsive design matching existing page patterns

**Route:** `/course-mapping-index`

### 2. API Endpoint
**File:** `app/api/course-mapping/groups/route.ts`

**Features:**
- ✅ Groups course mappings by institution_code, program_code, regulation_code, batch_code
- ✅ Counts total courses per group
- ✅ Enriches data with institution names, program names, regulation names, batch names
- ✅ Returns sorted by creation date (newest first)

**Route:** `GET /api/course-mapping/groups`

### 3. Database Migration
**File:** `supabase/migrations/20251010_add_regulation_to_course_mapping.sql`

**Changes:**
- ✅ Adds `regulation_code` column to `course_mapping` table
- ✅ Adds `regulation_id` column for foreign key relationship
- ✅ Creates indexes for performance optimization
- ✅ Updates unique constraint to include regulation_code

### 4. Updated Course Mapping Page
**File:** `app/(authenticated)/course-mapping/page.tsx`

**Enhancement:**
- ✅ Now supports URL parameters: `?institution=XXX&program=YYY&regulation=ZZZ&batch=AAA`
- ✅ Pre-populates form fields when navigating from index page
- ✅ Maintains existing functionality

## Setup Instructions

### Step 1: Apply Database Migration

Run the migration SQL in Supabase SQL Editor:

1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Open the file: `test-regulation-migration.sql`
4. Execute the SQL script

OR use the Supabase CLI:

```bash
npx supabase db push
```

### Step 2: Verify Database Changes

Run this query in Supabase SQL Editor to verify:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'course_mapping'
  AND column_name IN ('regulation_code', 'regulation_id')
ORDER BY column_name;
```

Expected output:
```
column_name       | data_type | is_nullable
------------------|-----------|------------
regulation_code   | text      | YES
regulation_id     | uuid      | YES
```

### Step 3: Test the New Page

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/course-mapping-index`

3. You should see:
   - A table with grouped course mappings
   - Search functionality
   - Pagination controls
   - Edit and PDF buttons for each group

### Step 4: Test Navigation Flow

1. Click "Edit" button on any group
2. Should navigate to `/course-mapping` with pre-filled values
3. Form fields should auto-populate with:
   - Institution
   - Program
   - Regulation
   - Batch

## Usage

### Viewing Course Mappings

1. Navigate to `/course-mapping-index`
2. View all grouped course mappings
3. Use search to filter by any field
4. Adjust entries per page as needed

### Editing Course Mappings

1. Click "Edit" button on any group
2. Will navigate to course mapping page with pre-selected values
3. Make changes and save

### Generating PDF Reports

1. Click "PDF" button on any group
2. PDF report will be downloaded automatically
3. Report includes all courses for that specific group

## Table Structure

The Course Mapping Index displays:

| Column | Description |
|--------|-------------|
| Degree-Branch | Program name with institution name below |
| Regulation | Regulation code with regulation name below |
| Batch | Batch code with batch year below |
| Total Courses | Badge showing count of mapped courses |
| Action | Edit and PDF buttons |

## API Response Format

The `/api/course-mapping/groups` endpoint returns:

```json
[
  {
    "institution_code": "JKKN",
    "program_code": "BE-CSE",
    "regulation_code": "R2022",
    "batch_code": "2022-2026",
    "total_courses": 45,
    "institution_name": "JKKN College of Engineering",
    "program_name": "B.E. Computer Science and Engineering",
    "regulation_name": "Anna University R2022",
    "batch_name": "2022-2026 Batch",
    "batch_year": "2022",
    "created_at": "2025-10-10T10:00:00Z"
  }
]
```

## Navigation Updates Needed

To add this page to the sidebar navigation, update `components/app-sidebar.tsx`:

```typescript
{
  title: "Course Mapping",
  icon: Link2,
  items: [
    {
      title: "View Mappings",
      url: "/course-mapping-index"
    },
    {
      title: "Create/Edit Mapping",
      url: "/course-mapping"
    }
  ]
}
```

## Benefits

1. **Overview**: Quick view of all course mappings
2. **Search**: Find specific mappings easily
3. **Navigation**: Direct access to edit any mapping
4. **Reports**: Generate PDFs for any specific group
5. **Organization**: Grouped by logical criteria
6. **Performance**: Indexed database queries for fast loading

## Troubleshooting

### Issue: "regulation_code column not found"

**Solution:** Apply the database migration in Step 1

### Issue: No data showing in the index

**Solution:**
1. Check if course mappings exist in database
2. Verify `is_active = true` on mappings
3. Check browser console for API errors

### Issue: PDF generation fails

**Solution:**
1. Verify `/api/course-mapping/report` endpoint exists
2. Check if report data exists for the selected group
3. Review browser console for errors

## Future Enhancements

Potential improvements:
- Filter by institution/program/regulation/batch
- Bulk PDF generation
- Export to Excel
- Clone/duplicate mappings
- Archive/inactive mappings view
- Audit trail showing who created/modified mappings

## Related Files

- Course Mapping Edit Page: `app/(authenticated)/course-mapping/page.tsx`
- API Routes: `app/api/course-mapping/`
- PDF Generator: `lib/utils/generate-course-mapping-pdf.ts`
- Database Schema: `supabase/migrations/20251006_create_course_mapping_table.sql`
