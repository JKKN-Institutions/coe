# Course Master Excel Template - Field Mapping Reference

## Exact Column Names for Upload

**IMPORTANT:** Use these EXACT column names in your Excel template for successful uploads.

| Excel Column Name (Use This) | Database Field | Mandatory | Data Type | Example Value |
|------------------------------|----------------|-----------|-----------|---------------|
| `Institution Code*` | institution_code | ✅ | Text | JKKN |
| `Regulation Code*` | regulation_code | ✅ | Text | R2021 |
| `Offering Department Code*` | offering_department_code | ✅ | Text | CSE |
| `Course Code*` | course_code | ✅ | Text | CS101 |
| `Course Name*` | course_title | ✅ | Text | Programming in C |
| `Display Code*` | display_code | ✅ | Text | PGC101 |
| `Course Category*` | course_category | ✅ | Text | Core |
| `Course Type` | course_type | | Text | Theory |
| `Course Part Master` | course_part_master | | Text | Part I |
| `Credit` | credits | | Number | 3 |
| `Split Credit` | split_credit | | Boolean | FALSE |
| `Theory Credit` | theory_credit | | Number | 3 |
| `Practical Credit` | practical_credit | | Number | 0 |
| `QP Code*` | qp_code | ✅ | Text | QP-2025-CS101 |
| `E Code Name` | e_code_name | | Text | English |
| `Duration Hours` | duration_hours | | Number | 60 |
| `Evaluation Type*` | evaluation_type | ✅ | Text | CA + ESE |
| `Result Type*` | result_type | ✅ | Text | Mark |
| `Self Study Course` | self_study_course | | Boolean | FALSE |
| `Outside Class Course` | outside_class_course | | Boolean | FALSE |
| `Open Book` | open_book | | Boolean | FALSE |
| `Online Course` | online_course | | Boolean | FALSE |
| `Dummy Number Not Required` | dummy_number_required | | Boolean | TRUE |
| `Annual Course` | annual_course | | Boolean | FALSE |
| `Multiple QP Set` | multiple_qp_set | | Boolean | FALSE |
| `No of QP Setter` | no_of_qp_setter | | Number | 2 |
| `No of Scrutinizer` | no_of_scrutinizer | | Number | 1 |
| `Fee Exception` | fee_exception | | Boolean | FALSE |
| `Syllabus PDF URL` | syllabus_pdf_url | | URL | https://example.com/syllabus.pdf |
| `Description` | description | | Text | Course description... |
| `Status` | is_active | | Boolean | TRUE |

## Field Value Constraints

### Evaluation Type (Dropdown Values)
Use one of these EXACT values:
- `CA`
- `ESE`
- `CA + ESE`

### Result Type (Dropdown Values)
Use one of these EXACT values:
- `Mark`
- `Grade`
- `Status`

### Course Category (Common Values)
- `Core`
- `Elective`
- `Audit`
- `Mandatory`
- `Theory`
- `Practical`
- `Project`
- `Theory + Practical`
- `Theory + Project`
- `Field Work`
- `Community Service`
- `Group Project`
- `Non Academic`

### Course Type (Common Values)
- `Core`
- `Generic Elective`
- `Skill Enhancement`
- `Ability Enhancement`
- `Language`
- `English`
- `Advance learner course`
- `Additional Credit course`
- `Discipline Specific elective`
- `Audit Course`
- `Bridge course`
- `Non Academic`
- `Naanmuthalvan`

### E Code Name (Dropdown Values)
Use one of these EXACT values:
- `Tamil`
- `English`
- `French`
- `Malayalam`
- `Hindi`

### Course Part Master (Dropdown Values)
- `Part I`
- `Part II`
- `Part III`
- `Part IV`
- `Part V`

### Boolean Fields
All boolean fields accept:
- `TRUE` (case-insensitive)
- `FALSE` (case-insensitive)

**Note:** Any value other than TRUE (case-insensitive) will be treated as FALSE.

## Common Upload Errors and Solutions

