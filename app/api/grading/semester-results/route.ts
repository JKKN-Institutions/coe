import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import type { ProgramType, CourseResult, PartSummary, SemesterPartBreakdown } from '@/types/semester-results'

// =====================================================
// GRADE CONVERSION TABLES (FROM IMAGE)
// =====================================================

/**
 * UG Grade Conversion Table
 * Part I & II languages, Part-III Major/Elective, Part-IV: Skill Enhancement Courses/Foundation Courses/Non-Major
 * Elective/Value Education and Part-V: Extension activity
 *
 * IMPORTANT: These values MUST match the grade_system table in the database
 * The database trigger uses grade_system table for actual grade assignment
 */
const UG_GRADE_TABLE = [
	{ min: 90, max: 100, gradePoint: 9.0, letterGrade: 'O', description: 'Outstanding' },
	{ min: 80, max: 89, gradePoint: 8.0, letterGrade: 'D+', description: 'Excellent' },
	{ min: 75, max: 79, gradePoint: 7.5, letterGrade: 'D', description: 'Distinction' },
	{ min: 70, max: 74, gradePoint: 7.0, letterGrade: 'A+', description: 'Very Good' },
	{ min: 60, max: 69, gradePoint: 6.0, letterGrade: 'A', description: 'Good' },
	{ min: 50, max: 59, gradePoint: 5.0, letterGrade: 'B', description: 'Average' },
	{ min: 40, max: 49, gradePoint: 4.0, letterGrade: 'C', description: 'Satisfactory' },
	{ min: 0, max: 39, gradePoint: 0.0, letterGrade: 'U', description: 'Re-Appear' },
	{ min: -1, max: -1, gradePoint: 0.0, letterGrade: 'AAA', description: 'ABSENT' }
]

/**
 * PG Grade Conversion Table
 * Part A: Core, Elective, Extra Disciplinary Course/Project, Part B: Soft Skills and Internship
 *
 * IMPORTANT: These values MUST match the grade_system table in the database
 * The database trigger uses grade_system table for actual grade assignment
 */
const PG_GRADE_TABLE = [
	{ min: 90, max: 100, gradePoint: 9.0, letterGrade: 'O', description: 'Outstanding' },
	{ min: 80, max: 89, gradePoint: 8.0, letterGrade: 'D+', description: 'Excellent' },
	{ min: 75, max: 79, gradePoint: 7.5, letterGrade: 'D', description: 'Distinction' },
	{ min: 70, max: 74, gradePoint: 7.0, letterGrade: 'A+', description: 'Very Good' },
	{ min: 60, max: 69, gradePoint: 6.0, letterGrade: 'A', description: 'Good' },
	{ min: 50, max: 59, gradePoint: 5.0, letterGrade: 'B', description: 'Average' },
	{ min: 0, max: 49, gradePoint: 0.0, letterGrade: 'U', description: 'Re-Appear' },
	{ min: -1, max: -1, gradePoint: 0.0, letterGrade: 'AAA', description: 'ABSENT' }
]

/**
 * FALLBACK Passing Minimum Requirements
 * These are ONLY used when course-specific pass marks are not available.
 * In production, always use course-specific pass marks from the courses table.
 *
 * UG: CIA - No Passing Minimum, CE - 40%, Total - 40%
 * PG: CIA - No Passing Minimum, CE - 50%, Total - 50%
 */
const FALLBACK_PASSING_REQUIREMENTS = {
	UG: { cia: 0, ce: 40, total: 40 },
	PG: { cia: 0, ce: 50, total: 50 }
}

/**
 * Course-specific pass marks interface
 * Pass marks are fetched from the courses table for each course
 */
interface CoursePassMarks {
	internal_pass_mark: number
	external_pass_mark: number
	total_pass_mark: number
}

/**
 * UG Parts categorization order
 */
const UG_PART_ORDER = ['Part I', 'Part II', 'Part III', 'Part IV', 'Part V']

/**
 * PG Parts categorization order
 */
const PG_PART_ORDER = ['Part A', 'Part B']

// =====================================================
// SEMESTER CODE PARSING
// =====================================================

/**
 * Parse semester code to extract semester number
 * e.g., "UPH-1" -> 1, "UPH-2" -> 2, "MBA-3" -> 3
 * Removes any prefix before hyphen and extracts the number
 */
function parseSemesterCode(semesterCode: string): number {
	if (!semesterCode) return 0

	// Try to extract number after hyphen (e.g., "UPH-1" -> "1")
	const hyphenMatch = semesterCode.match(/-(\d+)$/)
	if (hyphenMatch) {
		return parseInt(hyphenMatch[1], 10)
	}

	// Try to extract trailing number (e.g., "SEM1" -> "1")
	const trailingMatch = semesterCode.match(/(\d+)$/)
	if (trailingMatch) {
		return parseInt(trailingMatch[1], 10)
	}

	// If no pattern matches, return 0
	return 0
}

/**
 * Get part order index for sorting
 */
function getPartOrder(partName: string, programType: ProgramType): number {
	const parts = programType === 'UG' ? UG_PART_ORDER : PG_PART_ORDER
	const index = parts.findIndex(p => p.toLowerCase() === partName?.toLowerCase())
	return index >= 0 ? index : 999 // Unknown parts go to end
}

/**
 * Group courses by part and calculate part-wise summaries
 */
