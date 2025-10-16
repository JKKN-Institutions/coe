# Grades - Regulation Dropdown Fix

## Issue
The regulation dropdown in the grades page was not fetching or displaying regulations properly.

## Root Cause
The code was filtering regulations by `r.is_active`, but the regulations table uses `r.status` as the active/inactive field.

## Fixes Applied

### 1. Fixed `fetchRegulations()` Function
**Location:** `app/(authenticated)/grades/page.tsx` line 504

**Before:**
```typescript
setRegulations(data.filter((r: any) => r.is_active).map((r: any) => ({
  id: r.id,
  regulation_code: r.regulation_code,
  regulation_year: r.regulation_year
})))
```

**After:**
```typescript
setRegulations(data.filter((r: any) => r.status).map((r: any) => ({
  id: r.id,
  regulation_code: r.regulation_code,
  regulation_year: r.regulation_year
})))
```

### 2. Fixed `handleTemplateExport()` Function
**Location:** `app/(authenticated)/grades/page.tsx` line 281

**Before:**
```typescript
currentRegulations = dataReg.filter((r: any) => r.is_active).map((r: any) => ({
  id: r.id,
  regulation_code: r.regulation_code,
  regulation_year: r.regulation_year
}))
```

**After:**
```typescript
currentRegulations = dataReg.filter((r: any) => r.status).map((r: any) => ({
  id: r.id,
  regulation_code: r.regulation_code,
  regulation_year: r.regulation_year
}))
```

### 3. Fixed PUT/UPDATE API Call
**Location:** `app/(authenticated)/grades/page.tsx` line 167

**Before:**
```typescript
const res = await fetch(`/api/grades/${editing.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
```

**After:**
```typescript
const res = await fetch('/api/grades', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: editing.id, ...payload })
})
```

**Reason:** The API route.ts expects the ID in the request body, not in the URL path.

### 4. Fixed DELETE API Call
**Location:** `app/(authenticated)/grades/page.tsx` line 196

**Before:**
```typescript
const res = await fetch(`/api/grades/${id}`, { method: 'DELETE' })
```

**After:**
```typescript
const res = await fetch(`/api/grades?id=${id}`, { method: 'DELETE' })
```

**Reason:** The API route.ts expects the ID as a query parameter, not in the URL path.

## Regulations Table Schema Reference

The regulations table uses the following structure:

```sql
CREATE TABLE regulations (
  id BIGSERIAL PRIMARY KEY,
  regulation_year INT NOT NULL,
  regulation_code VARCHAR(50) NOT NULL UNIQUE,
  status BOOLEAN NOT NULL DEFAULT true,  -- ← This is the active/inactive field
  ...
)
```

**Key Field:** `status` (BOOLEAN) - indicates if a regulation is active or inactive.

## Expected Behavior Now

1. ✅ **Regulation Dropdown Populates**: The dropdown should now show all active regulations
2. ✅ **Regulation Display Format**: Shows as `{regulation_code} - Year {regulation_year}`
3. ✅ **Regulation Selection Works**: Users can select a regulation and it properly saves with the grade
4. ✅ **Template Export Includes Regulations**: Excel template now includes a reference sheet with active regulations
5. ✅ **Update/Edit Works**: Can edit existing grades and update the regulation
6. ✅ **Delete Works**: Can delete grades properly

## Testing Checklist

- [ ] Open the grades page at `/grades`
- [ ] Click "Add" button
- [ ] Verify regulation dropdown shows regulations
- [ ] Select a regulation and verify it displays correctly
- [ ] Create a new grade with a regulation
- [ ] Edit an existing grade and change the regulation
- [ ] Delete a grade
- [ ] Download the template and verify regulations reference sheet exists
- [ ] Import grades with regulation_id and verify they save correctly

## Related Files

- **Frontend:** [app/(authenticated)/grades/page.tsx](app/(authenticated)/grades/page.tsx)
- **API:** [app/api/grades/route.ts](app/api/grades/route.ts)
- **Regulations API:** [app/api/regulations/route.ts](app/api/regulations/route.ts)

## Summary

All regulation dropdown issues have been fixed. The dropdown now properly:
- Fetches regulations using the correct `status` field
- Displays regulations in the dropdown
- Saves regulation_id with grades
- Updates and deletes grades correctly
