# Course Mapping Join Fix

## Issue
Error: `column course_mapping.course_title does not exist`

The `course_mapping` table doesn't have a `course_title` column. It only stores `course_id` and `course_code`. The course title needs to be fetched from the `courses` table by joining on `course_code`.

## Root Cause
Multiple API endpoints were trying to access `course_title` directly from `course_mapping` table or were not joining with the `courses` table properly.

## Files Fixed

### 1. **app/api/course-mapping/route.ts** ✅



#### GET Endpoint
**Problem:** Returning raw `course_mapping` data without course details

**Solution:** Added join with `courses` table using foreign key relationship

```typescript
// Before (Lines 16-73)
let query = supabase
  .from('course_mapping')
  .select('*')  // ❌ No course details

// After
let query = supabase
  .from('course_mapping')
  .select(`
    *,
    course:courses!course_mapping_course_id_fkey (
      id,
      course_code,
      course_title
    )
  `)  // ✅ Joins with courses table
```

**Result:** API now returns course details nested in `course` object:
```json
{
  "id": "...",
  "course_id": "...",
  "course_code": "24UENS03",
  "course": {
    "id": "...",
    "course_code": "24UENS03",
    "course_title": "Environmental Science"
  }
}
```

#### POST Endpoint (Bulk & Single)
**Problem:** Insert operations weren't returning course details

**Solution:** Added same join to `.select()` after insert

```typescript
// Bulk insert (Line 204-223)
const { data, error } = await supabase
  .from('course_mapping')
  .insert([{...}])
  .select(`
    *,
    course:courses!course_mapping_course_id_fkey (
      id,
      course_code,
      course_title
    )
  `)
  .single()

// Single insert (Line 400-418) - Same pattern
```

#### PUT Endpoint
**Problem:** Update operations weren't returning course details

**Solution:** Added join to `.select()` after update (Lines 486-498)

```typescript
const { data, error } = await supabase
  .from('course_mapping')
  .update(updateData)
  .eq('id', id)
  .select(`
    *,
    course:courses!course_mapping_course_id_fkey (
      id,
      course_code,
      course_title
    )
  `)
  .single()
```

### 2. **app/api/course-offering/route.ts** ✅

#### GET Endpoint
**Problem:** Trying to fetch `course_title` from `course_mapping` table

```typescript
// Before (Lines 48-56) - ❌ WRONG TABLE
const { data: courseMappings, error: courseMappingsError } = await supabase
  .from('course_mapping')
  .select('course_code, course_title')  // ❌ course_title doesn't exist here
```

**Solution:** Changed to fetch from `courses` table

```typescript
// After (Lines 48-56) - ✅ CORRECT TABLE
const { data: courses, error: coursesError } = await supabase
  .from('courses')
  .select('course_code, course_title')  // ✅ course_title exists here
```

**Full Implementation:**
```typescript
// Fetch course data from courses table using course_code
const { data: courses, error: coursesError } = await supabase
  .from('courses')
  .select('course_code, course_title')

if (coursesError) {
  console.error('Courses fetch error:', coursesError)
  // Continue without course names rather than failing completely
}

// Create a map for quick lookup
const courseMap = new Map(
  (courses || []).map((c: any) => [c.course_code, c.course_title])
)

// Transform the data to include course_title by matching course_code
const transformedData = (offerings || []).map((item: any) => ({
  ...item,
  course_title: courseMap.get(item.course_code) || null
}))

return NextResponse.json(transformedData)
```

## Database Schema Reference

### courses table
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY,
  course_code VARCHAR(50) UNIQUE,
  course_title VARCHAR(255),
  -- ... other fields
)
```

### course_mapping table
```sql
CREATE TABLE course_mapping (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),  -- FK constraint: course_mapping_course_id_fkey
  course_code VARCHAR(50),  -- Denormalized for quick access
  institution_code VARCHAR(50),
  program_code VARCHAR(50),
  -- ... other fields
  -- NOTE: No course_title column here!
)
```

### course_offerings table
```sql
CREATE TABLE course_offerings (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  course_code VARCHAR(50),  -- Denormalized
  institutions_id UUID,
  program_id UUID,
  semester INTEGER,
  -- ... other fields
  -- NOTE: No course_title column here either!
)
```

## Join Patterns

### Pattern 1: Supabase Foreign Key Join (Recommended)
```typescript
// Using PostgREST foreign key relationship syntax
.select(`
  *,
  course:courses!course_mapping_course_id_fkey (
    id,
    course_code,
    course_title
  )
`)
```

**Format:** `alias:foreign_table!constraint_name (columns)`
- `course` - Alias for the joined data
- `courses` - Foreign table name
- `course_mapping_course_id_fkey` - FK constraint name
- `(id, course_code, course_title)` - Columns to select

### Pattern 2: Client-Side Join with Map
```typescript
// 1. Fetch courses separately
const { data: courses } = await supabase
  .from('courses')
  .select('course_code, course_title')

// 2. Create lookup map
const courseMap = new Map(
  courses.map(c => [c.course_code, c.course_title])
)