function groupCoursesByPart(
	courses: CourseResult[],
	programType: ProgramType
): PartSummary[] {
	const partGroups: Record<string, CourseResult[]> = {}

	// Group courses by part
	courses.forEach(course => {
		const part = course.course_part || 'Unknown'
		if (!partGroups[part]) {
			partGroups[part] = []
		}
		partGroups[part].push(course)
	})

	// Calculate summaries for each part
	const partSummaries: PartSummary[] = Object.entries(partGroups).map(([partName, partCourses]) => {
		// Sort courses by course_order within part
		partCourses.sort((a, b) => a.course_order - b.course_order)

		const totalCredits = partCourses.reduce((sum, c) => sum + c.credits, 0)
		const totalCreditPoints = partCourses.reduce((sum, c) => sum + c.credit_points, 0)
		const partGpa = totalCredits > 0 ? Math.round((totalCreditPoints / totalCredits) * 100) / 100 : 0

		return {
			part_name: partName,
			courses: partCourses,
			total_credits: totalCredits,
			total_credit_points: totalCreditPoints,
			part_gpa: partGpa,
			passed_count: partCourses.filter(c => c.is_pass).length,
			failed_count: partCourses.filter(c => !c.is_pass).length
		}
	})

	// Sort parts by defined order
	partSummaries.sort((a, b) => getPartOrder(a.part_name, programType) - getPartOrder(b.part_name, programType))

	return partSummaries
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get grade details from percentage using appropriate table
 */
function getGradeFromPercentage(
	percentage: number,
	programType: 'UG' | 'PG',
	isAbsent: boolean = false
): { gradePoint: number; letterGrade: string; description: string } {
	const gradeTable = programType === 'UG' ? UG_GRADE_TABLE : PG_GRADE_TABLE

	if (isAbsent) {
		return { gradePoint: 0, letterGrade: 'AAA', description: 'ABSENT' }
	}

	for (const grade of gradeTable) {
		if (percentage >= grade.min && percentage <= grade.max) {
			return {
				gradePoint: grade.gradePoint,
				letterGrade: grade.letterGrade,
				description: grade.description
			}
		}
	}

	// Default to U grade if no match found
	return { gradePoint: 0, letterGrade: 'U', description: 'Re-Appear' }
}

/**
 * Alternative: Fetch grade from database grade_system table
 * This ensures preview matches exactly what the database trigger calculates
 */
async function getGradeFromDatabase(
	supabase: any,
	percentage: number,
	gradeSystemCode: 'UG' | 'PG'
): Promise<{ gradePoint: number; letterGrade: string; description: string } | null> {
	const { data, error } = await supabase
		.from('grade_system')
		.select('grade, grade_point, description')
		.eq('grade_system_code', gradeSystemCode)
		.eq('is_active', true)
		.gte('max_mark', percentage)
		.lte('min_mark', percentage)
		.order('min_mark', { ascending: false })
		.limit(1)
		.single()

	if (error || !data) {
		return null
	}

	return {
		gradePoint: data.grade_point,
		letterGrade: data.grade,
		description: data.description
	}
}

/**
 * Check if student passed based on course-specific pass marks
 * Pass marks are fetched from the courses table for each course.
 *
 * @param internalObtained - Internal marks obtained
 * @param externalObtained - External marks obtained
 * @param totalObtained - Total marks obtained
 * @param coursePassMarks - Course-specific pass marks from courses table
 * @param programType - 'UG' or 'PG' (used only as fallback)
 */
function checkPassStatus(
	internalObtained: number,
	externalObtained: number,
	totalObtained: number,
	coursePassMarks?: CoursePassMarks,
	programType: 'UG' | 'PG' = 'UG'
): boolean {
	// Use course-specific pass marks if provided
	const internalPassMark = coursePassMarks?.internal_pass_mark ?? 0
	const externalPassMark = coursePassMarks?.external_pass_mark ?? 0
	const totalPassMark = coursePassMarks?.total_pass_mark ?? 0

	// A component passes if: pass_mark = 0 (no minimum) OR obtained >= pass_mark
	const passesInternal = internalPassMark === 0 || internalObtained >= internalPassMark
	const passesExternal = externalPassMark === 0 || externalObtained >= externalPassMark
	const passesTotal = totalPassMark === 0 || totalObtained >= totalPassMark

	return passesInternal && passesExternal && passesTotal
}

/**
 * Legacy function for backward compatibility - uses percentage-based comparison
 * @deprecated Use checkPassStatus with course-specific pass marks instead
 */
function checkPassStatusByPercentage(
	externalPercentage: number,
	totalPercentage: number,
	programType: 'UG' | 'PG'
): boolean {
	const req = FALLBACK_PASSING_REQUIREMENTS[programType]
	return externalPercentage >= req.ce && totalPercentage >= req.total
}

/**
 * Calculate GPA using dot product formula
 * GPA = Σ(Ci × Gi) / ΣCi
 */
function calculateGPA(credits: number[], gradePoints: number[]): number {
	if (credits.length === 0 || credits.length !== gradePoints.length) return 0

	let dotProduct = 0
	let totalCredits = 0

	for (let i = 0; i < credits.length; i++) {
		dotProduct += credits[i] * gradePoints[i]
		totalCredits += credits[i]
	}

	if (totalCredits === 0) return 0
	return Math.round((dotProduct / totalCredits) * 100) / 100
}

/**
 * Calculate CGPA using weighted average of semester GPAs
 * CGPA = Σ(GPAn × TCn) / ΣTCn
 */
function calculateCGPA(semesterGPAs: number[], semesterCredits: number[]): number {
	if (semesterGPAs.length === 0 || semesterGPAs.length !== semesterCredits.length) return 0

	let weightedSum = 0
	let totalCredits = 0

	for (let i = 0; i < semesterGPAs.length; i++) {
		weightedSum += semesterGPAs[i] * semesterCredits[i]
		totalCredits += semesterCredits[i]
	}

	if (totalCredits === 0) return 0
	return Math.round((weightedSum / totalCredits) * 100) / 100
}

// =====================================================
// API HANDLERS
// =====================================================

export async function GET(req: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(req.url)
		const action = searchParams.get('action')

		// Get stored semester results from semester_results table
		if (action === 'stored-results') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')
			const programId = searchParams.get('programId')
			const semester = searchParams.get('semester')
			const status = searchParams.get('status') // 'Pending', 'Pass', 'Fail', etc.
			const isPublished = searchParams.get('isPublished') // 'true' or 'false'

			let query = supabase
				.from('semester_results_detailed_view')
				.select('*')
				.eq('is_active', true)
				.order('register_number', { ascending: true })
				.order('semester', { ascending: true })

			if (institutionId) {
				query = query.eq('institutions_id', institutionId)
			}
			if (sessionId) {
				query = query.eq('examination_session_id', sessionId)
			}
			if (programId) {
				query = query.eq('program_id', programId)
			}
			if (semester) {
				query = query.eq('semester', parseInt(semester))
			}
			if (status) {
				query = query.eq('result_status', status)
			}
			if (isPublished === 'true') {
				query = query.eq('is_published', true)
			} else if (isPublished === 'false') {
				query = query.eq('is_published', false)
			}

			const { data, error } = await query

			if (error) throw error

			// Calculate summary statistics
			const results = data || []
			const summary = {
				total_students: results.length,
				passed: results.filter(r => r.result_status === 'Pass').length,
				failed: results.filter(r => r.result_status === 'Fail').length,
				pending: results.filter(r => r.result_status === 'Pending').length,
				incomplete: results.filter(r => r.result_status === 'Incomplete').length,
				published: results.filter(r => r.is_published).length,
				unpublished: results.filter(r => !r.is_published).length,
				locked: results.filter(r => r.is_locked).length,
				with_backlogs: results.filter(r => r.total_backlogs > 0).length,
				distinction_count: results.filter(r => r.is_distinction).length,
				first_class_count: results.filter(r => r.is_first_class).length,
				average_sgpa: results.length > 0
					? Math.round(results.reduce((sum, r) => sum + (r.sgpa || 0), 0) / results.length * 100) / 100
					: 0,
				average_cgpa: results.length > 0
					? Math.round(results.reduce((sum, r) => sum + (r.cgpa || 0), 0) / results.length * 100) / 100
					: 0
			}

			return NextResponse.json({
				results,
				summary
			})
		}

		// Check if semester results already exist for the given criteria
		if (action === 'check-exists') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')
			const programId = searchParams.get('programId')
			const semester = searchParams.get('semester')

			if (!institutionId || !sessionId || !programId) {
				return NextResponse.json({ exists: false })
			}

			let query = supabase
				.from('semester_results')
				.select('id', { count: 'exact', head: true })
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('program_id', programId)
				.eq('is_active', true)

			if (semester) {
				query = query.eq('semester', parseInt(semester))
			}

			const { count, error } = await query

			if (error) {
				console.error('Check exists error:', error)
				return NextResponse.json({ exists: false })
			}

			return NextResponse.json({ exists: (count || 0) > 0, count: count || 0 })
		}

		// Get semester results summary (for dashboard)
		if (action === 'results-summary') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')

			let query = supabase
				.from('semester_results_summary_view')
				.select('*')

			if (institutionId) {
				query = query.eq('institution_code', institutionId)
			}
			if (sessionId) {
				query = query.eq('session_code', sessionId)
			}

			const { data, error } = await query.order('program_code').order('semester')

			if (error) throw error

			return NextResponse.json(data)
		}

		// Get rank list for a program/semester
		if (action === 'rank-list') {
			const sessionId = searchParams.get('sessionId')
			const programId = searchParams.get('programId')
			const semester = searchParams.get('semester')

			if (!sessionId || !programId || !semester) {
				return NextResponse.json({
					error: 'sessionId, programId, and semester are required'
				}, { status: 400 })
			}

			const { data, error } = await supabase.rpc('get_semester_class_rank', {
				p_examination_session_id: sessionId,
				p_program_id: programId,
				p_semester: parseInt(semester)
			})

			if (error) throw error

			return NextResponse.json(data)
		}

		// Get semester statistics
		if (action === 'statistics') {
			const sessionId = searchParams.get('sessionId')
			const programId = searchParams.get('programId')
			const semester = searchParams.get('semester')

			const { data, error } = await supabase.rpc('get_semester_statistics', {
				p_examination_session_id: sessionId || null,
				p_program_id: programId || null,
				p_semester: semester ? parseInt(semester) : null
			})

			if (error) throw error

			return NextResponse.json(data?.[0] || {})
		}

		// Get student semester history
		if (action === 'student-history') {
			const studentId = searchParams.get('studentId')

			if (!studentId) {
				return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
			}

			const { data, error } = await supabase.rpc('get_student_semester_history', {
				p_student_id: studentId
			})

			if (error) throw error

			return NextResponse.json(data)
		}

		// Get semesters from course_offerings for a given program
		if (action === 'semesters') {
			const institutionId = searchParams.get('institutionId')
			const programId = searchParams.get('programId')
			const sessionId = searchParams.get('sessionId')

			if (!institutionId || !programId) {
				return NextResponse.json({ error: 'institutionId and programId are required' }, { status: 400 })
			}

			let query = supabase
				.from('course_offerings')
				.select('semester')
				.eq('institutions_id', institutionId)
				.eq('program_id', programId)
				.eq('is_active', true)

			if (sessionId) {
				query = query.eq('examination_session_id', sessionId)
			}

			const { data, error } = await query

			if (error) throw error

			// Get unique semesters sorted
			const semesters = [...new Set(data?.map(d => d.semester) || [])].sort((a, b) => a - b)

			return NextResponse.json(semesters)
		}

		// Get semester results for a student
		if (action === 'student-results') {
			const studentId = searchParams.get('studentId')
			const sessionId = searchParams.get('sessionId')
			const semester = searchParams.get('semester')
			const programType = (searchParams.get('programType') || 'UG') as 'UG' | 'PG'
			const includePartBreakdown = searchParams.get('includePartBreakdown') === 'true'

			if (!studentId || !sessionId) {
				return NextResponse.json({ error: 'studentId and sessionId are required' }, { status: 400 })
			}

			// Fetch with grade values from database (populated by trigger from grade_system table)
			let query = supabase
				.from('final_marks')
				.select(`
					id,
					student_id,
					course_id,
					course_offering_id,
					internal_marks_obtained,
					internal_marks_maximum,
					external_marks_obtained,
					external_marks_maximum,
					total_marks_obtained,
					total_marks_maximum,
					percentage,
					grade_points,
					letter_grade,
					grade_description,
					is_pass,
					pass_status,
					course_offerings!inner (
						semester,
						course_id,
						course_mapping!inner (
							course_id,
							course_order,
							semester_code,
							courses!inner (
								course_code,
								course_name,
								credit,
								course_part_master,
								internal_pass_mark,
								external_pass_mark,
								total_pass_mark
							)
						)
					),
					exam_registrations!inner (
						stu_register_no,
						students!inner (
							first_name,
							last_name
						)
					)
				`)
				.eq('student_id', studentId)
				.eq('examination_session_id', sessionId)
				.eq('is_active', true)

			if (semester) {
				query = query.eq('course_offerings.semester', parseInt(semester))
			}

			const { data, error } = await query

			if (error) throw error

			// Process results using grade values from database
			const processedResults: CourseResult[] = data?.map((fm: any) => {
				const externalPercentage = fm.external_marks_maximum > 0
					? (fm.external_marks_obtained / fm.external_marks_maximum) * 100
					: 0
				const internalPercentage = fm.internal_marks_maximum > 0
					? (fm.internal_marks_obtained / fm.internal_marks_maximum) * 100
					: 0

				// Get course-specific pass marks from courses table
				const coursePassMarks: CoursePassMarks = {
					internal_pass_mark: fm.course_offerings?.course_mapping?.courses?.internal_pass_mark ?? 0,
					external_pass_mark: fm.course_offerings?.course_mapping?.courses?.external_pass_mark ?? 0,
					total_pass_mark: fm.course_offerings?.course_mapping?.courses?.total_pass_mark ?? 0
				}

				// Use is_pass from database (calculated by trigger auto_determine_pass_status)
				const isPassing = fm.is_pass ?? false

				// Use grade values from database (populated by trigger auto_assign_letter_grade from grade_system table)
				// This ensures preview matches exactly what Generate & Store produces
				const finalGradePoint = fm.grade_points ?? 0
				const finalLetterGrade = fm.letter_grade ?? 'U'
				const finalGradeDescription = fm.grade_description ?? 'Re-Appear'

				const credits = fm.course_offerings?.course_mapping?.courses?.credit || 0
				const semesterCode = fm.course_offerings?.course_mapping?.semester_code || ''
				const coursePart = fm.course_offerings?.course_mapping?.courses?.course_part_master || 'Part III'

				return {
					course_id: fm.course_id,
					course_code: fm.course_offerings?.course_mapping?.courses?.course_code || '',
					course_name: fm.course_offerings?.course_mapping?.courses?.course_name || '',
					course_part: coursePart,
					course_order: fm.course_offerings?.course_mapping?.course_order || 0,
					credits: credits,
					semester: fm.course_offerings?.semester || 0,
					semester_code: semesterCode,
					semester_number: parseSemesterCode(semesterCode),
					internal_marks: fm.internal_marks_obtained,
					internal_max: fm.internal_marks_maximum,
					internal_percentage: internalPercentage,
					internal_pass_mark: coursePassMarks.internal_pass_mark,
					external_marks: fm.external_marks_obtained,
					external_max: fm.external_marks_maximum,
					external_percentage: externalPercentage,
					external_pass_mark: coursePassMarks.external_pass_mark,
					total_marks: fm.total_marks_obtained,
					total_max: fm.total_marks_maximum,
					total_pass_mark: coursePassMarks.total_pass_mark,
					percentage: fm.percentage,
					grade_point: finalGradePoint,
					letter_grade: finalLetterGrade,
					grade_description: finalGradeDescription,
					credit_points: credits * finalGradePoint,
					is_pass: isPassing,
					pass_status: fm.pass_status || (isPassing ? 'Pass' : 'Fail'),
					fail_reason: !isPassing ? (
						(coursePassMarks.external_pass_mark > 0 && fm.external_marks_obtained < coursePassMarks.external_pass_mark) ? 'External' :
						(coursePassMarks.internal_pass_mark > 0 && fm.internal_marks_obtained < coursePassMarks.internal_pass_mark) ? 'Internal' : 'Overall'
					) : undefined,
					register_no: fm.exam_registrations?.stu_register_no || ''
				} as CourseResult & { id: string; student_id: string; student_name: string; register_no: string }
			}) || []

			// Sort by part order first, then by course_order within each part
			processedResults.sort((a, b) => {
				const partOrderA = getPartOrder(a.course_part, programType)
				const partOrderB = getPartOrder(b.course_part, programType)
				if (partOrderA !== partOrderB) return partOrderA - partOrderB
				return a.course_order - b.course_order
			})

			// Calculate semester GPA
			const creditsList = processedResults.map(r => r.credits)
			const gradePointsList = processedResults.map(r => r.grade_point)
			const gpa = calculateGPA(creditsList, gradePointsList)

			// Calculate part-wise breakdown if requested
			const partBreakdown = includePartBreakdown ? groupCoursesByPart(processedResults, programType) : undefined

			return NextResponse.json({
				results: processedResults,
				part_breakdown: partBreakdown,
				summary: {
					semester_gpa: gpa,
					total_credits: creditsList.reduce((sum, c) => sum + c, 0),
					total_credit_points: processedResults.reduce((sum, r) => sum + r.credit_points, 0),
					passed_count: processedResults.filter(r => r.is_pass).length,
					failed_count: processedResults.filter(r => !r.is_pass).length
				}
			})
		}

		// Get CGPA for a student - calculated from ALL subjects (not semester-wise)
		// CGPA = sum(credit × grade_point) for ALL subjects / sum(ALL credits)
		if (action === 'student-cgpa') {
			const studentId = searchParams.get('studentId')
			const programId = searchParams.get('programId')
			const programType = (searchParams.get('programType') || 'UG') as 'UG' | 'PG'

			if (!studentId) {
				return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
			}

			// Fetch ALL final marks for the student across ALL exam sessions
			// CGPA is calculated using all subjects, not grouped by semester
			let query = supabase
				.from('final_marks')
				.select(`
					id,
					examination_session_id,
					percentage,
					grade_points,
					is_pass,
					courses!inner (
						credit,
						course_code,
						course_name
					),
					examination_sessions!inner (
						session_code,
						session_name
					)
				`)
				.eq('student_id', studentId)
				.eq('is_active', true)

			if (programId) {
				query = query.eq('program_id', programId)
			}

			const { data, error } = await query

			if (error) throw error

			// Calculate CGPA from ALL subjects (no semester grouping)
			let totalCredits = 0
			let totalCreditPoints = 0
			let passedCount = 0
			let failedCount = 0
			const coursesList: any[] = []

			data?.forEach((fm: any) => {
				const credit = fm.courses?.credit || 0
				const gradePoint = fm.grade_points || 0

				totalCredits += credit
				totalCreditPoints += credit * gradePoint

				if (fm.is_pass) {
					passedCount++
				} else {
					failedCount++
				}

				coursesList.push({
					course_code: fm.courses?.course_code,
					course_name: fm.courses?.course_name,
					credit: credit,
					grade_point: gradePoint,
					credit_points: credit * gradePoint,
					percentage: fm.percentage,
					is_pass: fm.is_pass,
					session_code: fm.examination_sessions?.session_code,
					session_name: fm.examination_sessions?.session_name
				})
			})

			// Calculate CGPA: sum(credit × grade_point) / sum(credits)
			const cgpa = totalCredits > 0
				? Math.round((totalCreditPoints / totalCredits) * 100) / 100
				: 0

			return NextResponse.json({
				cgpa,
				overall_credits: totalCredits,
				overall_credit_points: Math.round(totalCreditPoints * 100) / 100,
				total_courses: data?.length || 0,
				passed_count: passedCount,
				failed_count: failedCount,
				courses: coursesList
			})
		}

		// Get all students' semester results for a program
		if (action === 'program-results') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')
			const programId = searchParams.get('programId')
			const semester = searchParams.get('semester')
			const programType = (searchParams.get('programType') || 'UG') as 'UG' | 'PG'
			const includePartBreakdown = searchParams.get('includePartBreakdown') === 'true'

			if (!institutionId || !sessionId || !programId) {
				return NextResponse.json({
					error: 'institutionId, sessionId, and programId are required'
				}, { status: 400 })
			}

			// Build query with course_part_master, semester_code, pass marks, and grade info from database
			// IMPORTANT: grade_points and letter_grade are fetched from final_marks table
			// These values are populated by database trigger from grade_system table
			let query = supabase
				.from('final_marks')
				.select(`
					id,
					student_id,
					course_id,
					internal_marks_obtained,
					internal_marks_maximum,
					external_marks_obtained,
					external_marks_maximum,
					total_marks_obtained,
					total_marks_maximum,
					percentage,
					grade_points,
					letter_grade,
					grade_description,
					is_pass,
					pass_status,
					course_offerings!inner (
						semester,
						course_mapping!inner (
							course_order,
							semester_code,
							courses!inner (
								course_code,
								course_name,
								credit,
								course_part_master,
								internal_pass_mark,
								external_pass_mark,
								total_pass_mark
							)
						)
					),
					exam_registrations!inner (
						stu_register_no,
						students!inner (
							first_name,
							last_name
						)
					)
				`)
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('program_id', programId)
				.eq('is_active', true)

			if (semester) {
				query = query.eq('course_offerings.semester', parseInt(semester))
			}

			const { data, error } = await query

			if (error) throw error

			// Group results by student
			const studentMap: Record<string, any> = {}

			data?.forEach((fm: any) => {
				const studentId = fm.student_id
				const externalPercentage = fm.external_marks_maximum > 0
					? (fm.external_marks_obtained / fm.external_marks_maximum) * 100
					: 0
				const internalPercentage = fm.internal_marks_maximum > 0
					? (fm.internal_marks_obtained / fm.internal_marks_maximum) * 100
					: 0

				// Get course-specific pass marks from courses table
				const coursePassMarks: CoursePassMarks = {
					internal_pass_mark: fm.course_offerings?.course_mapping?.courses?.internal_pass_mark ?? 0,
					external_pass_mark: fm.course_offerings?.course_mapping?.courses?.external_pass_mark ?? 0,
					total_pass_mark: fm.course_offerings?.course_mapping?.courses?.total_pass_mark ?? 0
				}

				// Use is_pass from database (calculated by trigger auto_determine_pass_status)
				const isPassing = fm.is_pass ?? false

				// Use grade values from database (populated by trigger auto_assign_letter_grade from grade_system table)
				// This ensures preview matches exactly what Generate & Store produces
				const finalGradePoint = fm.grade_points ?? 0
				const finalLetterGrade = fm.letter_grade ?? 'U'
				const finalGradeDescription = fm.grade_description ?? 'Re-Appear'

				const credits = fm.course_offerings?.course_mapping?.courses?.credit || 0
				const semesterCode = fm.course_offerings?.course_mapping?.semester_code || ''
				const coursePart = fm.course_offerings?.course_mapping?.courses?.course_part_master || 'Part III'

				if (!studentMap[studentId]) {
					studentMap[studentId] = {
						student_id: studentId,
						student_name: [fm.exam_registrations?.students?.first_name, fm.exam_registrations?.students?.last_name].filter(Boolean).join(' ') || '',
						register_no: fm.exam_registrations?.stu_register_no || '',
						courses: [],
						credits: [],
						grade_points: []
					}
				}

				studentMap[studentId].courses.push({
					course_id: fm.course_id,
					course_code: fm.course_offerings?.course_mapping?.courses?.course_code || '',
					course_name: fm.course_offerings?.course_mapping?.courses?.course_name || '',
					course_part: coursePart,
					course_order: fm.course_offerings?.course_mapping?.course_order || 0,
					credits: credits,
					semester: fm.course_offerings?.semester || 0,
					semester_code: semesterCode,
					semester_number: parseSemesterCode(semesterCode),
					internal_marks: fm.internal_marks_obtained,
					internal_max: fm.internal_marks_maximum,
					internal_percentage: internalPercentage,
					internal_pass_mark: coursePassMarks.internal_pass_mark,
					external_marks: fm.external_marks_obtained,
					external_max: fm.external_marks_maximum,
					external_percentage: externalPercentage,
					external_pass_mark: coursePassMarks.external_pass_mark,
					total_marks: fm.total_marks_obtained,
					total_max: fm.total_marks_maximum,
					total_pass_mark: coursePassMarks.total_pass_mark,
					percentage: fm.percentage,
					grade_point: finalGradePoint,
					letter_grade: finalLetterGrade,
					grade_description: finalGradeDescription,
					is_pass: isPassing,
					pass_status: isPassing ? 'Pass' : (fm.pass_status === 'Absent' ? 'Absent' : 'Fail'),
					credit_points: credits * finalGradePoint
				})

				studentMap[studentId].credits.push(credits)
				studentMap[studentId].grade_points.push(finalGradePoint)
			})

			// Calculate GPA for each student and generate part breakdown
			const studentResults = Object.values(studentMap).map((student: any) => {
				const gpa = calculateGPA(student.credits, student.grade_points)
				const totalCredits = student.credits.reduce((sum: number, c: number) => sum + c, 0)
				const totalCreditPoints = student.courses.reduce((sum: number, c: any) => sum + c.credit_points, 0)

				// Sort courses by part order first, then by course_order
				student.courses.sort((a: any, b: any) => {
					const partOrderA = getPartOrder(a.course_part, programType)
					const partOrderB = getPartOrder(b.course_part, programType)
					if (partOrderA !== partOrderB) return partOrderA - partOrderB
					return a.course_order - b.course_order
				})

				// Generate part breakdown if requested
				const partBreakdown = includePartBreakdown ? groupCoursesByPart(student.courses, programType) : undefined

				return {
					student_id: student.student_id,
					student_name: student.student_name,
					register_no: student.register_no,
					courses: student.courses,
					part_breakdown: partBreakdown,
					semester_gpa: gpa,
					total_credits: totalCredits,
					total_credit_points: totalCreditPoints,
					passed_count: student.courses.filter((c: any) => c.is_pass).length,
					failed_count: student.courses.filter((c: any) => !c.is_pass).length
				}
			})

			// Sort by register number
			studentResults.sort((a, b) => a.register_no.localeCompare(b.register_no))

			// Calculate overall summary including grade distribution
			const gradeDistribution: Record<string, number> = {}
			studentResults.forEach(s => {
				s.courses.forEach((c: any) => {
					gradeDistribution[c.letter_grade] = (gradeDistribution[c.letter_grade] || 0) + 1
				})
			})

			// Calculate part-wise summary
			const partSummaries: Record<string, { average_gpa: number; total_credits: number; pass_rate: number }> = {}
			if (includePartBreakdown && studentResults.length > 0) {
				const parts = programType === 'UG' ? UG_PART_ORDER : PG_PART_ORDER
				parts.forEach(partName => {
					const partCredits: number[] = []
					const partGradePoints: number[] = []
					let passedCount = 0
					let totalCount = 0

					studentResults.forEach(s => {
						s.courses.forEach((c: any) => {
							if (c.course_part === partName) {
								partCredits.push(c.credits)
								partGradePoints.push(c.grade_point)
								totalCount++
								if (c.is_pass) passedCount++
							}
						})
					})

					if (totalCount > 0) {
						partSummaries[partName] = {
							average_gpa: calculateGPA(partCredits, partGradePoints),
							total_credits: partCredits.reduce((sum, c) => sum + c, 0),
							pass_rate: Math.round((passedCount / totalCount) * 100)
						}
					}
				})
			}

			const summary = {
				total_students: studentResults.length,
				passed_students: studentResults.filter(s => s.failed_count === 0).length,
				failed_students: studentResults.filter(s => s.failed_count > 0).length,
				pass_percentage: studentResults.length > 0
					? Math.round((studentResults.filter(s => s.failed_count === 0).length / studentResults.length) * 100)
					: 0,
				average_gpa: studentResults.length > 0
					? Math.round(studentResults.reduce((sum, s) => sum + s.semester_gpa, 0) / studentResults.length * 100) / 100
					: 0,
				highest_gpa: studentResults.length > 0
					? Math.max(...studentResults.map(s => s.semester_gpa))
					: 0,
				lowest_gpa: studentResults.length > 0
					? Math.min(...studentResults.map(s => s.semester_gpa))
					: 0,
				grade_distribution: gradeDistribution,
				part_summaries: includePartBreakdown ? partSummaries : undefined
			}

			return NextResponse.json({
				results: studentResults,
				summary
			})
		}

		// Get backlogs for a student or program
		if (action === 'backlogs') {
			const institutionId = searchParams.get('institutionId')
			const programId = searchParams.get('programId')
			const studentId = searchParams.get('studentId')
			const sessionId = searchParams.get('sessionId')
			const status = searchParams.get('status') // 'pending', 'cleared', 'all'
			const priority = searchParams.get('priority') // 'Critical', 'High', 'Normal', 'Low'

			// Use the detailed view for full information
			let query = supabase
				.from('student_backlogs_detailed_view')
				.select('*')
				.eq('is_active', true)
				.order('register_number', { ascending: true })
				.order('original_semester', { ascending: true })
				.order('course_code', { ascending: true })

			if (institutionId) {
				query = query.eq('institutions_id', institutionId)
			}
			if (programId) {
				query = query.eq('program_id', programId)
			}
			if (studentId) {
				query = query.eq('student_id', studentId)
			}
			if (sessionId) {
				query = query.eq('original_examination_session_id', sessionId)
			}
			if (status === 'pending') {
				query = query.eq('is_cleared', false)
			} else if (status === 'cleared') {
				query = query.eq('is_cleared', true)
			}
			if (priority) {
				query = query.eq('priority_level', priority)
			}

			const { data, error } = await query

			if (error) throw error

			// Group backlogs by student for summary
			const studentBacklogSummary: Record<string, any> = {}
			const backlogsList = data || []

			backlogsList.forEach((b: any) => {
				if (!studentBacklogSummary[b.student_id]) {
					studentBacklogSummary[b.student_id] = {
						student_id: b.student_id,
						student_name: b.student_name,
						register_no: b.register_number,
						program_code: b.program_code,
						program_name: b.program_name,
						total_backlogs: 0,
						pending_backlogs: 0,
						cleared_backlogs: 0,
						critical_count: 0,
						high_priority_count: 0,
						backlogs_by_semester: {} as Record<number, number>,
						total_credits_pending: 0
					}
				}

				const summary = studentBacklogSummary[b.student_id]
				summary.total_backlogs++

				if (!b.is_cleared) {
					summary.pending_backlogs++
					summary.total_credits_pending += b.course_credits || 0

					if (b.priority_level === 'Critical') summary.critical_count++
					if (b.priority_level === 'High') summary.high_priority_count++

					if (!summary.backlogs_by_semester[b.original_semester]) {
						summary.backlogs_by_semester[b.original_semester] = 0
					}
					summary.backlogs_by_semester[b.original_semester]++
				} else {
					summary.cleared_backlogs++
				}
			})

			// Calculate overall statistics
			const overallStats = {
				total_backlogs: backlogsList.length,
				pending_backlogs: backlogsList.filter((b: any) => !b.is_cleared).length,
				cleared_backlogs: backlogsList.filter((b: any) => b.is_cleared).length,
				critical_count: backlogsList.filter((b: any) => !b.is_cleared && b.priority_level === 'Critical').length,
				high_priority_count: backlogsList.filter((b: any) => !b.is_cleared && b.priority_level === 'High').length,
				students_with_backlogs: Object.keys(studentBacklogSummary).filter(
					id => studentBacklogSummary[id].pending_backlogs > 0
				).length,
				failure_reasons: {
					Internal: backlogsList.filter((b: any) => !b.is_cleared && b.failure_reason === 'Internal').length,
					External: backlogsList.filter((b: any) => !b.is_cleared && b.failure_reason === 'External').length,
					Both: backlogsList.filter((b: any) => !b.is_cleared && b.failure_reason === 'Both').length,
					Absent: backlogsList.filter((b: any) => !b.is_cleared && b.is_absent).length
				}
			}

			return NextResponse.json({
				backlogs: backlogsList,
				student_summaries: Object.values(studentBacklogSummary),
				statistics: overallStats
			})
		}

		// Get backlog statistics for a program (summary view)
		if (action === 'backlog-statistics') {
			const institutionId = searchParams.get('institutionId')
			const programId = searchParams.get('programId')

			const { data, error } = await supabase
				.from('pending_backlogs_summary_view')
				.select('*')
				.eq('institution_code', institutionId ? undefined : null)
				.order('original_semester', { ascending: true })

			if (error) throw error

			return NextResponse.json(data)
		}

		// Create backlogs from failed results
		if (action === 'create-backlogs') {
			const sessionId = searchParams.get('sessionId')
			const programId = searchParams.get('programId')
			const semester = searchParams.get('semester')

			if (!sessionId) {
				return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
			}

			// Call the database function to create backlogs
			const { data, error } = await supabase.rpc('create_backlogs_from_semester_results', {
				p_examination_session_id: sessionId,
				p_program_id: programId || null,
				p_semester: semester ? parseInt(semester) : null
			})

			if (error) throw error

			return NextResponse.json({
				success: true,
				backlogs_created: data
			})
		}

		return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

	} catch (error) {
		console.error('Semester results API error:', error)
		return NextResponse.json({
			error: error instanceof Error ? error.message : 'Failed to process request'
		}, { status: 500 })
	}
}

