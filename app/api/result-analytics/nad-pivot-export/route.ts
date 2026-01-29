import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

/**
 * NAD ABC Pivot CSV Export API
 *
 * Generates CSV in PIVOT format: One row per student with subjects as columns (SUB1, SUB2, etc.)
 * This is the format required for NAD portal bulk upload.
 *
 * GET /api/result-analytics/nad-pivot-export
 *
 * Query Parameters:
 * - institution_id: Filter by institution (optional)
 * - examination_session_id: Filter by exam session (optional)
 * - program_id: Filter by program (optional)
 * - semester: Filter by semester number (optional)
 * - max_subjects: Maximum number of subject columns (default: 20)
 */

// Fixed columns for each subject (25 fields per subject - exact NAD format)
const SUBJECT_FIELD_SUFFIXES = [
	'NM',           // 1. Subject Name
	'',             // 2. Subject Code (SUBn itself)
	'MAX',          // 3. Max Marks
	'MIN',          // 4. Min Marks (pass marks)
	'_TH_MAX',      // 5. Theory Max
	'_VV_MRKS',     // 6. Viva Voce Marks
	'_PR_CE_MRKS',  // 7. Practical CE Marks
	'_TH_MIN',      // 8. Theory Min
	'_PR_MAX',      // 9. Practical Max
	'_PR_MIN',      // 10. Practical Min
	'_CE_MAX',      // 11. CE Max (Internal Max)
	'_CE_MIN',      // 12. CE Min (Internal Min)
	'_TH_MRKS',     // 13. Theory Marks
	'_PR_MRKS',     // 14. Practical Marks
	'_CE_MRKS',     // 15. CE Marks (Internal Marks)
	'_TOT',         // 16. Total Marks
	'_GRADE',       // 17. Grade
	'_GRADE_POINTS',// 18. Grade Points
	'_CREDIT',      // 19. Credit
	'_CREDIT_POINTS',// 20. Credit Points
	'_REMARKS',     // 21. Remarks
	'_VV_MIN',      // 22. Viva Min
	'_VV_MAX',      // 23. Viva Max
	'_TH_CE_MRKS',  // 24. Theory CE Marks
	'_CREDIT_ELIGIBILITY' // 25. Credit Eligibility (Y/N)
] as const

const SUBJECT_FIELDS_COUNT = SUBJECT_FIELD_SUFFIXES.length // 25

// Generate column names for a subject number
function getSubjectColumns(subNum: number): string[] {
	const prefix = `SUB${subNum}`
	return SUBJECT_FIELD_SUFFIXES.map(suffix => {
		if (suffix === 'NM') return `${prefix}NM`
		if (suffix === '') return prefix
		return `${prefix}${suffix}`
	})
}

// Fixed header columns (before subjects)
const FIXED_COLUMNS = [
	'ORG_NAME',
	'ACADEMIC_COURSE_ID',
	'COURSE_NAME',
	'STREAM',
	'SESSION',
	'REGN_NO',
	'RROLL',
	'CNAME',
	'GENDER',
	'DOB',
	'FNAME',
	'MNAME',
	'PHOTO',
	'MRKS_REC_STATUS',
	'RESULT',
	'YEAR',
	'CSV_MONTH',
	'MONTH',
	'PERCENT',
	'DOI',
	'CERT_NO',
	'SEM',
	'EXAM_TYPE',
	'TOT_CREDIT',
	'TOT_CREDIT_POINTS',
	'CGPA',
	'ABC_ACCOUNT_ID',
	'TERM_TYPE',
	'TOT_GRADE',
	'DEPARTMENT'
] as const

interface SubjectData {
	course_code: string
	course_name: string
	total_max_mark: number
	total_min_mark: number
	theory_max_mark: number | null
	theory_min_mark: number | null
	practical_max_mark: number | null
	practical_min_mark: number | null
	internal_max_mark: number | null
	internal_min_mark: number | null
	theory_marks_obtained: number | null
	practical_marks_obtained: number | null
	internal_marks_obtained: number | null
	total_marks_obtained: number
	letter_grade: string | null
	grade_points: number | null
	credit: number
	credit_points: number | null
	pass_status: string
	is_regular: boolean
	subject_order: number
}

interface StudentData {
	student_id: string
	register_number: string
	roll_number: string
	student_name: string
	father_name: string
	mother_name: string
	date_of_birth: string
	gender: string
	aadhar_number: string
	program_code: string
	program_name: string
	department_name: string
	institution_name: string
	academic_year: string
	exam_session: string
	semester: number
	sgpa: number
	cgpa: number
	total_credits: number
	total_credit_points: number
	overall_grade: string
	overall_result: string
	percentage: number
	result_date: string
	subjects: SubjectData[]
}

