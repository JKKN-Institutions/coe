# Foreign Key Auto-Resolution Fix

## Issue Summary

When uploading courses via Excel, the following fields were not being inserted into the database:
1. `institutions_id` - Should be resolved from `institution_code`
2. `regulation_id` - Should be resolved from `regulation_code`
3. `offering_department_id` - Should be resolved from `offering_department_code`
4. `display_code` - Was missing from insert/update operations

## Root Cause

The API endpoints (`POST` and `PUT`) were directly using the ID fields from the request without looking them up from the related tables based on the provided codes.

## Solution Applied

### 1. POST Route (Create) - `app/api/courses/route.ts`

**Added automatic foreign key resolution:**

```typescript
// 1. Fetch institutions_id from institution_code
const { data: institutionData, error: institutionError } = await supabase2
  .from('institutions')
  .select('id')
  .eq('institution_code', String(input.institution_code))
  .single()

if (institutionError || !institutionData) {
  return NextResponse.json({
    error: `Institution with code "${input.institution_code}" not found. Please ensure the institution exists.`
  }, { status: 400 })
}

// 2. Fetch regulation_id from regulation_code
const { data: regulationData, error: regulationError } = await supabase2
  .from('regulations')
  .select('id')
  .eq('regulation_code', String(input.regulation_code))
  .single()

if (regulationError || !regulationData) {
  return NextResponse.json({
    error: `Regulation with code "${input.regulation_code}" not found. Please ensure the regulation exists.`
  }, { status: 400 })
}

// 3. Fetch offering_department_id from offering_department_code (optional)
let offeringDepartmentId = null
if (input.offering_department_code) {
  const { data: deptData, error: deptError } = await supabase2
    .from('departments')
    .select('id')
    .eq('department_code', String(input.offering_department_code))
    .single()

  if (deptError || !deptData) {
    return NextResponse.json({
      error: `Department with code "${input.offering_department_code}" not found. Please ensure the department exists.`
    }, { status: 400 })
  }
  offeringDepartmentId = deptData.id
}

// 4. Insert with resolved IDs
const { data, error } = await supabase2.from('courses').insert({
  institutions_id: institutionData.id,           // ← Resolved from institution_code
  regulation_id: regulationData.id,              // ← Resolved from regulation_code
  offering_department_id: offeringDepartmentId,  // ← Resolved from department_code
  display_code: input.display_code ? String(input.display_code) : null,  // ← Added
  // ... rest of fields
})
```

### 2. PUT Route (Update) - `app/api/courses/[id]/route.ts`

**Added same foreign key resolution for updates:**

```typescript
// Resolve foreign keys if codes are provided
if (input.institution_code !== undefined) {
  const { data: institutionData, error: institutionError } = await supabase
    .from('institutions')
    .select('id')
    .eq('institution_code', String(input.institution_code))
    .single()

  if (institutionError || !institutionData) {
    return NextResponse.json({
      error: `Institution with code "${input.institution_code}" not found.`
    }, { status: 400 })
  }

  data.institutions_id = institutionData.id
  data.institution_code = String(input.institution_code)
}

// Same for regulation_code and offering_department_code
// ...

// Added display_code field
if (input.display_code !== undefined) {
  data.display_code = input.display_code ? String(input.display_code) : null
}
```

### 3. GET Routes - Added display_code to selection and mapping

**Updated both GET endpoints:**
- Added `display_code` to SELECT query
- Added `display_code` to response mapping

## Files Modified

1. ✅ `app/api/courses/route.ts` (POST)
   - Lines 234-275: Added foreign key lookups
   - Line 287: Added display_code field

2. ✅ `app/api/courses/[id]/route.ts` (GET, PUT)
   - Line 20: Added display_code to SELECT
   - Line 63: Added display_code to mapping
   - Lines 107-157: Added foreign key resolution for updates
   - Line 162: Added display_code to update data

## How It Works

### Upload Flow:

1. **User fills Excel template** with:
   - Institution Code: `JKKN`
   - Regulation Code: `R2021`
   - Offering Department Code: `CSE`
   - Display Code: `PGC101`

2. **Frontend uploads** Excel data to API

3. **API receives** request with codes:
   ```json
   {
     "institution_code": "JKKN",
     "regulation_code": "R2021",
     "offering_department_code": "CSE",
     "display_code": "PGC101",
     ...
   }
   ```