// 3. Transform data
const transformedData = offerings.map(item => ({
  ...item,
  course_title: courseMap.get(item.course_code) || null
}))
```

**When to Use:**
- ✅ Pattern 1: When you need nested objects in response
- ✅ Pattern 2: When you need flat objects with additional fields
- ✅ Pattern 2: When FK constraint might not exist yet

## Testing

### Test GET /api/course-mapping
```bash
curl http://localhost:3000/api/course-mapping?institution_code=JKKNCAS&program_code=BSCCS
```

**Expected Response:**
```json
[
  {
    "id": "...",
    "course_id": "...",
    "course_code": "24UENS03",
    "institution_code": "JKKNCAS",
    "program_code": "BSCCS",
    "semester_code": "SEM1",
    "course": {
      "id": "...",
      "course_code": "24UENS03",
      "course_title": "Environmental Science"
    }
  }
]
```

### Test GET /api/course-offering
```bash
curl http://localhost:3000/api/course-offering?institutions_id=xxx
```

**Expected Response:**
```json
[
  {
    "id": "...",
    "course_code": "24UENS03",
    "course_title": "Environmental Science",
    "institutions_id": "...",
    "program_id": "...",
    "semester": 1
  }
]
```

## Frontend Usage

### Accessing Course Title in Course Mapping
```typescript
// With Pattern 1 (nested object)
const response = await fetch('/api/course-mapping')
const mappings = await response.json()

mappings.forEach(mapping => {
  console.log(mapping.course.course_title)  // ✅ Access nested course.course_title
  console.log(mapping.course_code)          // ✅ Still available at top level
})
```

### Accessing Course Title in Course Offering
```typescript
// With Pattern 2 (flat object)
const response = await fetch('/api/course-offering')
const offerings = await response.json()

offerings.forEach(offering => {
  console.log(offering.course_title)  // ✅ Directly available
  console.log(offering.course_code)   // ✅ Also available
})
```

## Common Errors and Solutions

### Error 1: "column course_mapping.course_title does not exist"
**Cause:** Trying to select course_title from course_mapping table
**Solution:** Join with courses table or fetch from courses separately

### Error 2: "Could not find a relationship between 'course_mapping' and 'courses'"
**Cause:** Foreign key constraint doesn't exist
**Solution:**
1. Add FK constraint: `ALTER TABLE course_mapping ADD CONSTRAINT course_mapping_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id)`
2. Or use Pattern 2 (client-side join)

### Error 3: "course is null" in response
**Cause:** course_id in course_mapping doesn't match any record in courses table
**Solution:** Ensure data integrity - all course_id values must exist in courses table

## Build Status

✅ **Build Successful** - All TypeScript compilation completed without errors

```
 ✓ Compiled successfully in 21.9s
 ✓ Generating static pages (108/108)
```

## Related Files

- [app/api/course-mapping/route.ts](app/api/course-mapping/route.ts) - Course mapping CRUD with joins
- [app/api/course-offering/route.ts](app/api/course-offering/route.ts) - Course offering CRUD with course title
- [app/(authenticated)/course-mapping/page.tsx](app/(authenticated)/course-mapping/page.tsx) - Frontend page
- [app/(authenticated)/course-offering/page.tsx](app/(authenticated)/course-offering/page.tsx) - Frontend page

### 3. **app/api/exam-registrations/route.ts** ✅

#### GET Endpoint
**Problem:** Trying to select `course_name` from `course_offerings` table (doesn't exist)

**Solution:** Removed `course_name` from join, added client-side enrichment from `courses` table

```typescript
// Before (Line 21) - ❌ course_name doesn't exist in course_offerings
course_offering:course_offerings(id, course_code, course_name)

// After (Line 21) - ✅ Only select existing fields
course_offering:course_offerings(id, course_code)

// Then enrich with course names (Lines 45-67)
const { data: courses, error: coursesError } = await supabase
  .from('courses')
  .select('course_code, course_title')

const courseMap = new Map(
  (courses || []).map((c: any) => [c.course_code, c.course_title])
)

const transformedData = (data || []).map((item: any) => ({
  ...item,
  course_offering: item.course_offering ? {
    ...item.course_offering,
    course_name: courseMap.get(item.course_offering.course_code) || null
  } : null
}))

return NextResponse.json(transformedData)
```

#### POST Endpoint
**Problem:** Same issue in insert response

**Solution:** Removed `course_name` from join (Line 108), added enrichment after insert (Lines 156-167)

```typescript
// After insert, enrich with course_name
if (data && data.course_offering && data.course_offering.course_code) {
  const { data: course } = await supabase
    .from('courses')
    .select('course_title')
    .eq('course_code', data.course_offering.course_code)
    .single()

  if (course) {
    data.course_offering.course_name = course.course_title
  }
}
```

#### PUT Endpoint
**Problem:** Same issue in update response

**Solution:** Removed `course_name` from join (Line 181), added enrichment after update (Lines 242-253)

## Summary

**Fixed:**
- ✅ GET /api/course-mapping - Now joins with courses table
- ✅ POST /api/course-mapping - Returns course details after insert
- ✅ PUT /api/course-mapping - Returns course details after update
- ✅ GET /api/course-offering - Fetches course_title from courses table
- ✅ GET /api/exam-registrations - Enriches course_offering with course_name from courses
- ✅ POST /api/exam-registrations - Enriches response with course_name
- ✅ PUT /api/exam-registrations - Enriches response with course_name

**Pattern Used:**
- Course Mapping API: Foreign key join (Pattern 1)
- Course Offering API: Client-side join with Map (Pattern 2)
- Exam Registrations API: Client-side enrichment with Map (Pattern 2)

**Result:**
- No more "course_title does not exist" errors
- Course details properly available in all responses
- Build completes successfully

---

**Date:** 2025-10-27
**Status:** ✅ Complete