export async function GET(req: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(req.url)

		// Parse filter parameters
		const institutionId = searchParams.get('institution_id') || undefined
		const examinationSessionId = searchParams.get('examination_session_id') || undefined
		const programId = searchParams.get('program_id') || undefined
		const semester = searchParams.get('semester') ? parseInt(searchParams.get('semester')!) : undefined
		const maxSubjects = searchParams.get('max_subjects') ? parseInt(searchParams.get('max_subjects')!) : 20

		console.log('NAD Pivot CSV Export - Fetching with filters:', {
			institutionId,
			examinationSessionId,
			programId,
			semester,
			maxSubjects
		})

		// Build query to get per-subject data
		let query = supabase
			.from('nad_abc_upload_view')
			.select('*')

		if (institutionId) {
			query = query.eq('institution_id', institutionId)
		}
		if (examinationSessionId) {
			query = query.eq('examination_session_id', examinationSessionId)
		}
		if (programId) {
			query = query.eq('program_id', programId)
		}
		if (semester) {
			query = query.eq('semester_number', semester)
		}

		// Order by student then subject
		query = query.order('STUDENT_NAME', { ascending: true })
			.order('subject_order', { ascending: true })

		const { data: viewData, error: viewError } = await query

		if (viewError) {
			console.error('Error fetching from nad_abc_upload_view:', viewError)
			if (viewError.code === '42P01') {
				return NextResponse.json({
					error: 'NAD view not found. Please run the SQL migration.',
					details: 'Execute: supabase/sql/nad_abc_upload_view.sql'
				}, { status: 404 })
			}
			throw viewError
		}

		if (!viewData || viewData.length === 0) {
			return NextResponse.json({
				success: true,
				message: 'No published results found for the selected filters',
				csv: '',
				row_count: 0
			})
		}

		// Group by student (pivot the data)
		const studentMap = new Map<string, StudentData>()

		for (const row of viewData) {
			const studentKey = `${row.student_id}-${row.examination_session_id}`

			if (!studentMap.has(studentKey)) {
				// Initialize student record
				studentMap.set(studentKey, {
					student_id: row.student_id,
					register_number: row.ENROLLMENT_NUMBER || '',
					roll_number: row.ROLL_NUMBER || '',
					student_name: row.STUDENT_NAME || '',
					father_name: row.FATHER_NAME || '',
					mother_name: row.MOTHER_NAME || '',
					date_of_birth: row.DATE_OF_BIRTH || '',
					gender: row.GENDER || '',
					aadhar_number: row.ABC_ID || '',
					program_code: row.PROGRAM_CODE || '',
					program_name: row.PROGRAM_NAME || '',
					department_name: row.PROGRAM_NAME || '', // Use program name as department
					institution_name: row.INSTITUTION_NAME || '',
					academic_year: row.ACADEMIC_YEAR || '',
					exam_session: row.EXAM_SESSION || '',
					semester: row.semester_number || 1,
					sgpa: parseFloat(row.SGPA) || 0,
					cgpa: parseFloat(row.CGPA) || 0,
					total_credits: 0,
					total_credit_points: 0,
					overall_grade: '',
					overall_result: 'PASS',
					percentage: 0,
					result_date: row.RESULT_DATE || '',
					subjects: []
				})
			}

			const student = studentMap.get(studentKey)!

			// Add subject to student
			const subjectData: SubjectData = {
				course_code: row.SUBJECT_CODE || '',
				course_name: row.SUBJECT_NAME || '',
				total_max_mark: parseInt(row.MAX_MARKS) || 100,
				total_min_mark: Math.round((parseInt(row.MAX_MARKS) || 100) * 0.4), // 40% pass mark
				theory_max_mark: null, // Will be calculated if available
				theory_min_mark: null,
				practical_max_mark: null,
				practical_min_mark: null,
				internal_max_mark: null,
				internal_min_mark: null,
				theory_marks_obtained: null,
				practical_marks_obtained: null,
				internal_marks_obtained: null,
				total_marks_obtained: parseInt(row.MARKS_OBTAINED) || 0,
				letter_grade: row.letter_grade || '',
				grade_points: row.grade_points || 0,
				credit: row.credit || 0,
				credit_points: (row.grade_points || 0) * (row.credit || 0),
				pass_status: row.RESULT_STATUS || 'PASS',
				is_regular: row.is_regular_subject !== false,
				subject_order: row.subject_order || 0
			}

			student.subjects.push(subjectData)

			// Update totals
			student.total_credits += subjectData.credit
			student.total_credit_points += subjectData.credit_points || 0

			// Update overall result
			if (subjectData.pass_status === 'FAIL') {
				student.overall_result = 'FAIL'
			}
		}

		// Calculate percentage and grade for each student
		for (const student of Array.from(studentMap.values())) {
			// Calculate percentage
			const totalMax = student.subjects.reduce((sum, s) => sum + s.total_max_mark, 0)
			const totalObtained = student.subjects.reduce((sum, s) => sum + s.total_marks_obtained, 0)
			student.percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100 * 100) / 100 : 0

			// Determine overall grade based on CGPA
			if (student.cgpa >= 9) student.overall_grade = 'O'
			else if (student.cgpa >= 8) student.overall_grade = 'A+'
			else if (student.cgpa >= 7) student.overall_grade = 'A'
			else if (student.cgpa >= 6) student.overall_grade = 'B+'
			else if (student.cgpa >= 5.5) student.overall_grade = 'B'
			else if (student.cgpa >= 5) student.overall_grade = 'C'
			else student.overall_grade = 'F'
		}

		// Find max subjects needed
		let actualMaxSubjects = 0
		for (const student of Array.from(studentMap.values())) {
			actualMaxSubjects = Math.max(actualMaxSubjects, student.subjects.length)
		}
		actualMaxSubjects = Math.min(actualMaxSubjects, maxSubjects)

		// Generate header row
		const headerRow: string[] = [...FIXED_COLUMNS]
		for (let i = 1; i <= actualMaxSubjects; i++) {
			headerRow.push(...getSubjectColumns(i))
		}

		// Generate data rows
		const csvRows: string[][] = [headerRow]

		for (const student of Array.from(studentMap.values())) {
			const row: string[] = []

			// Fixed columns
			row.push(student.institution_name)                    // ORG_NAME
			row.push(student.program_code)                        // ACADEMIC_COURSE_ID
			row.push(student.program_name)                        // COURSE_NAME
			row.push('')                                          // STREAM
			row.push(student.exam_session)                        // SESSION
			row.push(student.register_number)                     // REGN_NO
			row.push(student.roll_number)                         // RROLL
			row.push(student.student_name)                        // CNAME
			row.push(student.gender)                              // GENDER
			row.push(student.date_of_birth)                       // DOB
			row.push(student.father_name)                         // FNAME
			row.push(student.mother_name)                         // MNAME
			row.push('')                                          // PHOTO
			row.push('C')                                         // MRKS_REC_STATUS (C=Complete)
			row.push(student.overall_result)                      // RESULT
			row.push(student.academic_year.split('-')[0] || '')   // YEAR
			row.push('')                                          // CSV_MONTH
			row.push(student.exam_session.split(' ')[0] || '')    // MONTH
			row.push(student.percentage.toString())               // PERCENT
			row.push(student.result_date)                         // DOI (Date of Issue)
			row.push('')                                          // CERT_NO
			row.push(student.semester.toString())                 // SEM
			row.push('REGULAR')                                   // EXAM_TYPE
			row.push(student.total_credits.toString())            // TOT_CREDIT
			row.push(student.total_credit_points.toString())      // TOT_CREDIT_POINTS
			row.push(student.cgpa.toFixed(2))                     // CGPA
			row.push(student.aadhar_number)                       // ABC_ACCOUNT_ID
			row.push('SEMESTER')                                  // TERM_TYPE
			row.push(student.overall_grade)                       // TOT_GRADE
			row.push(student.department_name)                     // DEPARTMENT

			// Subject columns
			for (let i = 0; i < actualMaxSubjects; i++) {
				const subject = student.subjects[i]

				if (subject) {
					// SUBnNM - Subject Name
					row.push(subject.course_name)
					// SUBn - Subject Code
					row.push(subject.course_code)
					// SUBnMAX - Max Marks
					row.push(subject.total_max_mark.toString())
					// SUBnMIN - Min Marks
					row.push(subject.total_min_mark.toString())
					// SUBn_TH_MAX - Theory Max
					row.push(subject.theory_max_mark?.toString() || '')
					// SUBn_VV_MRKS - Viva Marks
					row.push('')
					// SUBn_PR_CE_MRKS - Practical CE Marks
					row.push('')
					// SUBn_TH_MIN - Theory Min
					row.push(subject.theory_min_mark?.toString() || '')
					// SUBn_PR_MAX - Practical Max
					row.push(subject.practical_max_mark?.toString() || '')
					// SUBn_PR_MIN - Practical Min
					row.push(subject.practical_min_mark?.toString() || '')
					// SUBn_CE_MAX - CE Max
					row.push(subject.internal_max_mark?.toString() || '')
					// SUBn_CE_MIN - CE Min
					row.push(subject.internal_min_mark?.toString() || '')
					// SUBn_TH_MRKS - Theory Marks
					row.push(subject.theory_marks_obtained?.toString() || '')
					// SUBn_PR_MRKS - Practical Marks
					row.push(subject.practical_marks_obtained?.toString() || '')
					// SUBn_CE_MRKS - CE Marks
					row.push(subject.internal_marks_obtained?.toString() || '')
					// SUBn_TOT - Total Marks
					row.push(subject.total_marks_obtained.toString())
					// SUBn_GRADE - Grade
					row.push(subject.letter_grade || '')
					// SUBn_GRADE_POINTS - Grade Points
					row.push(subject.grade_points?.toString() || '')
					// SUBn_CREDIT - Credit
					row.push(subject.credit.toString())
					// SUBn_CREDIT_POINTS - Credit Points
					row.push(subject.credit_points?.toString() || '')
					// SUBn_REMARKS - Remarks
					row.push(subject.pass_status === 'PASS' ? '' : 'NEEDS IMPROVEMENT')
					// SUBn_VV_MIN - Viva Min
					row.push('')
					// SUBn_VV_MAX - Viva Max
					row.push('')
					// SUBn_TH_CE_MRKS - Theory CE Marks
					row.push('')
					// SUBn_CREDIT_ELIGIBILITY - Credit Eligibility
					row.push(subject.pass_status === 'PASS' ? 'Y' : 'N')
				} else {
					// Empty subject columns
					row.push(...Array(SUBJECT_FIELDS_COUNT).fill(''))
				}
			}

			csvRows.push(row)
		}

		// Convert to CSV string with proper escaping
		const csvContent = csvRows.map(row =>
			row.map(field => {
				const strField = String(field || '')
				if (strField.includes(',') || strField.includes('"') || strField.includes('\n')) {
					return `"${strField.replace(/"/g, '""')}"`
				}
				return strField
			}).join(',')
		).join('\n')

		// Generate filename
		const filterParts: string[] = ['nad_pivot_export']
		if (programId) filterParts.push('program')
		if (semester) filterParts.push(`sem${semester}`)
		filterParts.push(new Date().toISOString().split('T')[0])
		const filename = `${filterParts.join('_')}.csv`

		// Return CSV with download headers
		return new NextResponse(csvContent, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-cache'
			}
		})

	} catch (error) {
		console.error('Error generating NAD Pivot CSV export:', error)
		return NextResponse.json({
			error: 'Failed to generate NAD Pivot CSV export',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 })
	}
}