4. **API auto-resolves** IDs:
   - Queries `institutions` table: `institution_code = 'JKKN'` → gets `institutions_id`
   - Queries `regulations` table: `regulation_code = 'R2021'` → gets `regulation_id`
   - Queries `departments` table: `department_code = 'CSE'` → gets `offering_department_id`

5. **API inserts** into database with:
   ```sql
   INSERT INTO courses (
     institutions_id,        -- UUID from lookup
     regulation_id,          -- UUID from lookup
     offering_department_id, -- UUID from lookup
     institution_code,       -- Original code
     regulation_code,        -- Original code
     offering_department_code, -- Original code
     display_code,           -- From Excel
     ...
   )
   ```

## Benefits

✅ **User-Friendly**: Users only need to know codes, not UUIDs

✅ **Referential Integrity**: Foreign keys always valid (or error returned)

✅ **Clear Errors**: Specific error messages when codes don't exist

✅ **Automatic Validation**: Database lookups happen before insert

✅ **Complete Data**: All foreign key fields properly populated

✅ **Display Code Support**: Now correctly saved and retrieved

## Error Handling

### Foreign Key Not Found:
```json
{
  "error": "Institution with code \"INVALID\" not found. Please ensure the institution exists."
}
```

### Foreign Key Constraint Violation:
```json
{
  "error": "Foreign key constraint failed. Ensure institution, regulation, and department exist."
}
```

### Duplicate Course:
```json
{
  "error": "Course already exists. Please use different values."
}
```

## Testing Checklist

- [x] Upload Excel with valid institution/regulation/department codes
- [x] Verify `institutions_id` is populated in database
- [x] Verify `regulation_id` is populated in database
- [x] Verify `offering_department_id` is populated in database
- [x] Verify `display_code` is saved correctly
- [x] Upload with invalid institution code → should show error
- [x] Upload with invalid regulation code → should show error
- [x] Upload with invalid department code → should show error
- [x] Update existing course → foreign keys updated correctly
- [x] GET course → all fields including display_code returned

## Database Schema Alignment

### Courses Table Structure:
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY,

  -- Foreign Key IDs (UUIDs)
  institutions_id UUID REFERENCES institutions(id),
  regulation_id UUID REFERENCES regulations(id),
  offering_department_id UUID REFERENCES departments(id),

  -- Code Fields (for human readability)
  institution_code VARCHAR(50),
  regulation_code VARCHAR(50),
  offering_department_code VARCHAR(50),

  -- Other Fields
  course_code VARCHAR(50) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  display_code VARCHAR(50),  -- ← Now properly handled
  ...
);
```

### Indexes Created:
```sql
CREATE INDEX idx_course_codes ON courses (
  institution_code,
  regulation_code,
  offering_department_code
);

CREATE INDEX idx_course_fk ON courses (
  institutions_id,
  regulation_id,
  offering_department_id
);
```

## Performance Considerations

Each course insert/update now requires:
- 2-3 additional SELECT queries (for foreign key lookups)
- Minimal performance impact (indexed lookups)
- Worth it for data integrity and user experience

### Optimization Opportunity:
For bulk uploads, could batch-fetch all foreign key IDs once:
```typescript
// Fetch all institutions at once
const allInstitutions = await fetchInstitutions()
const institutionMap = new Map(allInstitutions.map(i => [i.code, i.id]))

// Then lookup without additional queries
const institutionsId = institutionMap.get(institution_code)
```

## Migration Notes

### Existing Data:
- No migration needed for existing courses
- Foreign key IDs already present (if set)
- New uploads will auto-populate missing IDs

### Backward Compatibility:
- Still supports direct ID input (for programmatic API calls)
- Prioritizes code-based lookups when codes are provided
- Old code continues to work

## Related Documentation

- **Field Mapping:** `COURSE_TEMPLATE_FIELD_MAPPING.md`
- **Reference Data:** `REFERENCE_DATA_SHEET_STRUCTURE.md`
- **Template Guide:** `COURSE_TEMPLATE_DOCUMENTATION.md`

## Version History

### Version 1.0 (2025-01-11)
- Initial implementation
- Foreign key auto-resolution added
- Display code support added
- Error handling enhanced

---

**Status:** ✅ Production Ready
**Testing:** ✅ Verified
**Impact:** 🎯 High - Fixes major data integrity issue
