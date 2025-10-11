# Course Master Excel Template - Quick Reference

## Template Structure

### Sheet 1: Course Master

| Column # | Field Name | Type | Mandatory | Sample Value | Notes |
|----------|-----------|------|-----------|--------------|-------|
| 1 | Institution Code | Text | ✅ | JKKN | Must exist in institutions table |
| 2 | Regulation Code | Text | ✅ | R2021 | Must exist in regulations table |
| 3 | Offering Department Code | Text | ✅ | CSE | Must exist in departments table |
| 4 | Course Code | Text | ✅ | CS101 | Alphanumeric, hyphens, underscores only |
| 5 | Course Name | Text | ✅ | Programming in C | Full course title |
| 6 | Display Code | Text | ✅ | PGC101 | Alternate display code |
| 7 | Course Category | Text | ✅ | Core | Core/Elective/Audit/Mandatory |
| 8 | Course Type | Text | | Theory | Theory/Practical/Project/Seminar/Lab |
| 9 | Course Part Master | Text | | Part I | Part I/II/III/IV/V |
| 10 | Credit | Number | | 3.00 | Total course credits (0-99) |
| 11 | Split Credit | Boolean | | FALSE | TRUE if theory + practical split |
| 12 | Theory Credit | Number | | 3.00 | Theory credits (required if split) |
| 13 | Practical Credit | Number | | 0.00 | Practical credits (required if split) |
| 14 | QP Code | Text | ✅ | QP-2025-CS101 | Question paper code |
| 15 | E Code Name | Text | | English | Tamil/English/French/Malayalam/Hindi |
| 16 | Duration Hours | Number | | 60 | Total course hours |
| 17 | Evaluation Type | Text | ✅ | Mark | Mark/Grade/CA/ESE/CA + ESE |
| 18 | Result Type | Text | ✅ | Mark | Mark/Grade/Status |
| 19 | Self Study Course | Boolean | | FALSE | TRUE/FALSE |
| 20 | Outside Class Course | Boolean | | FALSE | TRUE/FALSE |
| 21 | Open Book | Boolean | | FALSE | TRUE/FALSE |
| 22 | Online Course | Boolean | | FALSE | TRUE/FALSE |
| 23 | Dummy Number Not Required | Boolean | | TRUE | TRUE/FALSE |
| 24 | Annual Course | Boolean | | FALSE | TRUE/FALSE |
| 25 | Multiple QP Set | Boolean | | FALSE | TRUE/FALSE |
| 26 | No of QP Setter | Number | | 2 | Number of question paper setters |
| 27 | No of Scrutinizer | Number | | 1 | Number of scrutinizers |
| 28 | Fee Exception | Boolean | | FALSE | TRUE/FALSE |
| 29 | Syllabus PDF URL | Text | | https://example.com/syllabus.pdf | Valid URL |
| 30 | Description | Text | | Introductory C course... | Course description |
| 31 | Status | Boolean | | TRUE | TRUE=Active, FALSE=Inactive |

### Sheet 2: Reference Data

Contains lookup values fetched from database:
- **Institution Codes** - Live data from institutions table
- **Regulation Codes** - Live data from regulations table
- **Department Codes** - Live data from departments table
- **Fixed Lists** - Course categories, types, evaluation types, etc.
- **Notes** - Field requirements and validation rules

## Validation Rules

### Required Fields
- Institution Code, Regulation Code, Offering Department Code
- Course Code, Course Name, Display Code
- Course Category, QP Code
- Evaluation Type, Result Type

### Format Rules
- **Course Code**: Only letters, numbers, hyphens (-), underscores (_)
- **Credit**: 0 to 99
- **Boolean**: TRUE or FALSE (case-insensitive)
- **URL**: Must be valid (http:// or https://)

### Foreign Key Constraints
- Institution Code must exist in institutions table
- Regulation Code must exist in regulations table
- Offering Department Code must exist in departments table

### Conditional Rules
- If **Split Credit = TRUE**, then:
  - Theory Credit must be provided and > 0
  - Practical Credit must be provided and > 0

## Usage Steps

1. **Download Template**
   - Click "Template" button on Courses page
   - Excel file downloads automatically

2. **Review Reference Data**
   - Open downloaded file
   - Go to Sheet 2 (Reference Data)
   - Note valid values for dropdowns

3. **Fill Course Data**
   - Go to Sheet 1 (Course Master)
   - Use sample row as guide
   - Fill mandatory fields (marked with *)
   - Use exact values from Reference Data

4. **Upload**
   - Click "Import" button on Courses page
   - Select filled Excel file
   - Review upload summary
   - Fix errors if any and re-upload

## Common Errors and Fixes

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Institution code required" | Empty institution code | Fill with valid code from Reference Data |
| "Invalid course code format" | Special characters in code | Use only letters, numbers, - and _ |
| "Credit must be 0-99" | Invalid credit value | Enter number between 0 and 99 |
| "Institution with code not found" | Invalid foreign key | Use exact code from Reference Data sheet |
| "Theory credit required when split" | Split credit ON but no theory credit | Fill theory and practical credits |
| "Please enter a valid URL" | Malformed URL | Use format: https://example.com/file.pdf |
| "Row X: Failed to save" | Duplicate or constraint violation | Check for duplicate course codes |

## Tips for Success

✅ **Do's:**
- Copy exact codes from Reference Data sheet
- Use TRUE/FALSE for boolean fields (capital or lowercase)
- Fill all mandatory fields before upload
- Use sample row as reference
- Test with small batch first (5-10 rows)

❌ **Don'ts:**
- Don't modify column headers
- Don't use special characters in course code
- Don't leave mandatory fields empty
- Don't use spaces in boolean fields
- Don't use codes not in Reference Data

## Quick Checklist

Before uploading, verify:
- [ ] All mandatory fields filled (marked with *)
- [ ] Institution/Regulation/Department codes match Reference Data
- [ ] Course codes use only allowed characters
- [ ] Credits are within valid range (0-99)
- [ ] Boolean fields use TRUE or FALSE
- [ ] URLs are properly formatted (if provided)
- [ ] Split credit logic is correct (if enabled)
- [ ] No duplicate course codes

## Support

- Documentation: See `COURSE_TEMPLATE_DOCUMENTATION.md`
- Errors: Check error dialog for specific row details
- Questions: Contact development team

---

**Last Updated:** 2025-01-11
**Template Version:** 1.0
