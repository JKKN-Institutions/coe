# Course Master Excel Template - Implementation Documentation

## Overview

This document describes the implementation of the Course Master Excel template system for bulk uploading course data with reference data and validation support.

## Features Implemented

### 1. Excel Template with Two Sheets

#### Sheet 1: Course Master
Contains all course fields with headers and a sample data row:

**Mandatory Fields (marked with *):**
- Institution Code*
- Regulation Code*
- Offering Department Code*
- Course Code*
- Course Name*
- Display Code*
- Course Category*
- QP Code*
- Evaluation Type*
- Result Type*

**Optional Fields:**
- Course Type
- Course Part Master
- Credit
- Split Credit
- Theory Credit
- Practical Credit
- E Code Name
- Duration Hours
- Self Study Course
- Outside Class Course
- Open Book
- Online Course
- Dummy Number Not Required
- Annual Course
- Multiple QP Set
- No of QP Setter
- No of Scrutinizer
- Fee Exception
- Syllabus PDF URL
- Description
- Status

#### Sheet 2: Reference Data
Provides lookup values and constraints for:
- **Institution Codes** - Fetched from `institutions` table
- **Regulation Codes** - Fetched from `regulations` table
- **Department Codes** - Fetched from `departments` table
- **Course Categories** - Fixed list (Core, Elective, Audit, Mandatory)
- **Course Types** - Fixed list (Theory, Practical, Project, Seminar, Lab)
- **Evaluation Types** - Fixed list (Mark, Grade, CA, ESE, CA + ESE)
- **Result Types** - Fixed list (Mark, Grade, Status)
- **E Code Names** - Fixed list (None, Tamil, English, French, Malayalam, Hindi)
- **Boolean Fields** - TRUE/FALSE
- **Status** - TRUE (Active) / FALSE (Inactive)

Also includes helpful notes about:
- Field requirements
- Boolean field format
- Foreign key constraints
- Numeric field constraints
- URL format requirements

## File Structure

### 1. Template Generator Utility
**File:** `lib/utils/excel-template-generator.ts`

**Key Functions:**
- `generateCourseTemplate(referenceData: CourseReferenceData)` - Generates workbook with both sheets
- `workbookToBuffer(workbook: XLSX.WorkBook)` - Converts workbook to downloadable buffer

**Features:**
- Automatically fetches reference data from database
- Sets optimal column widths for readability
- Includes sample data row for guidance
- Provides comprehensive reference documentation in Sheet 2

### 2. API Endpoint
**File:** `app/api/courses/template/route.ts`

**Endpoint:** `GET /api/courses/template`

**Functionality:**
- Fetches active institutions, departments, and regulations from database
- Generates Excel template with real reference data
- Returns XLSX file with proper headers for download
- Filename format: `Course_Master_Template_YYYY-MM-DD.xlsx`

**Error Handling:**
- Returns JSON error response if template generation fails
- Includes detailed error messages for debugging

### 3. Frontend Integration
**File:** `app/(authenticated)/courses/page.tsx`

**Modified Function:** `downloadTemplate()`

**Implementation:**
- Makes API call to `/api/courses/template`
- Handles blob response for file download
- Creates temporary download link and triggers download
- Shows success/error toast notifications
- Cleans up temporary URL after download

## Usage Instructions

### For End Users

1. **Download Template**
   - Navigate to Courses page
   - Click "Template" button in the action bar
   - Excel file will download automatically

2. **Fill Template**
   - Open downloaded Excel file
   - Review Sheet 2 (Reference Data) for valid values
   - Fill in course data in Sheet 1 (Course Master)
   - Follow the sample data row as a guide
   - Ensure all mandatory fields (marked with *) are filled

3. **Upload Data**
   - Click "Import" button on Courses page
   - Select your filled Excel file
   - System will validate and import courses
   - View upload summary with success/failure counts
   - Review detailed error dialog if validation fails

### For Developers

**To modify template structure:**

1. Update `lib/utils/excel-template-generator.ts`:
   - Modify `courseMasterHeaders` array to add/remove columns
   - Update `sampleRow` array to match header changes
   - Adjust `courseMasterSheet['!cols']` array for column widths

2. Update upload handler in `app/(authenticated)/courses/page.tsx`:
   - Modify field mapping in `handleFileUpload()` function
   - Update validation rules to match new fields
   - Test with actual Excel file

3. Update database schema if adding new fields:
   - Create migration in `supabase/migrations/`
   - Update API routes (`app/api/courses/route.ts`)
   - Update TypeScript interfaces

## Validation Rules

### Client-Side Validation (in upload handler)

