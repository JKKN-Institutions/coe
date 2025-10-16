# Grades Page - Fix Required

## Issue
The grades page was created with incorrect schema (grade_system based). It needs to be completely recreated with the correct database schema.

## Correct Database Schema

```sql
CREATE TABLE grades (
  id UUID PRIMARY KEY,
  institutions_id UUID NOT NULL,
  institutions_code VARCHAR NOT NULL,
  grade VARCHAR NOT NULL,
  grade_point NUMERIC NOT NULL,
  description TEXT NOT NULL,
  regulation_id BIGSERIAL NOT NULL,
  regulation_code VARCHAR NULL,
  qualify BOOLEAN NULL DEFAULT false,
  exclude_cgpa BOOLEAN NULL DEFAULT false,
  created_at TIMESTAMPTZ NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NULL DEFAULT NOW()
)
```

## What Exists ✅

1. **Database Migration**: [supabase/migrations/20250115_create_grades_table.sql](supabase/migrations/20250115_create_grades_table.sql) ✅ CORRECT
2. **API Routes**: [app/api/grades/route.ts](app/api/grades/route.ts) ✅ CORRECT

## What Needs to Be Created ❌

1. **Frontend Page**: `app/(authenticated)/grades/page.tsx` needs to be recreated

## Quick Fix: Use Program Page as Template

The program page ([app/(authenticated)/program/page.tsx](app/(authenticated)/program/page.tsx)) has a similar structure with foreign key dropdowns. You can copy it and modify:

### Changes Required:

1. **TypeScript Interface**:
```typescript
interface Grade {
  id: string
  institutions_id: string
  institutions_code: string
  grade: string
  grade_point: number
  description: string
  regulation_id: number
  regulation_code?: string
  qualify: boolean
  exclude_cgpa: boolean
  created_at: string
  updated_at: string
}
```

2. **Form Data State**:
```typescript
const [formData, setFormData] = useState({
  institutions_code: "",
  regulation_id: "",
  grade: "",
  grade_point: "",
  description: "",
  qualify: false,
  exclude_cgpa: false,
})
```

3. **Dropdown Data**:
```typescript
const [institutions, setInstitutions] = useState<Array<{...}>>([])
const [regulations, setRegulations] = useState<Array<{...}>>([])
```

4. **Fetch Functions**:
```typescript
const fetchInstitutions = async () => { /* fetch from /api/institutions */ }
const fetchRegulations = async () => { /* fetch from /api/regulations */ }
```

5. **Table Columns**:
- Institution Code
- Regulation (Code or ID)
- Grade
- Grade Point
- Description (truncated)
- Qualify (badge)
- Exclude CGPA (badge)
- Actions

6. **Form Fields**:
- Institution Code (dropdown) - Required
- Regulation (dropdown) - Required
- Grade (text input) - Required
- Grade Point (number input 0-10) - Required
- Description (textarea) - Required
- Qualify (toggle switch) - Optional
- Exclude CGPA (toggle switch) - Optional

## Files to Delete

- [x] Deleted: `app/api/grade-system` (incorrect schema)
- [x] Deleted: `app/(authenticated)/grade-system` (incorrect schema)
- [x] Deleted: `app/(authenticated)/grades/page.tsx` (incorrect schema)

## Next Steps

1. Copy `app/(authenticated)/program/page.tsx` to `app/(authenticated)/grades/page.tsx`
2. Replace all "Program" references with "Grade"
3. Update interface, form data, and API endpoints
4. Update table columns to match grade schema
5. Update form fields to match grade schema
6. Test CRUD operations

## Reference

- **Migration**: `supabase/migrations/20250115_create_grades_table.sql`
- **API**: `app/api/grades/route.ts`
- **Template**: `app/(authenticated)/program/page.tsx`