### Error: "Evaluation type required"
**Cause:** The column name doesn't match or cell is empty
**Solution:**
1. Ensure column header is exactly: `Evaluation Type*`
2. Fill the cell with one of: `CA`, `ESE`, or `CA + ESE`
3. Remove any extra spaces or special characters

### Error: "Result type required"
**Cause:** The column name doesn't match or cell is empty
**Solution:**
1. Ensure column header is exactly: `Result Type*`
2. Fill the cell with either: `Mark`, `Grade`, or `Status`

### Error: "Institution code required"
**Cause:** Empty institution code or code doesn't exist in database
**Solution:**
1. Check the "Reference Data" sheet for valid institution codes
2. Use the EXACT code from the reference data (case-sensitive)

### Error: "Invalid course code format"
**Cause:** Course code contains invalid characters
**Solution:**
- Only use: letters (A-Z, a-z), numbers (0-9), hyphens (-), and underscores (_)
- Remove spaces, special characters like @, #, $, %, etc.

## Upload Process Flowchart

```
1. Download Template
   ↓
2. Fill Data (use exact column names)
   ↓
3. Validate Data
   - Check mandatory fields (marked with *)
   - Verify dropdown values
   - Check foreign keys in Reference Data sheet
   ↓
4. Upload File
   ↓
5. Review Results
   - Success: All rows uploaded
   - Partial: Some rows failed (view error dialog)
   - Failure: No rows uploaded (view error dialog)
   ↓
6. Fix Errors (if any)
   - Read error messages
   - Correct issues in Excel
   - Re-upload
```

## Best Practices

### ✅ Do's:
1. **Download the latest template** - Always use the template from the application
2. **Don't modify headers** - Use exact column names as provided
3. **Copy from Reference Data** - Use exact codes from Sheet 2
4. **Test with 1-2 rows first** - Validate your format before bulk upload
5. **Check for hidden characters** - Ensure no extra spaces in codes
6. **Use the sample row** - Follow the format of the sample data provided

### ❌ Don'ts:
1. **Don't add extra columns** - Stick to the template structure
2. **Don't use custom values** - For dropdowns, only use listed values
3. **Don't merge cells** - Keep each cell separate
4. **Don't use formulas** - Enter plain text/numbers only
5. **Don't modify Sheet 2** - Reference Data sheet is for reference only
6. **Don't copy-paste with formatting** - Use "Paste Values" only

## Troubleshooting Guide

### Issue: Column not recognized
**Solution:**
- Copy the EXACT column name from this document
- Ensure no extra spaces before or after the name
- Check for hidden characters (copy-paste issues)

### Issue: Boolean fields not working
**Solution:**
- Use exactly: `TRUE` or `FALSE` (case doesn't matter)
- Don't use: Yes/No, 1/0, T/F, Y/N

### Issue: Foreign key not found
**Solution:**
- Go to Sheet 2 (Reference Data)
- Find the valid codes for that field
- Use the EXACT code (case-sensitive)
- Ensure the code exists in the database

### Issue: All rows failing
**Solution:**
- Verify you're using the latest template
- Check if column headers match this document
- Ensure mandatory fields are filled
- Try uploading just 1 sample row first

## Field Mapping Priority

The upload handler checks column names in this order:

1. **Template format** (e.g., `Evaluation Type*`)
2. **Without asterisk** (e.g., `Evaluation Type`)
3. **Old format with hints** (e.g., `Evaluation Type* (CA/ESE/CA + ESE)`)
4. **Database field name** (e.g., `evaluation_type`)

This ensures backward compatibility with old templates while prioritizing the new format.

## Version History

### Version 1.0 (2025-01-11)
- Initial field mapping documentation
- Template column names standardized
- Field mapping priority established
- Backward compatibility maintained

---

**For technical details**, see [COURSE_TEMPLATE_DOCUMENTATION.md](COURSE_TEMPLATE_DOCUMENTATION.md)

**For quick reference**, see [COURSE_TEMPLATE_QUICK_REFERENCE.md](COURSE_TEMPLATE_QUICK_REFERENCE.md)
