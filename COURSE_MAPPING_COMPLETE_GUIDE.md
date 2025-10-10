# Course Mapping Complete Guide

## Overview

This guide explains the complete course mapping workflow with three pages:
1. **Index Page** - View all grouped course mappings
2. **Edit Page** - Edit specific course mapping with pre-filled values
3. **Create Page** - Create new course mappings from scratch

## Page Structure

### 1. Course Mapping Index Page
**Route:** `/course-mapping-index`
**File:** `app/(authenticated)/course-mapping-index/page.tsx`

**Purpose:** Display all existing course mappings grouped by institution, program, regulation, and batch.

**Features:**
- ✅ Table view with grouped course mappings
- ✅ Search functionality across all fields
- ✅ Pagination (10/25/50/100 entries per page)
- ✅ Edit button for each group
- ✅ PDF generation button
- ✅ Shows total course count per group

**Table Columns:**
| Column | Description |
|--------|-------------|
| Degree-Branch | Program name with institution below |
| Regulation | Regulation code with name below |
| Batch | Batch code with year below |
| Total Courses | Badge showing mapped course count |
| Action | Edit and PDF buttons |

### 2. Course Mapping Edit Page
**Route:** `/course-mapping/edit?institution=XXX&program=YYY&regulation=ZZZ&batch=AAA`
**File:** `app/(authenticated)/course-mapping/edit/page.tsx`

**Purpose:** Edit existing course mappings for a specific institution/program/regulation/batch combination.

**Features:**
- ✅ Auto-fills institution, program, regulation, batch from URL parameters
- ✅ Locked header showing selected values (non-editable)
- ✅ Loads existing course mappings automatically
- ✅ Semester-based collapsible tables
- ✅ Add/remove course rows per semester
- ✅ Bulk save all changes
- ✅ Generate PDF report
- ✅ Back button to return to index

**Key Differences from Create Page:**
- Parameters are required (redirects to index if missing)
- Values are locked and displayed as read-only
- Auto-loads existing mappings on mount
- Breadcrumb shows Index → Edit flow

### 3. Course Mapping Create Page
**Route:** `/course-mapping`
**File:** `app/(authenticated)/course-mapping/page.tsx`

**Purpose:** Create new course mappings or browse by selecting institution/program/regulation/batch.

**Features:**
- ✅ Editable dropdowns for institution, program, regulation, batch
- ✅ Dynamic loading based on selections
- ✅ Can create new mappings from scratch
- ✅ Same semester table interface as edit page

## User Flow

### Viewing Existing Mappings

1. Navigate to `/course-mapping-index`
2. Browse the list of existing course mappings
3. Use search to filter specific groups
4. Adjust pagination as needed

### Editing Existing Mappings

1. From index page, click **Edit** button on any row
2. Redirects to `/course-mapping/edit?institution=XXX&program=YYY&regulation=ZZZ&batch=AAA`
3. Page auto-loads with:
   - Institution, program, regulation, batch locked at top
   - Existing course mappings loaded by semester
   - All semester tables populated
4. Make changes:
   - Add new course rows
   - Modify existing mappings
   - Delete unwanted mappings
5. Click **Save All** to save changes
6. Click **Back to Index** to return to listing

### Creating New Mappings

1. Navigate to `/course-mapping` (create page)
2. Select institution from dropdown
3. Select program (filters based on institution)
4. Select regulation
5. Select batch
6. Semester tables appear
7. Add courses to each semester
8. Click **Save All** to save

### Generating PDF Reports

**From Index Page:**
1. Click **PDF** button on any row
2. PDF downloads automatically for that specific group

**From Edit Page:**
1. Click **Generate PDF** button in header
2. PDF downloads for the loaded mapping

## API Endpoints

### GET /api/course-mapping/groups
Returns grouped course mappings with counts.