// =====================================================
// POST HANDLER - Generate, Declare, Publish Results
// =====================================================

export async function POST(req: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const body = await req.json()
		const { action } = body

		// Generate semester results for students (Direct INSERT - bypasses RPC)
		// CGPA is calculated using ALL subjects taken by the student (not semester-wise)
		// Semester value comes from student's current_semester in students table
		if (action === 'generate-results') {
			const { sessionId, programId, semester, programType = 'UG' } = body

			if (!sessionId) {
				return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
			}

			// Fetch all final marks with course and student info for calculation
			// Include external marks to calculate is_pass dynamically (same as preview)
			let finalMarksQuery = supabase
				.from('final_marks')
				.select(`
					id,
					student_id,
					course_id,
					institutions_id,
					program_id,
					examination_session_id,
					grade_points,
					internal_marks_obtained,
					internal_marks_maximum,
					external_marks_obtained,
					external_marks_maximum,
					total_marks_obtained,
					total_marks_maximum,
					percentage,
					is_pass,
					courses!inner (
						credit
					),
					exam_registrations!inner (
						id,
						stu_register_no
					)
				`)
				.eq('examination_session_id', sessionId)
				.eq('is_active', true)

			if (programId) {
				finalMarksQuery = finalMarksQuery.eq('program_id', programId)
			}

			const { data: finalMarksData, error: fmError } = await finalMarksQuery

			if (fmError) {
				console.error('Final marks fetch error:', fmError)
				throw fmError
			}

			if (!finalMarksData || finalMarksData.length === 0) {
				return NextResponse.json({
					success: true,
					message: 'No final marks found for the selected criteria.',
					summary: { total: 0, success: 0, failed: 0 }
				})
			}

			// Get unique student IDs from final marks
			const studentIds = [...new Set(finalMarksData.map((fm: any) => fm.student_id))]

			// Fetch student details including semester_id from students table
			// Note: final_marks.student_id references users table, so we need to match via register_number
			const registerNumbers = [...new Set(finalMarksData.map((fm: any) => fm.exam_registrations?.stu_register_no).filter(Boolean))]

			const { data: studentsData, error: studentsError } = await supabase
				.from('students')
				.select('id, register_number, semester_id')
				.in('register_number', registerNumbers)

			if (studentsError) {
				console.error('Students fetch error:', studentsError)
			}

			// Debug: Log students data
			console.log('Students data:', JSON.stringify(studentsData, null, 2))

			// Get unique semester IDs and fetch display_order from semesters table
			const semesterIds = [...new Set((studentsData || []).map((s: any) => s.semester_id).filter(Boolean))]
			console.log('Semester IDs to lookup:', semesterIds)

			let semestersMap: Record<string, number> = {}

			if (semesterIds.length > 0) {
				const { data: semestersData, error: semestersError } = await supabase
					.from('semesters')
					.select('id, display_order, semester_name')
					.in('id', semesterIds)

				console.log('Semesters data:', JSON.stringify(semestersData, null, 2))

				if (semestersError) {
					console.error('Semesters fetch error:', semestersError)
				} else {
					semestersData?.forEach((sem: any) => {
						// Use display_order as the semester number
						console.log(`Semester ${sem.id}: display_order=${sem.display_order}, name=${sem.semester_name}`)
						semestersMap[sem.id] = sem.display_order || 1
					})
				}
			}

			// Create a map of register_number to semester (from display_order)
			const studentSemesterMap: Record<string, number> = {}
			studentsData?.forEach((s: any) => {
				// Get display_order from the semesters lookup
				const semesterNumber = s.semester_id ? (semestersMap[s.semester_id] || 1) : 1
				console.log(`Student ${s.register_number}: semester_id=${s.semester_id}, resolved semester=${semesterNumber}`)
				studentSemesterMap[s.register_number] = semesterNumber
			})

			// Group final marks by student (NOT by semester - CGPA uses all subjects)
			const studentMarksMap: Record<string, {
				student_id: string
				institutions_id: string
				program_id: string
				examination_session_id: string
				register_no: string
				marks: typeof finalMarksData
			}> = {}

			finalMarksData.forEach((fm: any) => {
				const studentId = fm.student_id
				const registerNo = fm.exam_registrations?.stu_register_no || ''

				if (!studentMarksMap[studentId]) {
					studentMarksMap[studentId] = {
						student_id: studentId,
						institutions_id: fm.institutions_id,
						program_id: fm.program_id,
						examination_session_id: fm.examination_session_id,
						register_no: registerNo,
						marks: []
					}
				}
				studentMarksMap[studentId].marks.push(fm)
			})

			// Fetch ALL final marks for each student to calculate CGPA across all exam sessions
			// CGPA = sum(credit × grade_point) for ALL subjects / sum(ALL credits)
			const cgpaPromises = Object.keys(studentMarksMap).map(async (studentId) => {
				const { data: allMarks, error: allMarksError } = await supabase
					.from('final_marks')
					.select(`
						id,
						grade_points,
						is_pass,
						courses!inner (
							credit
						)
					`)
					.eq('student_id', studentId)
					.eq('is_active', true)

				if (allMarksError) {
					console.error(`Error fetching all marks for student ${studentId}:`, allMarksError)
					return { studentId, cgpaCredits: 0, cgpaCreditPoints: 0 }
				}

				let cgpaCredits = 0
				let cgpaCreditPoints = 0

				allMarks?.forEach((fm: any) => {
					const credit = fm.courses?.credit || 0
					const gradePoint = fm.grade_points || 0
					cgpaCredits += credit
					cgpaCreditPoints += credit * gradePoint
				})

				return { studentId, cgpaCredits, cgpaCreditPoints }
			})

			const cgpaResults = await Promise.all(cgpaPromises)
			const cgpaDataMap: Record<string, { cgpaCredits: number; cgpaCreditPoints: number }> = {}
			cgpaResults.forEach(r => {
				cgpaDataMap[r.studentId] = { cgpaCredits: r.cgpaCredits, cgpaCreditPoints: r.cgpaCreditPoints }
			})

			// Calculate and prepare semester results
			const semesterResultsToInsert: any[] = []
			const results: { studentId: string; semester: number; semesterResultId: string | null; error?: string }[] = []

			Object.values(studentMarksMap).forEach((studentData) => {
				const { student_id, institutions_id, program_id, examination_session_id, register_no, marks } = studentData

				// Get semester_number from students.semester_id -> semesters.semester_number
				const currentSemester = studentSemesterMap[register_no] || 1

				// Calculate SGPA for THIS session only
				let totalCreditsRegistered = 0
				let totalCreditsEarned = 0
				let totalCreditPoints = 0
				let totalMarksObtained = 0
				let totalMarksMaximum = 0
				let totalBacklogs = 0

				marks.forEach((fm: any) => {
					const credit = fm.courses?.credit || 0
					const gradePoint = fm.grade_points || 0

					totalCreditsRegistered += credit
					totalCreditPoints += credit * gradePoint
					totalMarksObtained += fm.total_marks_obtained || 0
					totalMarksMaximum += fm.total_marks_maximum || 0

					// Use is_pass from final_marks table (already calculated by database trigger)
					if (fm.is_pass) {
						totalCreditsEarned += credit
					} else {
						totalBacklogs++
					}
				})

				// Calculate SGPA (for this session only)
				const sgpa = totalCreditsRegistered > 0
					? Math.round((totalCreditPoints / totalCreditsRegistered) * 100) / 100
					: 0

				// Calculate CGPA using ALL subjects across ALL sessions
				const cgpaData = cgpaDataMap[student_id] || { cgpaCredits: 0, cgpaCreditPoints: 0 }
				const cgpa = cgpaData.cgpaCredits > 0
					? Math.round((cgpaData.cgpaCreditPoints / cgpaData.cgpaCredits) * 100) / 100
					: sgpa // Fallback to SGPA if no cumulative data

				// Calculate percentage
				const percentage = totalMarksMaximum > 0
					? Math.round((totalMarksObtained / totalMarksMaximum) * 10000) / 100
					: 0

				// Determine result_status based on backlogs
				const resultStatus = totalBacklogs === 0 ? 'Pass' : 'Fail'

				semesterResultsToInsert.push({
					institutions_id,
					student_id,
					examination_session_id,
					program_id,
					semester: currentSemester, // Use student's current semester from students table
					total_credits_registered: totalCreditsRegistered,
					total_credits_earned: totalCreditsEarned,
					total_credit_points: totalCreditPoints,
					sgpa,
					cgpa, // CGPA calculated from ALL subjects
					percentage,
					total_backlogs: totalBacklogs,
					new_backlogs: totalBacklogs,
					result_status: resultStatus,
					is_active: true
				})
			})

			// Batch insert/upsert semester results
			let successCount = 0
			let failureCount = 0

			for (const sr of semesterResultsToInsert) {
				try {
					const { data: insertedData, error: insertError } = await supabase
						.from('semester_results')
						.upsert(sr, {
							onConflict: 'institutions_id,student_id,examination_session_id,semester'
						})
						.select('id')
						.single()

					if (insertError) {
						console.error('Insert error for student:', sr.student_id, insertError)
						results.push({
							studentId: sr.student_id,
							semester: sr.semester,
							semesterResultId: null,
							error: insertError.message
						})
						failureCount++
					} else {
						results.push({
							studentId: sr.student_id,
							semester: sr.semester,
							semesterResultId: insertedData?.id || null
						})
						successCount++
					}
				} catch (err) {
					console.error('Exception for student:', sr.student_id, err)
					results.push({
						studentId: sr.student_id,
						semester: sr.semester,
						semesterResultId: null,
						error: err instanceof Error ? err.message : 'Unknown error'
					})
					failureCount++
				}
			}

			// Also create backlogs for failed courses automatically
			// Note: This requires the student_backlogs table with correct schema
			// If the table doesn't exist or has different schema, we skip this step
			let backlogsCreated = 0
			let backlogNote = ''
			if (successCount > 0) {
				try {
					// First update final_marks result_status to 'Published' so backlogs can be created
					for (const sr of semesterResultsToInsert) {
						await supabase
							.from('final_marks')
							.update({
								result_status: 'Published',
								updated_at: new Date().toISOString()
							})
							.eq('student_id', sr.student_id)
							.eq('examination_session_id', sr.examination_session_id)
							.eq('program_id', sr.program_id)
					}

					// Try to call the RPC function, if it exists
					const { data: backlogData, error: backlogError } = await supabase.rpc('create_backlogs_from_semester_results', {
						p_examination_session_id: sessionId,
						p_program_id: programId || null,
						p_semester: semester || null
					})

					if (!backlogError) {
						backlogsCreated = backlogData || 0
					} else {
						console.error('Backlog RPC error:', backlogError)
						// RPC function doesn't exist or failed - that's okay
						// Backlogs can be created later using the "Create Backlogs" button
						backlogNote = ' (Backlog creation skipped - run migration or use Create Backlogs button)'
					}
				} catch (backlogErr) {
					console.error('Error creating backlogs:', backlogErr)
					// Don't fail the whole operation, just note that backlogs weren't created
					backlogNote = ' (Backlog creation skipped - table may need migration)'
				}
			}

			return NextResponse.json({
				success: true,
				message: `Generated ${successCount} semester results. ${failureCount} failed. ${backlogsCreated} backlogs created.${backlogNote}`,
				results,
				summary: {
					total: semesterResultsToInsert.length,
					success: successCount,
					failed: failureCount,
					backlogs_created: backlogsCreated
				}
			})
		}

		// Declare semester results (set declaration date)
		if (action === 'declare-results') {
			const { semesterResultIds, userId, userEmail } = body

			if (!semesterResultIds || !Array.isArray(semesterResultIds) || semesterResultIds.length === 0) {
				return NextResponse.json({ error: 'semesterResultIds array is required' }, { status: 400 })
			}

			// Get a valid user ID from the users table
			// The userId from frontend is Auth ID, we need to find matching user in users table
			let declaredBy = null

			// First try to find user by email (most reliable)
			if (userEmail) {
				const { data: userByEmail } = await supabase
					.from('users')
					.select('id')
					.eq('email', userEmail)
					.eq('is_active', true)
					.single()
				declaredBy = userByEmail?.id
			}

			// If not found by email, try by auth_id (if users table has auth_id column)
			if (!declaredBy && userId) {
				const { data: userById } = await supabase
					.from('users')
					.select('id')
					.eq('id', userId)
					.eq('is_active', true)
					.single()
				declaredBy = userById?.id
			}

			// Fallback: fetch any active admin user
			if (!declaredBy) {
				const { data: adminUser } = await supabase
					.from('users')
					.select('id')
					.eq('is_active', true)
					.limit(1)
					.single()
				declaredBy = adminUser?.id
			}

			if (!declaredBy) {
				return NextResponse.json({ error: 'No valid user found for declaration' }, { status: 400 })
			}

			// Update directly instead of using RPC (which fails with service role)
			const { data, error } = await supabase
				.from('semester_results')
				.update({
					result_declared_date: new Date().toISOString().split('T')[0],
					result_declared_by: declaredBy,
					updated_at: new Date().toISOString()
				})
				.in('id', semesterResultIds)
				.is('result_declared_date', null)
				.select('id')

			if (error) throw error

			const declaredCount = data?.length || 0

			return NextResponse.json({
				success: true,
				message: `Declared ${declaredCount} semester results.`,
				declared_count: declaredCount
			})
		}

		// Publish semester results (make them visible to students)
		if (action === 'publish-results') {
			const { semesterResultIds, userId, userEmail } = body

			if (!semesterResultIds || !Array.isArray(semesterResultIds) || semesterResultIds.length === 0) {
				return NextResponse.json({ error: 'semesterResultIds array is required' }, { status: 400 })
			}

			// Get a valid user ID from the users table
			let publishedBy = null

			// First try to find user by email (most reliable)
			if (userEmail) {
				const { data: userByEmail } = await supabase
					.from('users')
					.select('id')
					.eq('email', userEmail)
					.eq('is_active', true)
					.single()
				publishedBy = userByEmail?.id
			}

			// If not found by email, try by auth_id
			if (!publishedBy && userId) {
				const { data: userById } = await supabase
					.from('users')
					.select('id')
					.eq('id', userId)
					.eq('is_active', true)
					.single()
				publishedBy = userById?.id
			}

			// Fallback: fetch any active admin user
			if (!publishedBy) {
				const { data: adminUser } = await supabase
					.from('users')
					.select('id')
					.eq('is_active', true)
					.limit(1)
					.single()
				publishedBy = adminUser?.id
			}

			if (!publishedBy) {
				return NextResponse.json({ error: 'No valid user found for publication' }, { status: 400 })
			}

			const today = new Date().toISOString().split('T')[0]

			// Update directly instead of using RPC (which fails with service role due to auth.uid() being null)
			const { data, error } = await supabase
				.from('semester_results')
				.update({
					is_published: true,
					published_date: today,
					published_by: publishedBy,
					is_locked: true,
					locked_by: publishedBy,
					locked_date: today,
					updated_at: new Date().toISOString()
				})
				.in('id', semesterResultIds)
				.eq('is_published', false)
				.not('result_declared_date', 'is', null)
				.select('id, student_id, examination_session_id, semester, program_id')

			if (error) throw error

			const publishedCount = data?.length || 0

			// Also update final_marks.result_status to 'Published' for all related records
			// This is required for create_backlogs_from_semester_results to work correctly
			if (data && data.length > 0) {
				for (const sr of data) {
					// Update final_marks for this student/session/semester combination
					await supabase
						.from('final_marks')
						.update({
							result_status: 'Published',
							updated_at: new Date().toISOString()
						})
						.eq('student_id', sr.student_id)
						.eq('examination_session_id', sr.examination_session_id)
						.eq('program_id', sr.program_id)
						.neq('result_status', 'Published')
				}
			}

			return NextResponse.json({
				success: true,
				message: `Published ${publishedCount} semester results.`,
				published_count: publishedCount
			})
		}

		// Withdraw published results
		if (action === 'withdraw-results') {
			const { semesterResultIds, reason } = body

			if (!semesterResultIds || !Array.isArray(semesterResultIds) || semesterResultIds.length === 0) {
				return NextResponse.json({ error: 'semesterResultIds array is required' }, { status: 400 })
			}

			if (!reason) {
				return NextResponse.json({ error: 'reason is required for withdrawal' }, { status: 400 })
			}

			const { data, error } = await supabase.rpc('withdraw_semester_results', {
				p_semester_result_ids: semesterResultIds,
				p_withdrawal_reason: reason
			})

			if (error) throw error

			return NextResponse.json({
				success: true,
				message: `Withdrawn ${data} semester results.`,
				withdrawn_count: data
			})
		}

		// Lock semester results
		if (action === 'lock-results') {
			const { semesterResultId } = body

			if (!semesterResultId) {
				return NextResponse.json({ error: 'semesterResultId is required' }, { status: 400 })
			}

			const { data, error } = await supabase.rpc('lock_semester_results', {
				p_semester_result_id: semesterResultId,
				p_locked_by: null
			})

			if (error) throw error

			return NextResponse.json({
				success: true,
				locked: data
			})
		}

		// Unlock semester results
		if (action === 'unlock-results') {
			const { semesterResultId } = body

			if (!semesterResultId) {
				return NextResponse.json({ error: 'semesterResultId is required' }, { status: 400 })
			}

			const { data, error } = await supabase.rpc('unlock_semester_results', {
				p_semester_result_id: semesterResultId
			})

			if (error) throw error

			return NextResponse.json({
				success: true,
				unlocked: data
			})
		}

		// Create backlogs from failed results
		if (action === 'create-backlogs') {
			const { sessionId, programId, semester } = body

			if (!sessionId) {
				return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
			}

			const { data, error } = await supabase.rpc('create_backlogs_from_semester_results', {
				p_examination_session_id: sessionId,
				p_program_id: programId || null,
				p_semester: semester || null
			})

			if (error) throw error

			return NextResponse.json({
				success: true,
				message: `Created ${data} backlog records.`,
				backlogs_created: data
			})
		}

		// Bulk update promotion status
		if (action === 'update-promotion') {
			const { semesterResultIds, isPromoted, remarks } = body

			if (!semesterResultIds || !Array.isArray(semesterResultIds) || semesterResultIds.length === 0) {
				return NextResponse.json({ error: 'semesterResultIds array is required' }, { status: 400 })
			}

			if (typeof isPromoted !== 'boolean') {
				return NextResponse.json({ error: 'isPromoted boolean is required' }, { status: 400 })
			}

			const { data, error } = await supabase.rpc('bulk_update_promotion_status', {
				p_semester_result_ids: semesterResultIds,
				p_is_promoted: isPromoted,
				p_promotion_remarks: remarks || null
			})

			if (error) throw error

			return NextResponse.json({
				success: true,
				message: `Updated promotion status for ${data} students.`,
				updated_count: data
			})
		}

		return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

	} catch (error) {
		console.error('Semester results POST API error:', error)
		return NextResponse.json({
			error: error instanceof Error ? error.message : 'Failed to process request'
		}, { status: 500 })
	}
}
