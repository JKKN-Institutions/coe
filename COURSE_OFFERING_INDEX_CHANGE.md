# Course Offering Index Change Summary

## Overview
Updated the `course_offerings` table unique constraint to use human-readable code columns instead of UUID foreign keys for better data integrity and easier debugging.

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/20251017_update_course_offering_unique_constraint.sql`

**Changes:**
- Added code columns: `institution_code`, `course_code`, `program_code`, `session_code`
- Populated these columns from existing foreign key relationships
- Dropped old unique constraint `unique_offering` (based on UUIDs)
- Created new unique constraint `unique_offering_by_codes` using:
  - `institution_code`
  - `course_code`
  - `program_code`
  - `session_code`
  - `semester`
- Added indexes on individual code columns for query performance
- Added composite index for the unique constraint

### 2. API Route Updates
**File:** `app/api/course-offering/route.ts`

**POST Endpoint Changes:**
- Updated foreign key validation to retrieve code columns along with IDs
- Modified `insertPayload` to include all code columns
- Enhanced duplicate error message to show specific codes instead of generic message

**PUT Endpoint Changes:**
- Added variables to store code values during validation
- Updated foreign key validation to retrieve code columns
- Modified `updatePayload` to include all code columns
- Ensured code columns are updated when foreign keys change

### 3. Frontend Type Updates
**File:** `app/(authenticated)/course-offering/page.tsx`

**Interface Updates:**
- Added code columns to `CourseOffering` interface:
  - `institution_code: string`
  - `course_code: string`
  - `session_code: string`
  - `program_code: string`

## New Unique Constraint

**Before:**
```sql
UNIQUE (institutions_id, course_id, examination_session_id, program_id, semester)
```

**After:**
```sql
UNIQUE (institution_code, course_code, program_code, session_code, semester)
```

## Benefits

1. **Human-Readable Identifiers**: Code columns provide meaningful context in error messages
2. **Better Debugging**: Easier to identify duplicate offerings by looking at codes
3. **Data Integrity**: Prevents duplicate course offerings based on business logic
4. **Improved Error Messages**: Users see specific codes in duplicate error messages
5. **Query Performance**: Indexes on code columns improve filtering and searching

## Error Message Example

**Before:**
```
Course offer already exists for this combination of institution, course, examination session, program, and semester.
```

**After:**
```
Course offer already exists for this combination: JKKN, CS101, BTECH-CSE, SEM1-2025, Semester 1.
```

## Migration Steps

1. **Stop the application** (if running)
2. **Apply the migration:**
   ```bash
   npx supabase db reset --local
   # OR for production
   npx supabase db push
   ```
3. **Restart the application**

## Rollback Plan

If rollback is needed:
1. Restore the old unique constraint
2. Drop the code columns
3. Revert API and frontend changes

## Testing Checklist

- [ ] Verify migration applies without errors
- [ ] Test creating new course offering
- [ ] Test duplicate course offering detection
- [ ] Test updating existing course offering
- [ ] Verify error messages show correct codes
- [ ] Test filtering and searching by codes
- [ ] Verify existing data migrated correctly

## Notes

- The migration automatically populates code columns from existing foreign key relationships
- All code columns are set to NOT NULL after population
- Foreign key relationships (UUIDs) are maintained for relational integrity
- Code columns serve as both denormalized data and unique constraint components