**Response:**
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
    "batch_year": "2022"
  }
]
```

### GET /api/course-mapping
Filters course mappings by query parameters.

**Parameters:**
- `institution_code` (optional)
- `program_code` (optional)
- `batch_code` (optional)
- `regulation_code` (optional)

### POST /api/course-mapping
Creates course mappings (single or bulk).

**Bulk Request:**
```json
{
  "bulk": true,
  "mappings": [
    {
      "course_id": "uuid",
      "institution_code": "JKKN",
      "program_code": "BE-CSE",
      "regulation_code": "R2022",
      "batch_code": "2022-2026",
      "semester_code": "SEM1",
      "course_group": "General",
      "internal_max_mark": 40,
      "external_max_mark": 60,
      "total_max_mark": 100
    }
  ]
}
```

### DELETE /api/course-mapping?id=xxx
Deletes a specific course mapping.

### GET /api/course-mapping/report
Generates PDF report data.

**Parameters:**
- `institution_code` (required)
- `program_code` (required)
- `batch_code` (required)
- `regulation_code` (optional)

## Database Schema

### course_mapping Table

```sql
CREATE TABLE course_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  institution_code text NOT NULL,
  program_code text NOT NULL,
  batch_code text NOT NULL,
  regulation_code text NULL,           -- Added by migration
  regulation_id uuid NULL,             -- Added by migration
  semester_code text NULL,
  course_group text NULL,
  course_category text NULL,
  course_order integer DEFAULT 1,

  -- Marks configuration
  internal_max_mark numeric DEFAULT 0,
  internal_pass_mark numeric DEFAULT 0,
  internal_converted_mark numeric DEFAULT 0,
  external_max_mark numeric DEFAULT 0,
  external_pass_mark numeric DEFAULT 0,
  external_converted_mark numeric DEFAULT 0,
  total_max_mark numeric DEFAULT 0,
  total_pass_mark numeric DEFAULT 0,

  -- Flags
  annual_semester boolean DEFAULT false,
  registration_based boolean DEFAULT false,
  is_active boolean DEFAULT true,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
```

**Indexes:**
- `idx_course_mapping_course_id`
- `idx_course_mapping_institution_code`
- `idx_course_mapping_program_code`
- `idx_course_mapping_batch_code`
- `idx_course_mapping_regulation_code` ← New
- `idx_course_mapping_program_regulation` ← New

**Unique Constraint:**
```sql
CREATE UNIQUE INDEX idx_course_mapping_unique_mapping
ON course_mapping (
  course_id,
  institution_code,
  program_code,
  batch_code,
  regulation_code,
  semester_code
)
WHERE is_active = true;
```

## Setup Instructions

### Step 1: Apply Database Migration

Run in Supabase SQL Editor:

```sql
-- From file: test-regulation-migration.sql
ALTER TABLE public.course_mapping
ADD COLUMN IF NOT EXISTS regulation_code text NULL;

ALTER TABLE public.course_mapping
ADD COLUMN IF NOT EXISTS regulation_id uuid NULL;

-- ... (see full file for complete migration)
```

### Step 2: Verify Migration

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'course_mapping'
  AND column_name IN ('regulation_code', 'regulation_id')
ORDER BY column_name;
```

Expected output:
```
regulation_code | text | YES
regulation_id   | uuid | YES
```

### Step 3: Start Development Server

```bash
npm run dev
```

### Step 4: Test the Flow

1. Navigate to `http://localhost:3000/course-mapping-index`
2. Click Edit on any row
3. Should redirect to `/course-mapping/edit?...`
4. Values should be pre-filled and locked
5. Make changes and save

## Component Comparison

| Feature | Index Page | Edit Page | Create Page |
|---------|------------|-----------|-------------|
| Route | `/course-mapping-index` | `/course-mapping/edit` | `/course-mapping` |
| Purpose | View all groups | Edit specific group | Create new mappings |
| Selection Fields | None (read-only table) | Locked (from URL) | Editable dropdowns |
| Data Loading | Groups from API | Auto-load on mount | Manual selection |
| URL Parameters | Not required | Required | Optional |
| Breadcrumb | Dashboard → Index | Dashboard → Index → Edit | Dashboard → Mapping |