/**
 * POST endpoint for getting preview data (not CSV download)
 */
export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const {
			institution_id,
			examination_session_id,
			program_id,
			semester,
			preview_only = false
		} = body

		if (!preview_only) {
			// Build URL with query parameters and call GET
			const url = new URL(req.url)
			if (institution_id) url.searchParams.set('institution_id', institution_id)
			if (examination_session_id) url.searchParams.set('examination_session_id', examination_session_id)
			if (program_id) url.searchParams.set('program_id', program_id)
			if (semester) url.searchParams.set('semester', String(semester))

			const newReq = new NextRequest(url, { method: 'GET' })
			return GET(newReq)
		}

		// Preview mode - return JSON summary
		const supabase = getSupabaseServer()

		let query = supabase
			.from('nad_abc_upload_view')
			.select('student_id, STUDENT_NAME, PROGRAM_CODE, semester_number', { count: 'exact' })

		if (institution_id) query = query.eq('institution_id', institution_id)
		if (examination_session_id) query = query.eq('examination_session_id', examination_session_id)
		if (program_id) query = query.eq('program_id', program_id)
		if (semester) query = query.eq('semester_number', semester)

		const { data, count, error } = await query

		if (error) throw error

		// Count unique students
		const uniqueStudents = new Set(data?.map(r => r.student_id) || [])
		const subjectCounts = new Map<string, number>()
		for (const row of data || []) {
			const key = row.student_id
			subjectCounts.set(key, (subjectCounts.get(key) || 0) + 1)
		}

		const maxSubjects = Math.max(...Array.from(subjectCounts.values()), 0)
		const totalColumns = FIXED_COLUMNS.length + (maxSubjects * 25)

		return NextResponse.json({
			success: true,
			preview: {
				total_students: uniqueStudents.size,
				total_subject_records: count || 0,
				max_subjects_per_student: maxSubjects,
				total_columns: totalColumns,
				fixed_columns: FIXED_COLUMNS.length,
				subject_columns_per_subject: 25
			}
		})

	} catch (error) {
		console.error('Error in NAD Pivot preview:', error)
		return NextResponse.json({
			error: 'Failed to generate preview',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 })
	}
}
