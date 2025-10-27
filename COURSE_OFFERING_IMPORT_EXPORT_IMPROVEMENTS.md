# Course Offering Import/Export Improvements

## Overview
Enhanced the course offering page's download, upload, and template functionality based on the Universal CRUD template standards to provide a better user experience and more robust data handling.

## Changes Made

### 1. Enhanced Excel Export (`handleExport`)

**Improvements:**
- ✅ Added separate columns for codes and names for better clarity
- ✅ Included all reference data (Institution, Course, Session, Program)
- ✅ Used code columns from the new index structure
- ✅ Improved column widths for better readability

**Export Columns:**
```
- Institution Code (18 chars)
- Institution Name (25 chars)
- Course Code (15 chars)
- Course Title (35 chars)
- Session Code (20 chars)
- Session Name (25 chars)
- Program Code (20 chars)
- Program Name (30 chars)
- Semester (10 chars)
- Section (10 chars)
- Max Enrollment (15 chars)
- Enrolled Count (15 chars)
- Status (10 chars)
- Created (12 chars)
```

### 2. Enhanced Template Export (`handleTemplateExport`)

**Major Improvements:**
- ✅ **Styled Headers**: Mandatory fields marked with red background and asterisk (*)
- ✅ **Single Combined Reference Sheet**: All reference data in one convenient sheet
- ✅ **Minimal Course Data**: Course codes shown without titles for cleaner reference
- ✅ **Visual Indicators**: Mandatory vs optional fields clearly distinguished
- ✅ **Active Data Only**: Reference sheet filters for active records only
- ✅ **Success Toast**: Confirmation message when template is downloaded

**Template Structure:**

**Sheet 1: Template**
- Sample row with valid data
- Headers styled:
  - **Red background + asterisk**: Institution Code *, Course Code *, Session Code *, Program Code *, Semester *
  - **Gray background**: Section, Max Enrollment, Enrolled Count, Status

**Sheet 2: Reference Codes** (Combined Single Sheet)

Organized in sections with empty row separators:

**INSTITUTION CODES Section:**
- Type: Institution
- Code: institution_code
- Name: institution_name

**COURSE CODES Section:**
- Type: Course
- Code: course_code
- Name: (empty - course codes only, no titles)

**SESSION CODES Section:**
- Type: Session
- Code: session_code
- Name: session_name

**PROGRAM CODES Section:**
- Type: Program
- Code: program_code
- Name: program_name

### 3. Enhanced Import (`handleImport`)

**Major Improvements:**
- ✅ **CSV Support**: Added full CSV file parsing
- ✅ **Flexible Field Mapping**: Supports multiple header variations
  - With asterisk: `Institution Code *`
  - Without asterisk: `Institution Code`
  - Lowercase: `institution_code`
- ✅ **Smart Data Mapping**: Handles different data formats
- ✅ **Validation Before Upload**: Filters out invalid rows
- ✅ **Better Error Messages**: More descriptive validation errors
- ✅ **Row Tracking**: Accurate Excel row numbers in error messages

**Field Mapping:**
```typescript
institution_code: 'Institution Code *' || 'Institution Code' || 'institution_code'
course_code: 'Course Code *' || 'Course Code' || 'course_code'
session_code: 'Session Code *' || 'Session Code' || 'session_code'
program_code: 'Program Code *' || 'Program Code' || 'program_code'
semester: 'Semester *' || 'Semester' || 'semester'
section: 'Section' || 'section'
max_enrollment: 'Max Enrollment' || 'max_enrollment'
enrolled_count: 'Enrolled Count' || 'enrolled_count'
is_active: 'Status' || 'is_active' (active/inactive)
```

**Validation:**
- Required fields must be present and non-empty
- Data types are converted properly (strings to integers)
- Null handling for optional fields
- Boolean conversion for status field

### 4. Updated Type Definitions

