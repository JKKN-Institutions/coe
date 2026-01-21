import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// =====================================================
// GRADE CONVERSION TABLE (UG)
// =====================================================

const UG_GRADE_TABLE = [
	{ min: 90, max: 100, gradePoint: 10.0, letterGrade: 'O', description: 'Outstanding' },
	{ min: 80, max: 89, gradePoint: 9.0, letterGrade: 'A+', description: 'Excellent' },
	{ min: 70, max: 79, gradePoint: 8.0, letterGrade: 'A', description: 'Good' },
	{ min: 60, max: 69, gradePoint: 7.0, letterGrade: 'B+', description: 'Above Average' },
	{ min: 50, max: 59, gradePoint: 6.0, letterGrade: 'B', description: 'Average' },
	{ min: 40, max: 49, gradePoint: 5.0, letterGrade: 'C', description: 'Satisfactory' },
	{ min: 0, max: 39, gradePoint: 0.0, letterGrade: 'U', description: 'Re-Appear' },
	{ min: -1, max: -1, gradePoint: 0.0, letterGrade: 'AAA', description: 'ABSENT' }
]

// Part descriptions mapping
const PART_DESCRIPTIONS: Record<string, string> = {
	'Part I': 'Language I (Tamil/Hindi/French etc.)',
	'Part II': 'Language II (English)',
	'Part III': 'Core/Major Subjects',
	'Part IV': 'Allied/Skill Enhancement/Foundation',
	'Part V': 'Extension Activities/Projects'
}

// Part order for sorting
const PART_ORDER = ['Part I', 'Part II', 'Part III', 'Part IV', 'Part V']

/**
 * Get grade details from percentage
 * Supports continuous/interpolated grade points
 */
function getGradeFromPercentage(
	percentage: number,
	isAbsent: boolean = false
): { gradePoint: number; letterGrade: string; description: string } {
	if (isAbsent) {
		return { gradePoint: 0, letterGrade: 'AAA', description: 'ABSENT' }
	}

	// Use continuous grade point calculation
	// Grade point = percentage / 10 (capped at range boundaries)
	const continuousGP = Math.round((percentage / 10) * 10) / 10

	for (const grade of UG_GRADE_TABLE) {
		if (percentage >= grade.min && percentage <= grade.max) {
			return {
				gradePoint: continuousGP,
				letterGrade: grade.letterGrade,
				description: grade.description
			}
		}
	}

	return { gradePoint: 0, letterGrade: 'U', description: 'Re-Appear' }
}

/**
 * Check if student passed based on pass marks
 * Passing requires: 40% in ESE AND 40% in Total
 */
function checkPassStatus(
	eseMarks: number,
	eseMax: number,
	totalMarks: number,
	totalMax: number
): { isPassing: boolean; result: string } {
	const esePercentage = eseMax > 0 ? (eseMarks / eseMax) * 100 : 0
	const totalPercentage = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0

	const passesESE = esePercentage >= 40
	const passesTotal = totalPercentage >= 40

	if (passesESE && passesTotal) {
		return { isPassing: true, result: 'PASS' }
	}
	return { isPassing: false, result: 'RA' }
}

/**
 * Get part order for sorting
 */
function getPartOrder(partName: string): number {
	const index = PART_ORDER.findIndex(p => p.toLowerCase() === partName?.toLowerCase())
	return index >= 0 ? index : 999
}

// =====================================================
// API HANDLERS
// =====================================================

