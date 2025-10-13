# Course Mapping Enhancement - Change Summary

## Overview
This document summarizes the changes made to the Course Mapping functionality to support decimal course order values and auto-populate course details when a course is selected.

## Changes Implemented

### 1. Course Order Field - Changed to Decimal Type

**Location:** [app/(authenticated)/course-mapping/page.tsx](app/(authenticated)/course-mapping/page.tsx:1060-1070)

**Changes:**
- Changed input type handling from `parseInt()` to `parseFloat()`
- Added `step={0.1}` attribute to allow decimal input (e.g., 1.1, 1.2, 1.5)
- Changed minimum value from `1` to `0.1`

**Before:**
```typescript
<Input
  type="number"
  value={mapping.course_order || 1}
  onChange={(e) => updateCourseRow(semIndex, rowIndex, 'course_order', parseInt(e.target.value))}
  className="h-9 w-20 text-sm text-center"
  min={1}
  max={999}
/>
```

**After:**
```typescript
<Input
  type="number"
  value={mapping.course_order || 1}
  onChange={(e) => updateCourseRow(semIndex, rowIndex, 'course_order', parseFloat(e.target.value))}
  className="h-9 w-20 text-sm text-center"
  min={0.1}
  max={999}
  step={0.1}
/>
```

**Benefits:**
- Allows fine-grained course ordering (e.g., 1.1, 1.2 for courses between 1 and 2)
- Provides flexibility in curriculum structuring
- Supports decimal sorting in the UI

---

### 2. Auto-Populate Course Details on Selection

**Location:** [app/(authenticated)/course-mapping/page.tsx](app/(authenticated)/course-mapping/page.tsx:409-452)

**Changes:**
Enhanced the `updateCourseRow` function to automatically populate the following fields when a course is selected:

- `internal_max_mark`
- `internal_pass_mark`
- `internal_converted_mark`
- `external_max_mark`
- `external_pass_mark`
- `external_converted_mark`
- `total_pass_mark`
- `total_max_mark`

**Implementation:**
```typescript
const updateCourseRow = (semesterIndex: number, rowIndex: number, field: string, value: any) => {
  const updated = [...semesterTables]
  updated[semesterIndex].mappings[rowIndex] = {
    ...updated[semesterIndex].mappings[rowIndex],
    [field]: value
  }

  // Auto-fill course details when course is selected
  if (field === 'course_id' && value) {
    const course = courses.find(c => c.id === value)
    if (course) {
      // Auto-fill course category
      updated[semesterIndex].mappings[rowIndex].course_category = course.course_category || course.course_type || ''

      // Auto-fill marks details from the course
      if (course.internal_max_mark !== undefined) {
        updated[semesterIndex].mappings[rowIndex].internal_max_mark = course.internal_max_mark
      }
      if (course.internal_pass_mark !== undefined) {
        updated[semesterIndex].mappings[rowIndex].internal_pass_mark = course.internal_pass_mark
      }
      // ... (continues for all mark fields)
    }
  }

  setSemesterTables(updated)
}
```

**Benefits:**
- Reduces manual data entry
- Ensures consistency between course definitions and mappings
- Prevents errors from incorrect mark configurations
- Speeds up the course mapping process

---

### 3. Database Schema Update

**Location:** [supabase/migrations/20251013_update_course_order_to_decimal.sql](supabase/migrations/20251013_update_course_order_to_decimal.sql)

**Migration SQL:**
```sql
-- Update course_order column from integer to numeric to support decimal values (e.g., 1.1, 1.2)
ALTER TABLE public.course_mapping
ALTER COLUMN course_order TYPE numeric(5,2);

-- Update default value to support decimals
ALTER TABLE public.course_mapping
ALTER COLUMN course_order SET DEFAULT 1.0;

-- Add comment for documentation
COMMENT ON COLUMN public.course_mapping.course_order IS 'Order of the course in the curriculum (supports decimal values like 1.1, 1.2 for fine-grained ordering)';
```