## Key Implementation Details

### Auto-Fill Logic (Edit Page)

```typescript
// URL parameters
const institutionParam = searchParams.get('institution')
const programParam = searchParams.get('program')
const regulationParam = searchParams.get('regulation')
const batchParam = searchParams.get('batch')

// Auto-load on mount
useEffect(() => {
  if (!institutionParam || !programParam || !regulationParam || !batchParam) {
    // Redirect to index if parameters missing
    router.push('/course-mapping-index')
    return
  }

  // Fetch display names
  fetchInstitutionName(institutionParam)
  fetchProgramData(programParam)
  fetchRegulationName(regulationParam)
  fetchBatchName(batchParam)

  // Load courses and semesters
  fetchSemesters(programParam)
  fetchCourses(institutionParam, programParam, regulationParam)
}, [])

// Load existing mappings when semesters are ready
useEffect(() => {
  if (semesters.length > 0) {
    loadExistingMappings()
  }
}, [semesters])
```

### Locked Header Display

```tsx
<div className="bg-muted/50 border rounded-lg p-4">
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div>
      <Label className="text-xs text-muted-foreground">Institution</Label>
      <p className="font-medium mt-1">{institutionName}</p>
      <p className="text-xs text-muted-foreground">{selectedInstitution}</p>
    </div>
    {/* Similar for program, regulation, batch */}
  </div>
</div>
```

## Navigation Updates

Add to `components/app-sidebar.tsx`:

```typescript
{
  title: "Course Mapping",
  icon: Link2,
  items: [
    {
      title: "View All Mappings",
      url: "/course-mapping-index",
      icon: List
    },
    {
      title: "Create New Mapping",
      url: "/course-mapping",
      icon: PlusCircle
    }
  ]
}
```

## Benefits

1. **Clear Separation**: Index for viewing, Edit for specific changes, Create for new
2. **User-Friendly**: No accidental changes to institution/program/batch when editing
3. **Fast Navigation**: Direct links from index to edit with auto-filled values
4. **Validation**: Edit page validates required parameters on mount
5. **Consistent UX**: Same table interface across edit and create pages

## Troubleshooting

### Issue: Edit page shows "Missing Parameters"

**Cause:** URL parameters not provided or incorrect

**Solution:** Always navigate from index page Edit button, or manually include all 4 parameters:
```
/course-mapping/edit?institution=XXX&program=YYY&regulation=ZZZ&batch=AAA
```

### Issue: Edit page not loading existing data

**Cause:** API endpoint not returning data or parameters mismatch

**Solution:**
1. Check browser console for API errors
2. Verify parameters match existing records
3. Check `regulation_code` column exists in database

### Issue: Index page shows no data

**Cause:** No course mappings in database or API error

**Solution:**
1. Create some mappings using create page
2. Check `/api/course-mapping/groups` endpoint
3. Verify `is_active = true` on mappings

## Files Created/Modified

### New Files
- `app/(authenticated)/course-mapping-index/page.tsx` - Index listing page
- `app/(authenticated)/course-mapping/edit/page.tsx` - Edit page with locked values
- `app/api/course-mapping/groups/route.ts` - API for grouped data
- `supabase/migrations/20251010_add_regulation_to_course_mapping.sql` - Migration
- `test-regulation-migration.sql` - Test migration script

### Modified Files
- `app/(authenticated)/course-mapping/page.tsx` - Added URL parameter support

## Future Enhancements

- Clone/duplicate mappings to new batch
- Import course mappings from Excel
- Compare mappings between batches
- Audit log for changes
- Bulk operations (activate/deactivate multiple groups)
- Advanced filtering in index page
- Export to Excel from index page