**Enhanced Interfaces:**
```typescript
interface Institution {
  id: string
  institution_code: string
  institution_name: string
  is_active?: boolean  // Added
}

interface Course {
  id: string
  course_code: string
  course_title: string
  is_active?: boolean  // Added
}

interface ExaminationSession {
  id: string
  session_code: string
  session_name: string
  is_active?: boolean  // Added
}

interface Program {
  id: string
  program_code: string
  program_name: string
  is_active?: boolean  // Added
}
```

## File Format Support

### Supported Import Formats:
1. **JSON** (`.json`)
2. **CSV** (`.csv`) - NEW!
3. **Excel** (`.xlsx`, `.xls`)

### Supported Export Formats:
1. **JSON** (`.json`) - Data export
2. **Excel** (`.xlsx`) - Full data export with names
3. **Excel Template** (`.xlsx`) - Template with reference sheets

## User Experience Improvements

### 1. Clear Visual Feedback
- Template download shows success toast
- Import shows detailed progress (total/success/failed)
- Error dialog with row-by-row details
- Color-coded summary cards (blue/green/red)

### 2. Better Error Handling
- Row numbers match Excel file (including header)
- Specific error messages from API
- Network error detection
- File format validation

### 3. Reference Data Integration
- Single combined reference sheet for all foreign keys
- Users can cross-reference valid codes in one place
- Course codes shown without titles for cleaner display
- Sections separated by empty rows for easy navigation
- Only active records shown in reference sheet
- Consistent 3-column formatting (Type, Code, Name)

## Usage Examples

### Export Data
1. Click "Export" button
2. Receives Excel file with 14 columns
3. Includes both codes and human-readable names

### Download Template
1. Click "Download Template" button
2. Receives Excel file with 2 sheets
3. Template sheet has styled headers (red = required)
4. Reference Codes sheet shows all valid codes in sections:
   - INSTITUTION CODES (with names)
   - COURSE CODES (codes only, no titles)
   - SESSION CODES (with names)
   - PROGRAM CODES (with names)

### Import Data
1. Click "Import" button
2. Select JSON, CSV, or Excel file
3. System validates and maps fields automatically
4. Shows summary: total/success/failed
5. Error dialog shows specific issues with row numbers

## Benefits

✅ **Easier Data Entry**: Single reference sheet with all valid codes
✅ **Cleaner Display**: Course codes without titles for faster lookup
✅ **Better Organization**: Sections separated for easy navigation
✅ **Fewer Errors**: Visual indicators for required fields
✅ **Better Debugging**: Row-by-row error tracking
✅ **Flexible Import**: Supports multiple file formats and header variations
✅ **Comprehensive Export**: Includes all relevant data for analysis
✅ **Professional UX**: Matches Universal CRUD template standards
✅ **Less Clutter**: 2 sheets instead of 5 for simpler navigation

## Technical Details

**Dependencies:**
- `xlsx` library for Excel operations
- Native File API for file handling
- Fetch API for server communication

**Performance:**
- Row-by-row processing for better error handling
- Async/await for non-blocking operations
- Proper loading states during bulk operations

**Error Handling:**
- Try-catch blocks at multiple levels
- API error extraction
- Network error detection
- User-friendly error messages

## Compatibility

**Browser Support:**
- Modern browsers with File API support
- Excel 2007+ (.xlsx format)
- CSV (UTF-8 encoding)
- JSON (standard format)

**Data Requirements:**
- Institution codes must exist in institutions table
- Course codes must exist in course_mapping table
- Session codes must exist in examination_sessions table
- Program codes must exist in programs table
- Semester must be between 1-12

## Related Files

- Frontend: [app/(authenticated)/course-offering/page.tsx](app/(authenticated)/course-offering/page.tsx)
- API: [app/api/course-offering/route.ts](app/api/course-offering/route.ts)
- Migration: [supabase/migrations/20251017_update_course_offering_unique_constraint.sql](supabase/migrations/20251017_update_course_offering_unique_constraint.sql)
- Template: [UNIVERSAL_CRUD_PROMPT_TEMPLATE.md](UNIVERSAL_CRUD_PROMPT_TEMPLATE.md)

---

**Last Updated:** 2025-10-26
**Version:** 2.0
**Reference:** Universal CRUD Template (lines 349-707)