**Required Fields:**
- Institution Code - Must not be empty
- Regulation Code - Must not be empty
- Course Code - Must not be empty, alphanumeric with hyphens/underscores only
- Course Name - Must not be empty
- Display Code - Must not be empty
- QP Code - Must not be empty
- Course Category - Must not be empty
- Evaluation Type - Must not be empty
- Result Type - Must not be empty

**Format Validation:**
- Course Code - Regex: `/^[A-Za-z0-9\-_]+$/`
- Credit - Must be 0-99
- Theory Credit - Must be 0-99 (if split credit enabled)
- Practical Credit - Must be 0-99 (if split credit enabled)
- Duration Hours - Positive number
- Syllabus PDF URL - Valid URL format

**Boolean Fields:**
- Accept: TRUE, FALSE (case-insensitive)
- Default to FALSE if not specified or invalid

### Server-Side Validation (in API)

**Foreign Key Validation:**
- Institution Code must exist in `institutions` table
- Regulation Code must exist in `regulations` table
- Offering Department Code must exist in `departments` table (if provided)

**Duplicate Prevention:**
- Unique constraint on combination of fields
- Returns error if course already exists

## Error Handling

### Upload Error Dialog

**Features:**
- Visual summary cards showing Total/Success/Failed counts
- Detailed list of errors with row numbers
- Specific error messages for each validation failure
- Helpful tips section for common fixes
- Color-coded display (Blue/Green/Red)

**Error Information Includes:**
- Excel row number (accounting for header row)
- Course code and name (if available)
- List of specific validation errors
- Suggestions for fixing common issues

### Toast Notifications

**Success Cases:**
- Full success: Green toast with total count
- Template download: Confirmation message

**Partial Success:**
- Yellow toast indicating success/failure counts
- Prompts user to view error dialog

**Failure Cases:**
- Red toast with error count
- Specific error message from API

## Technical Details

### Dependencies
- `xlsx` - Excel file generation and parsing
- Next.js API routes - Server-side template generation
- Supabase - Database queries for reference data

### Performance Considerations
- Reference data cached during template generation
- Only fetches active records (status = true)
- Efficient column width calculation
- Streaming file download (no memory buffering)

### Security
- Uses service role key for database access
- Validates all user input before database operations
- Prevents SQL injection through parameterized queries
- Sanitizes file upload data

## Testing Checklist

- [ ] Download template from UI
- [ ] Verify Sheet 1 has all course fields
- [ ] Verify Sheet 2 has reference data from database
- [ ] Verify sample data row is present and accurate
- [ ] Fill template with valid data and upload
- [ ] Fill template with invalid data and verify error messages
- [ ] Test with empty required fields
- [ ] Test with invalid format (e.g., special characters in course code)
- [ ] Test with non-existent foreign keys
- [ ] Test with boolean fields (TRUE/FALSE variations)
- [ ] Test with numeric field boundaries (negative, too large)
- [ ] Verify error dialog shows correct row numbers
- [ ] Verify toast notifications display correctly

## Future Enhancements

### Potential Improvements
1. **Excel Data Validation**
   - Add dropdown lists for categorical fields
   - Add cell validation for numeric ranges
   - Highlight mandatory fields in color

2. **Template Customization**
   - Allow users to select which fields to include
   - Save custom template configurations
   - Export existing courses as template

3. **Batch Operations**
   - Support for updating existing courses
   - Delete courses via template
   - Bulk status changes

4. **Advanced Validation**
   - Cross-field validation (e.g., theory + practical = total credit)
   - Duplicate detection before upload
   - Preview changes before commit

5. **Audit Trail**
   - Track who uploaded which courses
   - Record upload timestamps
   - Store upload history and rollback capability

## Troubleshooting

### Common Issues

**Issue:** Template download fails
- **Solution:** Check API endpoint is accessible, verify database connection

**Issue:** Reference data sheet is empty
- **Solution:** Ensure institutions, departments, regulations tables have active records

**Issue:** Upload fails with "Foreign key not found"
- **Solution:** Verify codes in Sheet 2 Reference Data, use exact matching codes

**Issue:** Boolean fields not recognized
- **Solution:** Use exactly "TRUE" or "FALSE" (case-insensitive)

**Issue:** Excel file opens with encoding errors
- **Solution:** Ensure file is saved as .xlsx format, not .xls or CSV

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in upload dialog
3. Check browser console for detailed errors
4. Review server logs for API errors
5. Contact development team with specific error details

## Changelog

### Version 1.0 (2025-01-11)
- Initial implementation
- Two-sheet template (Course Master + Reference Data)
- Dynamic reference data from database
- Sample data row included
- Comprehensive error handling
- Visual upload summary
- Toast notifications
