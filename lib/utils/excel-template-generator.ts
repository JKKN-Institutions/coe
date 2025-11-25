import * as XLSX from 'xlsx'

export interface CourseReferenceData {
	institutions: Array<{ institution_code: string }>
	departments: Array<{ department_code: string; department_name: string }>
	regulations: Array<{ regulation_code: string }>
}

/**
 * Generates a Course Master Excel template with:
 * - Sheet 1: Course Master (with headers and sample data)
 * - Sheet 2: Reference Data (lookup values for dropdowns)
 */
export function generateCourseTemplate(referenceData: CourseReferenceData): XLSX.WorkBook {
	const workbook = XLSX.utils.book_new()

	// ==================== SHEET 1: Course Master ====================
	const courseMasterHeaders = [
		'Institution Code*',
		'Regulation Code*',
		'Offering Department Code*',
		'Course Code*',
		'Course Name*',
		'Display Code*',
		'Course Category*',
		'Course Type',
		'Course Part Master',
		'Credit',
		'Split Credit',
		'Theory Credit',
		'Practical Credit',
		'QP Code*',
		'E Code Name',
		'Exam Duration Hours',
		'Evaluation Type*',
		'Result Type*',
		'Self Study Course',
		'Outside Class Course',
		'Open Book',
		'Online Course',
		'Dummy Number Not Required',
		'Annual Course',
		'Multiple QP Set',
		'No of QP Setter',
		'No of Scrutinizer',
		'Fee Exception',
		'Syllabus PDF URL',
		'Description',
		'Class Hours*',
		'Theory Hours*',
		'Practical Hours*',
		'Internal Max Mark*',
		'Internal Pass Mark*',
		'Internal Converted Mark*',
		'External Max Mark*',
		'External Pass Mark*',
		'External Converted Mark*',
		'Total Pass Mark*',
		'Total Max Mark*',
		'Annual Semester*',
		'Registration Based*',
		'Status'
	]

	// Sample data row (using valid constraint values)
	const sampleRow = [
		'JKKN',                          // Institution Code*
		'R2021',                         // Regulation Code*
		'CSE',                           // Offering Department Code*
		'CS101',                         // Course Code*
		'Programming in C',              // Course Name*
		'PGC101',                        // Display Code*
		'Theory',                        // Course Category* (must be from CHECK constraint)
		'Core',                          // Course Type (must be from CHECK constraint)
		'Part I',                        // Course Part Master (must be from CHECK constraint)
		3.00,                            // Credit
		'FALSE',                         // Split Credit
		3.00,                            // Theory Credit
		0.00,                            // Practical Credit
		'QP-2025-CS101',                 // QP Code*
		'English',                       // E Code Name (must be from CHECK constraint)
		3,                              // Exam Duration Hours
		'CIA + ESE',                     // Evaluation Type* (must be: CIA, ESE, or CIA + ESE)
		'Mark',                          // Result Type* (must be: Mark or Status)
		'FALSE',                         // Self Study Course
		'FALSE',                         // Outside Class Course
		'FALSE',                         // Open Book
		'FALSE',                         // Online Course
		'TRUE',                          // Dummy Number Not Required
		'FALSE',                         // Annual Course
		'FALSE',                         // Multiple QP Set
		2,                               // No of QP Setter
		1,                               // No of Scrutinizer
		'FALSE',                         // Fee Exception
		'https://example.com/syllabus.pdf', // Syllabus PDF URL
		'Introductory C course for UG students', // Description
		45,                              // Class Hours*
		30,                              // Theory Hours*
		15,                              // Practical Hours*
		40,                              // Internal Max Mark*
		16,                              // Internal Pass Mark*
		25,                              // Internal Converted Mark*
		60,                              // External Max Mark*
		24,                              // External Pass Mark*
		75,                              // External Converted Mark*
		40,                              // Total Pass Mark*
		100,                             // Total Max Mark*
		'FALSE',                         // Annual Semester*
		'FALSE',                         // Registration Based*
		'TRUE'                           // Status
	]

	// Create worksheet with headers and sample row
	const courseMasterData = [courseMasterHeaders, sampleRow]
	const courseMasterSheet = XLSX.utils.aoa_to_sheet(courseMasterData)

	// Set column widths for better readability
	courseMasterSheet['!cols'] = [
		{ wch: 18 },  // Institution Code*
		{ wch: 18 },  // Regulation Code*
		{ wch: 25 },  // Offering Department Code*
		{ wch: 15 },  // Course Code*
		{ wch: 30 },  // Course Name*
		{ wch: 15 },  // Display Code*
		{ wch: 18 },  // Course Category*
		{ wch: 15 },  // Course Type
		{ wch: 20 },  // Course Part Master
		{ wch: 10 },  // Credit
		{ wch: 15 },  // Split Credit
		{ wch: 15 },  // Theory Credit
		{ wch: 17 },  // Practical Credit
		{ wch: 18 },  // QP Code*
		{ wch: 15 },  // E Code Name
		{ wch: 15 },  // Exam Duration Hours
		{ wch: 17 },  // Evaluation Type*
		{ wch: 15 },  // Result Type*
		{ wch: 18 },  // Self Study Course
		{ wch: 20 },  // Outside Class Course
		{ wch: 12 },  // Open Book
		{ wch: 15 },  // Online Course
		{ wch: 25 },  // Dummy Number Not Required
		{ wch: 15 },  // Annual Course
		{ wch: 17 },  // Multiple QP Set
		{ wch: 17 },  // No of QP Setter
		{ wch: 18 },  // No of Scrutinizer
		{ wch: 15 },  // Fee Exception
		{ wch: 30 },  // Syllabus PDF URL
		{ wch: 40 },  // Description
		{ wch: 15 },  // Class Hours*
		{ wch: 15 },  // Theory Hours*
		{ wch: 17 },  // Practical Hours*
		{ wch: 20 },  // Internal Max Mark*
		{ wch: 20 },  // Internal Pass Mark*
		{ wch: 25 },  // Internal Converted Mark*
		{ wch: 20 },  // External Max Mark*
		{ wch: 20 },  // External Pass Mark*
		{ wch: 25 },  // External Converted Mark*
		{ wch: 18 },  // Total Pass Mark*
		{ wch: 18 },  // Total Max Mark*
		{ wch: 18 },  // Annual Semester*
		{ wch: 20 },  // Registration Based*
		{ wch: 10 },  // Status
	]

	XLSX.utils.book_append_sheet(workbook, courseMasterSheet, 'Course Master')

	// ==================== SHEET 2: Reference Data ====================
	// Build reference data in a clean, structured format similar to the example
	const referenceRows: any[] = []

	// Helper function to add section header
	const addSection = (title: string) => {
		referenceRows.push(['', '', ''])
		referenceRows.push([title, '', ''])
	}

	// Helper function to add table headers
	const addTableHeaders = (col1: string, col2: string, col3: string) => {
		referenceRows.push([col1, col2, col3])
	}

	// INSTITUTION CODES Section
	addSection('INSTITUTION CODES')
	addTableHeaders('Category', 'Code/Value', 'Name/Description')
	addTableHeaders('Institution Code', 'Institution Name', '')
	referenceData.institutions.forEach(inst => {
		referenceRows.push(['', inst.institution_code, `Example Institution: ${inst.institution_code}`])
	})
	if (referenceData.institutions.length === 0) {
		referenceRows.push(['', 'JKKN', 'Example Institution: JKKN'])
	}

	// REGULATION CODES Section
	addSection('REGULATION CODES')
	addTableHeaders('Category', 'Code/Value', 'Name/Description')
	addTableHeaders('Regulation Code', 'Regulation Name', '')
	referenceData.regulations.forEach(reg => {
		referenceRows.push(['', reg.regulation_code, `Regulation: ${reg.regulation_code}`])
	})
	if (referenceData.regulations.length === 0) {
		referenceRows.push(['', 'R2020', 'Regulation: R2020'])
		referenceRows.push(['', 'R2021', 'Regulation: R2021'])
		referenceRows.push(['', 'R2022', 'Regulation: R2022'])
	}

	// DEPARTMENT CODES Section
	addSection('DEPARTMENT CODES')
	addTableHeaders('Category', 'Code/Value', 'Name/Description')
	addTableHeaders('Department Code', 'Department Name', '')
	referenceData.departments.forEach(dept => {
		referenceRows.push(['', dept.department_code, dept.department_name || `Department: ${dept.department_code}`])
	})
	if (referenceData.departments.length === 0) {
		referenceRows.push(['', 'CSE', 'Computer Science and Engineering'])
		referenceRows.push(['', 'ECE', 'Electronics and Communication Engineering'])
	}

	// COURSE CATEGORY Section
	addSection('COURSE CATEGORY')
	addTableHeaders('Category', 'Code/Value', 'Name/Description')
	addTableHeaders('Value', 'Description', '')
	;[
		['Theory', 'Theory-based course'],
		['Practical', 'Practical/Lab-based course'],
		['Project', 'Project-based course'],
		['Theory + Practical', 'Combined theory and practical'],
		['Theory + Project', 'Combined theory and project'],
		['Field Work', 'Field work or internship'],
		['Community Service', 'Community service activity'],
		['Group Project', 'Group project work'],
		['Non Academic', 'Non-academic activity']
	].forEach(([value, desc]) => {
		referenceRows.push(['', value, desc])
	})

	// COURSE TYPE Section
	addSection('COURSE TYPE')
	addTableHeaders('Category', 'Code/Value', 'Name/Description')
	addTableHeaders('Value', 'Description', '')
	;[
		['Core', 'Core/Compulsory course'],
		['Generic Elective', 'Generic elective course'],
		['Skill Enhancement', 'Skill enhancement course'],
		['Ability Enhancement', 'Ability enhancement course'],
		['Language', 'Language course'],
		['English', 'English language course'],
		['Advance learner course', 'Advanced learner course'],
		['Additional Credit course', 'Additional credit course'],
		['Discipline Specific elective', 'Discipline specific elective'],
		['Audit Course', 'Audit course (no grade)'],
		['Bridge course', 'Bridge/Remedial course'],
		['Non Academic', 'Non-academic activity'],
		['Naanmuthalvan', 'Naanmuthalvan program'],
		['Elective', 'General elective course']
	].forEach(([value, desc]) => {
		referenceRows.push(['', value, desc])
	})

	// COURSE PART MASTER Section
	addSection('COURSE PART MASTER')
	addTableHeaders('Category', 'Code/Value', 'Name/Description')
	addTableHeaders('Value', 'Description', '')
	;[
		['Part I', 'First part of the course'],
		['Part II', 'Second part of the course'],
		['Part III', 'Third part of the course'],
		['Part IV', 'Fourth part of the course'],
		['Part V', 'Fifth part of the course']
	].forEach(([value, desc]) => {
		referenceRows.push(['', value, desc])
	})

	// EVALUATION TYPE Section
	addSection('EVALUATION TYPE')
	addTableHeaders('Category', 'Code/Value', 'Name/Description')
	addTableHeaders('Value', 'Description', '')
	;[
		['CA', 'Continuous Assessment only'],
		['ESE', 'End Semester Examination only'],
		['CA + ESE', 'Combined CA and ESE']
	].forEach(([value, desc]) => {
		referenceRows.push(['', value, desc])
	})

	// RESULT TYPE Section
	addSection('RESULT TYPE')
	addTableHeaders('Category', 'Code/Value', 'Name/Description')
	addTableHeaders('Value', 'Description', '')
	;[
		['Mark', 'Numeric marks'],
		['Status', 'Pass/Fail status only']
	].forEach(([value, desc]) => {
		referenceRows.push(['', value, desc])
	})

	// E CODE NAME Section
	addSection('E CODE NAME')
	addTableHeaders('Category', 'Code/Value', 'Name/Description')
	addTableHeaders('Value', 'Description', '')
	;[
		['None', 'No language code'],
		['Tamil', 'Tamil language'],
		['English', 'English language'],
		['French', 'French language'],
		['Malayalam', 'Malayalam language'],
		['Hindi', 'Hindi language'],
		['Computer Science', 'Computer Science elective'],
		['Mathematics', 'Mathematics elective']
	].forEach(([value, desc]) => {
		referenceRows.push(['', value, desc])
	})

	// BOOLEAN FIELDS Section
	addSection('BOOLEAN FIELDS')
	addTableHeaders('Category', 'Code/Value', 'Name/Description')
	addTableHeaders('Value', 'Description', '')
	;[
		['TRUE', 'Yes/Active/Enabled (case-insensitive)'],
		['FALSE', 'No/Inactive/Disabled (case-insensitive)']
	].forEach(([value, desc]) => {
		referenceRows.push(['', value, desc])
	})

	// NOTES Section
	addSection('IMPORTANT NOTES')
	referenceRows.push(['', '• Fields marked with * are MANDATORY', ''])
	referenceRows.push(['', '• Use EXACT values from the lists above (case-sensitive)', ''])
	referenceRows.push(['', '• Institution, Regulation, and Department codes MUST exist in database', ''])
	referenceRows.push(['', '• Boolean fields: Use TRUE or FALSE only (case-insensitive)', ''])
	referenceRows.push(['', '• Course Code: Only letters, numbers, hyphens (-), and underscores (_)', ''])
	referenceRows.push(['', '• Credits: Numbers between 0 and 99', ''])
	referenceRows.push(['', '• If Split Credit = TRUE, both Theory and Practical credits required', ''])
	referenceRows.push(['', '• URLs: Must start with http:// or https://', ''])

	const referenceSheet = XLSX.utils.aoa_to_sheet(referenceRows)

	// Set column widths for Reference Data sheet
	referenceSheet['!cols'] = [
		{ wch: 25 },  // Category
		{ wch: 35 },  // Code/Value
		{ wch: 50 },  // Name/Description
	]

	XLSX.utils.book_append_sheet(workbook, referenceSheet, 'Reference Data')

	return workbook
}

/**
 * Converts workbook to buffer for downloading
 */
export function workbookToBuffer(workbook: XLSX.WorkBook): ArrayBuffer {
	return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
}