export async function GET(req: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(req.url)
		const action = searchParams.get('action')

		// Get marksheet data for a specific student
		if (action === 'student-marksheet') {
			const studentId = searchParams.get('studentId')
			const sessionId = searchParams.get('sessionId')
			const semester = searchParams.get('semester')

			if (!studentId || !sessionId) {
				return NextResponse.json({ error: 'studentId and sessionId are required' }, { status: 400 })
			}

			// Fetch final marks with course details
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
					course_offerings (
						semester,
						course_mapping (
							course_order,
							semester_code,
							courses (
								course_code,
								course_name,
								credit,
								course_part_master
							)
						)
					),
					exam_registrations (
						stu_register_no,
						student_name
					)
				`)
				.eq('student_id', studentId)
				.eq('examination_session_id', sessionId)
				.eq('is_active', true)

			if (semester) {
				query = query.eq('course_offerings.semester', parseInt(semester))
			}

			const { data: finalMarks, error: fmError } = await query

			if (fmError) {
				console.error('Error fetching final marks:', fmError)
				throw fmError
			}

			if (!finalMarks || finalMarks.length === 0) {
				return NextResponse.json({ error: 'No marks found for the student' }, { status: 404 })
			}

			// Get student details
			const studentName = finalMarks[0]?.exam_registrations?.student_name || ''
			const registerNo = finalMarks[0]?.exam_registrations?.stu_register_no || ''

			// Fetch date of birth from learners_profiles using register number
			let dateOfBirth: string | null = null
			if (registerNo) {
				const { data: learnerProfile } = await supabase
					.from('learners_profiles')
					.select('date_of_birth')
					.eq('register_number', registerNo)
					.maybeSingle()

				if (learnerProfile?.date_of_birth) {
					// Format DOB as DD-MM-YYYY
					const dob = new Date(learnerProfile.date_of_birth)
					if (!isNaN(dob.getTime())) {
						dateOfBirth = `${String(dob.getDate()).padStart(2, '0')}-${String(dob.getMonth() + 1).padStart(2, '0')}-${dob.getFullYear()}`
					}
				}
			}

			// Get semester result for GPA summary
			const { data: semesterResult } = await supabase
				.from('semester_results')
				.select('*')
				.eq('student_id', studentId)
				.eq('examination_session_id', sessionId)
				.single()

			// Process courses and group by part
			interface ProcessedCourse {
				courseCode: string
				courseName: string
				part: string
				partDescription: string
				semester: number
				semesterCode: string
				courseOrder: number
				credits: number
				eseMax: number
				ciaMax: number
				totalMax: number
				eseMarks: number
				ciaMarks: number
				totalMarks: number
				percentage: number
				gradePoint: number
				letterGrade: string
				creditPoints: number
				isPassing: boolean
				result: string
			}

			const processedCourses: ProcessedCourse[] = []

			finalMarks.forEach((fm: any) => {
				const courseData = fm.course_offerings?.course_mapping?.courses
				if (!courseData) return

				const eseMarks = fm.external_marks_obtained || 0
				const ciaMarks = fm.internal_marks_obtained || 0
				const totalMarks = fm.total_marks_obtained || 0
				const eseMax = fm.external_marks_maximum || 75
				const ciaMax = fm.internal_marks_maximum || 25
				const totalMax = fm.total_marks_maximum || 100
				const percentage = fm.percentage || (totalMax > 0 ? (totalMarks / totalMax) * 100 : 0)

				// Use grade values from database if available, otherwise calculate
				let gradePoint = fm.grade_points
				let letterGrade = fm.letter_grade

				if (gradePoint === null || gradePoint === undefined) {
					const gradeInfo = getGradeFromPercentage(percentage)
					gradePoint = gradeInfo.gradePoint
					letterGrade = gradeInfo.letterGrade
				}

				// Check pass status
				const { isPassing, result } = checkPassStatus(eseMarks, eseMax, totalMarks, totalMax)

				// If failed, grade point becomes 0
				const finalGradePoint = isPassing ? gradePoint : 0
				const credits = courseData.credit || 0
				const creditPoints = credits * finalGradePoint

				const part = courseData.course_part_master || 'Part III'

				processedCourses.push({
					courseCode: courseData.course_code,
					courseName: courseData.course_name,
					part,
					partDescription: PART_DESCRIPTIONS[part] || '',
					semester: fm.course_offerings?.semester || 1,
					semesterCode: fm.course_offerings?.course_mapping?.semester_code || '',
					courseOrder: fm.course_offerings?.course_mapping?.course_order || 0,
					credits,
					eseMax,
					ciaMax,
					totalMax,
					eseMarks,
					ciaMarks,
					totalMarks,
					percentage: Math.round(percentage * 100) / 100,
					gradePoint: Math.round(finalGradePoint * 10) / 10,
					letterGrade: letterGrade || 'U',
					creditPoints: Math.round(creditPoints * 10) / 10,
					isPassing,
					result
				})
			})

			// Sort by part order, then course order
			processedCourses.sort((a, b) => {
				const partDiff = getPartOrder(a.part) - getPartOrder(b.part)
				if (partDiff !== 0) return partDiff
				return a.courseOrder - b.courseOrder
			})

			// Group courses by part
			const partGroups: Record<string, {
				partName: string
				partDescription: string
				courses: ProcessedCourse[]
				totalCredits: number
				totalCreditPoints: number
				partGPA: number
				creditsEarned: number
			}> = {}

			processedCourses.forEach(course => {
				if (!partGroups[course.part]) {
					partGroups[course.part] = {
						partName: course.part,
						partDescription: course.partDescription,
						courses: [],
						totalCredits: 0,
						totalCreditPoints: 0,
						partGPA: 0,
						creditsEarned: 0
					}
				}
				partGroups[course.part].courses.push(course)
				partGroups[course.part].totalCredits += course.credits
				partGroups[course.part].totalCreditPoints += course.creditPoints
				if (course.isPassing) {
					partGroups[course.part].creditsEarned += course.credits
				}
			})

			// Calculate part-wise GPA
			Object.values(partGroups).forEach(part => {
				part.partGPA = part.totalCredits > 0
					? Math.round((part.totalCreditPoints / part.totalCredits) * 100) / 100
					: 0
			})

			// Sort parts by order
			const sortedParts = Object.values(partGroups).sort((a, b) =>
				getPartOrder(a.partName) - getPartOrder(b.partName)
			)

			// Calculate overall semester GPA
			const totalCredits = processedCourses.reduce((sum, c) => sum + c.credits, 0)
			const totalCreditPoints = processedCourses.reduce((sum, c) => sum + c.creditPoints, 0)
			const semesterGPA = totalCredits > 0
				? Math.round((totalCreditPoints / totalCredits) * 100) / 100
				: 0

			// Calculate credits earned (only passed courses)
			const creditsEarned = processedCourses
				.filter(c => c.isPassing)
				.reduce((sum, c) => sum + c.credits, 0)

			// Determine overall result
			const hasFailures = processedCourses.some(c => !c.isPassing)
			const overallResult = hasFailures ? 'RA' : 'PASS'

			return NextResponse.json({
				student: {
					id: studentId,
					name: studentName,
					registerNo,
					dateOfBirth: dateOfBirth
				},
				semester: parseInt(semester || '1'),
				session: {
					id: sessionId,
					name: semesterResult?.session_name || '',
					monthYear: semesterResult?.month_year || ''
				},
				program: {
					code: semesterResult?.program_code || '',
					name: semesterResult?.program_name || ''
				},
				courses: processedCourses,
				partBreakdown: sortedParts,
				summary: {
					totalCourses: processedCourses.length,
					totalCredits,
					creditsEarned,
					totalCreditPoints: Math.round(totalCreditPoints * 100) / 100,
					semesterGPA,
					cgpa: semesterResult?.cgpa || semesterGPA,
					passedCount: processedCourses.filter(c => c.isPassing).length,
					failedCount: processedCourses.filter(c => !c.isPassing).length,
					overallResult,
					folio: semesterResult?.folio_number || null
				}
			})
		}

		// Get marksheet data for multiple students (batch)
		if (action === 'batch-marksheet') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')
			const programCode = searchParams.get('programCode')
			const semester = searchParams.get('semester')

			if (!institutionId || !sessionId) {
				return NextResponse.json({
					error: 'institutionId and sessionId are required'
				}, { status: 400 })
			}

			// Fetch all final marks for the criteria
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
					is_pass,
					course_offerings (
						semester,
						course_mapping (
							course_order,
							semester_code,
							courses (
								course_code,
								course_name,
								credit,
								course_part_master
							)
						)
					),
					exam_registrations (
						stu_register_no,
						student_name
					)
				`)
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('is_active', true)

			if (programCode) {
				query = query.eq('program_code', programCode)
			}

			if (semester) {
				query = query.eq('course_offerings.semester', parseInt(semester))
			}

			const { data: finalMarks, error } = await query

			if (error) throw error

			// Group by student
			const studentMap: Record<string, any> = {}

			finalMarks?.forEach((fm: any) => {
				const studentId = fm.student_id
				if (!studentMap[studentId]) {
					studentMap[studentId] = {
						studentId,
						studentName: fm.exam_registrations?.student_name || '',
						registerNo: fm.exam_registrations?.stu_register_no || '',
						courses: []
					}
				}

				const courseData = fm.course_offerings?.course_mapping?.courses
				if (!courseData) return

				const eseMarks = fm.external_marks_obtained || 0
				const ciaMarks = fm.internal_marks_obtained || 0
				const totalMarks = fm.total_marks_obtained || 0
				const percentage = fm.percentage || 0

				let gradePoint = fm.grade_points
				let letterGrade = fm.letter_grade

				if (gradePoint === null || gradePoint === undefined) {
					const gradeInfo = getGradeFromPercentage(percentage)
					gradePoint = gradeInfo.gradePoint
					letterGrade = gradeInfo.letterGrade
				}

				const { isPassing, result } = checkPassStatus(
					eseMarks,
					fm.external_marks_maximum || 75,
					totalMarks,
					fm.total_marks_maximum || 100
				)

				const finalGradePoint = isPassing ? gradePoint : 0
				const credits = courseData.credit || 0

				studentMap[studentId].courses.push({
					courseCode: courseData.course_code,
					courseName: courseData.course_name,
					part: courseData.course_part_master || 'Part III',
					semester: fm.course_offerings?.semester || 1,
					courseOrder: fm.course_offerings?.course_mapping?.course_order || 0,
					credits,
					eseMax: fm.external_marks_maximum || 75,
					ciaMax: fm.internal_marks_maximum || 25,
					totalMax: fm.total_marks_maximum || 100,
					eseMarks,
					ciaMarks,
					totalMarks,
					percentage: Math.round(percentage * 100) / 100,
					gradePoint: Math.round(finalGradePoint * 10) / 10,
					letterGrade: letterGrade || 'U',
					creditPoints: Math.round(credits * finalGradePoint * 10) / 10,
					isPassing,
					result
				})
			})

			// Fetch date of birth for all students from learners_profiles
			const registerNumbers = Object.values(studentMap).map((s: any) => s.registerNo).filter(Boolean)
			const dobMap: Record<string, string> = {}

			if (registerNumbers.length > 0) {
				const { data: learnerProfiles } = await supabase
					.from('learners_profiles')
					.select('register_number, date_of_birth')
					.in('register_number', registerNumbers)

				learnerProfiles?.forEach((lp: any) => {
					if (lp.date_of_birth && lp.register_number) {
						const dob = new Date(lp.date_of_birth)
						if (!isNaN(dob.getTime())) {
							dobMap[lp.register_number] = `${String(dob.getDate()).padStart(2, '0')}-${String(dob.getMonth() + 1).padStart(2, '0')}-${dob.getFullYear()}`
						}
					}
				})
			}

			// Process each student's data into marksheet format
			const marksheets = Object.values(studentMap).map((student: any) => {
				// Sort courses
				student.courses.sort((a: any, b: any) => {
					const partDiff = getPartOrder(a.part) - getPartOrder(b.part)
					if (partDiff !== 0) return partDiff
					return a.courseOrder - b.courseOrder
				})

				// Group courses by part
				const partGroups: Record<string, {
					partName: string
					partDescription: string
					courses: any[]
					totalCredits: number
					totalCreditPoints: number
					partGPA: number
					creditsEarned: number
				}> = {}

				student.courses.forEach((course: any) => {
					if (!partGroups[course.part]) {
						partGroups[course.part] = {
							partName: course.part,
							partDescription: PART_DESCRIPTIONS[course.part] || '',
							courses: [],
							totalCredits: 0,
							totalCreditPoints: 0,
							partGPA: 0,
							creditsEarned: 0
						}
					}
					partGroups[course.part].courses.push(course)
					partGroups[course.part].totalCredits += course.credits
					partGroups[course.part].totalCreditPoints += course.creditPoints
					if (course.isPassing) {
						partGroups[course.part].creditsEarned += course.credits
					}
				})

				// Calculate part-wise GPA
				Object.values(partGroups).forEach(part => {
					part.partGPA = part.totalCredits > 0
						? Math.round((part.totalCreditPoints / part.totalCredits) * 100) / 100
						: 0
				})

				// Sort parts by order
				const sortedParts = Object.values(partGroups).sort((a, b) =>
					getPartOrder(a.partName) - getPartOrder(b.partName)
				)

				// Calculate GPA
				const totalCredits = student.courses.reduce((sum: number, c: any) => sum + c.credits, 0)
				const totalCreditPoints = student.courses.reduce((sum: number, c: any) => sum + c.creditPoints, 0)
				const semesterGPA = totalCredits > 0
					? Math.round((totalCreditPoints / totalCredits) * 100) / 100
					: 0

				const creditsEarned = student.courses
					.filter((c: any) => c.isPassing)
					.reduce((sum: number, c: any) => sum + c.credits, 0)

				const hasFailures = student.courses.some((c: any) => !c.isPassing)

				return {
					student: {
						id: student.studentId,
						name: student.studentName,
						registerNo: student.registerNo,
						dateOfBirth: dobMap[student.registerNo] || null
					},
					semester: parseInt(semester || '1'),
					session: {
						id: sessionId,
						name: '',
						monthYear: ''
					},
					program: {
						code: programCode || '',
						name: programCode || ''
					},
					courses: student.courses,
					partBreakdown: sortedParts,
					summary: {
						totalCourses: student.courses.length,
						totalCredits,
						creditsEarned,
						totalCreditPoints: Math.round(totalCreditPoints * 100) / 100,
						semesterGPA,
						passedCount: student.courses.filter((c: any) => c.isPassing).length,
						failedCount: student.courses.filter((c: any) => !c.isPassing).length,
						overallResult: hasFailures ? 'RA' : 'PASS'
					}
				}
			})

			// Sort by register number
			marksheets.sort((a, b) => a.student.registerNo.localeCompare(b.student.registerNo))

			return NextResponse.json({
				marksheets,
				total: marksheets.length
			})
		}

		// Get programs for dropdown
		if (action === 'programs') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')

			if (!institutionId) {
				return NextResponse.json({ error: 'institutionId is required' }, { status: 400 })
			}

			// Fetch programs from semester_results table (only programs with actual results)
			let query = supabase
				.from('semester_results')
				.select('program_code, program_name')
				.eq('institutions_id', institutionId)
				.eq('is_active', true)

			if (sessionId) {
				query = query.eq('examination_session_id', sessionId)
			}

			const { data, error } = await query

			if (error) throw error

			// Deduplicate by program_code and extract code + name
			const programMap = new Map<string, string>()
			data?.forEach(d => {
				if (d.program_code && !programMap.has(d.program_code)) {
					programMap.set(d.program_code, d.program_name || d.program_code)
				}
			})

			// Convert to array and sort by program code
			const programs = Array.from(programMap.entries())
				.map(([code, name]) => ({
					program_code: code,
					program_name: name
				}))
				.sort((a, b) => a.program_code.localeCompare(b.program_code))

			return NextResponse.json({ programs })
		}

		// Get semesters for dropdown
		if (action === 'semesters') {
			const institutionId = searchParams.get('institutionId')
			const programCode = searchParams.get('programCode')
			const sessionId = searchParams.get('sessionId')

			if (!institutionId) {
				return NextResponse.json({ error: 'institutionId is required' }, { status: 400 })
			}

			let query = supabase
				.from('semester_results')
				.select('semester')
				.eq('institutions_id', institutionId)
				.eq('is_active', true)

			if (programCode) {
				query = query.eq('program_code', programCode)
			}

			if (sessionId) {
				query = query.eq('examination_session_id', sessionId)
			}

			const { data, error } = await query

			if (error) throw error

			const semesters = [...new Set(data?.map(d => d.semester))].sort((a, b) => a - b)

			return NextResponse.json({ semesters })
		}

		// Get students for dropdown
		if (action === 'students') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')
			const programCode = searchParams.get('programCode')
			const semester = searchParams.get('semester')

			if (!institutionId || !sessionId) {
				return NextResponse.json({ error: 'institutionId and sessionId are required' }, { status: 400 })
			}

			// Use semester_results_detailed_view which has student_name pre-joined
			let query = supabase
				.from('semester_results_detailed_view')
				.select('student_id, register_number, student_name')
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('is_active', true)

			if (programCode) {
				query = query.eq('program_code', programCode)
			}

			if (semester) {
				query = query.eq('semester', parseInt(semester))
			}

			const { data, error } = await query.order('register_number')

			if (error) throw error

			// Deduplicate by student_id
			const studentMap = new Map()
			data?.forEach(s => {
				if (!studentMap.has(s.student_id)) {
					studentMap.set(s.student_id, {
						id: s.student_id,
						registerNo: s.register_number,
						name: s.student_name
					})
				}
			})

			return NextResponse.json({ students: Array.from(studentMap.values()) })
		}

		return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

	} catch (error) {
		console.error('Semester marksheet API error:', error)
		return NextResponse.json({
			error: error instanceof Error ? error.message : 'Failed to process request'
		}, { status: 500 })
	}
}