**Schema Changes:**
- Changed `course_order` from `integer` to `numeric(5,2)`
- Supports values like 1.0, 1.1, 1.5, 10.25, 999.99
- Maximum value: 999.99
- Decimal precision: 2 decimal places

---

## How to Apply Database Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Open your Supabase Dashboard at [https://app.supabase.com](https://app.supabase.com)
2. Navigate to your project
3. Go to **SQL Editor**
4. Copy and paste the SQL from `supabase/migrations/20251013_update_course_order_to_decimal.sql`
5. Click **Run** to execute the migration

### Option 2: Using the Batch Script

Run the provided batch script:
```bash
apply-course-order-migration.bat
```

This will display the SQL content and guide you through applying it manually.

---

## Testing Instructions

### 1. Test Decimal Course Order

1. Navigate to the Course Mapping page
2. Select Institution, Program, Batch, and Regulation
3. Add a course to a semester
4. In the "Order" field, enter a decimal value (e.g., 1.5, 2.3)
5. Verify that the value is accepted and saved correctly
6. Save the mapping and refresh the page
7. Verify that the decimal value persists

### 2. Test Auto-Population of Course Details

1. Navigate to the Course Mapping page
2. Select Institution, Program, Batch, and Regulation
3. Add a new course row in any semester
4. Before selecting a course, note that the mark fields have default values (40, 14, 25, 60, 26, 75, 100, 40)
5. Select a course from the dropdown
6. **Verify:** The following fields should automatically update with values from the selected course:
   - Internal Pass Mark
   - Internal Max Mark
   - Internal Converted Mark
   - External Pass Mark
   - External Max Mark
   - External Converted Mark
   - Total Pass Mark
   - Total Max Mark
7. You can still manually edit these values if needed
8. Save the mapping and verify the values persist

---

## Data Source for Auto-Population

The course details are fetched from the `courses` table via the `/api/courses` endpoint, which includes the following mark fields:

```typescript
{
  internal_max_mark: number
  internal_pass_mark: number
  internal_converted_mark: number
  external_max_mark: number
  external_pass_mark: number
  external_converted_mark: number
  total_pass_mark: number
  total_max_mark: number
}
```

These values are defined when creating or editing a course in the Courses management page.

---

## API Compatibility

The existing API routes (`/api/course-mapping`) already support numeric values for all mark fields and will automatically handle decimal values for `course_order`. No API changes were required.

---

## Files Modified

1. **[app/(authenticated)/course-mapping/page.tsx](app/(authenticated)/course-mapping/page.tsx)**
   - Updated `updateCourseRow` function (lines 409-452)
   - Changed course_order input field (lines 1060-1070)

2. **New Files Created:**
   - `supabase/migrations/20251013_update_course_order_to_decimal.sql` - Database migration
   - `apply-course-order-migration.bat` - Helper script for applying migration
   - `COURSE_MAPPING_CHANGES.md` - This documentation file

---

## Rollback Instructions

If you need to revert these changes:

### Database Rollback:
```sql
-- Revert course_order to integer
ALTER TABLE public.course_mapping
ALTER COLUMN course_order TYPE integer USING course_order::integer;

-- Revert default value
ALTER TABLE public.course_mapping
ALTER COLUMN course_order SET DEFAULT 1;
```

### Code Rollback:
Revert the changes in `app/(authenticated)/course-mapping/page.tsx` by changing:
- `parseFloat(e.target.value)` back to `parseInt(e.target.value)`
- Remove `step={0.1}` attribute
- Change `min={0.1}` back to `min={1}`
- Remove the auto-population logic from `updateCourseRow` function

---

## Notes

- The decimal course order feature allows for more flexible curriculum structuring
- The auto-population feature reduces data entry errors and speeds up the mapping process
- Users can still manually override the auto-populated values if needed
- The changes are backward compatible with existing integer course_order values

---

## Support

If you encounter any issues or have questions about these changes, please refer to the project's main documentation or contact the development team.

**Last Updated:** October 13, 2025
