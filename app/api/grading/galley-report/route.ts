import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
	const supabase = getSupabaseServer()
	const searchParams = request.nextUrl.searchParams

	const type = searchParams.get('type')
	const institutionId = searchParams.get('institution_id')
	const sessionId = searchParams.get('session_id')
	const programId = searchParams.get('program_id')
	const semester = searchParams.get('semester')

	try {
		// Dropdown: Get institutions
		if (type === 'institutions') {
			const { data, error } = await supabase
				.from('institutions')
				.select('id, institution_code, name')
				.eq('is_active', true)
				.order('name')

			if (error) throw error
			// Map to expected format
			const mapped = (data || []).map(inst => ({
				id: inst.id,
				institution_code: inst.institution_code,
				institution_name: inst.name
			}))
			return NextResponse.json(mapped)
		}

		// Dropdown: Get examination sessions for institution
		if (type === 'sessions') {
			if (!institutionId) {
				return NextResponse.json({ error: 'institution_id is required' }, { status: 400 })
			}

			const { data, error } = await supabase
				.from('examination_sessions')
				.select('id, session_name, session_code, semester_type, exam_start_date, exam_end_date')
				.eq('institutions_id', institutionId)
				.order('exam_start_date', { ascending: false })

			if (error) throw error
			// Map to expected format
			const mapped = (data || []).map(session => ({
				id: session.id,
				session_name: session.session_name,
				session_code: session.session_code,
				session_type: session.semester_type,
				start_date: session.exam_start_date,
				end_date: session.exam_end_date
			}))
			return NextResponse.json(mapped)
		}

		// Dropdown: Get programs that have final marks for a session
		if (type === 'programs') {
			if (!institutionId || !sessionId) {
				return NextResponse.json({ error: 'institution_id and session_id are required' }, { status: 400 })
			}

			// Get programs that have final marks in this session
			const { data, error } = await supabase
				.from('final_marks')
				.select(`
					program_id,
					programs:program_id (
						id,
						program_code,
						program_name,
						display_name
					)
				`)
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('is_active', true)

			if (error) throw error

			// Get unique programs
			const uniquePrograms = new Map()
			data?.forEach((item: any) => {
				if (item.programs && !uniquePrograms.has(item.programs.id)) {
					uniquePrograms.set(item.programs.id, item.programs)
				}
			})

			const programs = Array.from(uniquePrograms.values()).sort((a, b) =>
				a.program_name.localeCompare(b.program_name)
			)

			return NextResponse.json(programs)
		}

		// Dropdown: Get semesters for a program in a session
		if (type === 'semesters') {
			if (!institutionId || !sessionId || !programId) {
				return NextResponse.json({ error: 'institution_id, session_id, and program_id are required' }, { status: 400 })
			}

			// Get unique semesters from semester_results
			const { data, error } = await supabase
				.from('semester_results')
				.select('semester')
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('program_id', programId)
				.eq('is_active', true)

			if (error) throw error

			// Get unique semesters
			const semesterSet = new Set<number>(data?.map(item => item.semester) || [])
			const uniqueSemesters = Array.from(semesterSet)
				.sort((a, b) => a - b)
				.map(sem => ({ semester: sem, label: `Semester ${sem}` }))

			return NextResponse.json(uniqueSemesters)
		}

		// Main Report: Get galley report data
		if (!institutionId || !sessionId || !programId || !semester) {
			return NextResponse.json({
				error: 'institution_id, session_id, program_id, and semester are required for report generation'
			}, { status: 400 })
		}

		// Fetch institution details (only basic fields needed for header)
		const { data: institutionRaw, error: instError } = await supabase
			.from('institutions')
			.select('id, institution_code, name')
			.eq('id', institutionId)
			.single()

		if (instError) throw instError

		// Map to expected format
		const institution = institutionRaw ? {
			id: institutionRaw.id,
			institution_code: institutionRaw.institution_code,
			institution_name: institutionRaw.name
		} : null

		// Fetch session details
		const { data: sessionRaw, error: sessError } = await supabase
			.from('examination_sessions')
			.select('id, session_name, session_code, semester_type, exam_start_date, exam_end_date')
			.eq('id', sessionId)
			.single()

		if (sessError) throw sessError

		// Map to expected format
		const session = sessionRaw ? {
			id: sessionRaw.id,
			session_name: sessionRaw.session_name,
			session_code: sessionRaw.session_code,
			session_type: sessionRaw.semester_type,
			start_date: sessionRaw.exam_start_date,
			end_date: sessionRaw.exam_end_date
		} : null

		// Fetch program details
		const { data: program, error: progError } = await supabase
			.from('programs')
			.select(`
				id,
				program_code,
				program_name,
				display_name,
				degrees:degree_id (degree_code, degree_name)
			`)
			.eq('id', programId)
			.single()

		if (progError) throw progError

		// Fetch final marks with direct query and joins
		// Note: We use exam_registrations for student info since users table FK is not in schema cache
		const { data: finalMarksRaw, error: marksError } = await supabase
			.from('final_marks')
			.select(`
				id,
				internal_marks_obtained,
				internal_marks_maximum,
				external_marks_obtained,
				external_marks_maximum,
				total_marks_obtained,
				total_marks_maximum,
				percentage,
				letter_grade,
				grade_points,
				is_pass,
				pass_status,
				result_status,
				student_id,
				course_id,
				course_offering_id,
				exam_registrations:exam_registration_id (
					id,
					stu_register_no,
					student_name
				),
				courses:course_id (
					id,
					course_code,
					course_name,
					credit
				),
				course_offerings:course_offering_id (
					semester,
					course_id
				)
			`)
			.eq('institutions_id', institutionId)
			.eq('examination_session_id', sessionId)
			.eq('program_id', programId)
			.eq('is_active', true)

		if (marksError) throw marksError

		// Get unique course_mapping IDs (course_offerings.course_id references course_mapping.id)
		const courseMappingIds = [...new Set(
			(finalMarksRaw || [])
				.map((m: any) => m.course_offerings?.course_id)
				.filter(Boolean)
		)]

		// Fetch course_order from course_mapping table
		let courseMappingMap = new Map<string, number>()
		if (courseMappingIds.length > 0) {
			const { data: courseMappings, error: cmError } = await supabase
				.from('course_mapping')
				.select('id, course_order')
				.in('id', courseMappingIds)

			if (!cmError && courseMappings) {
				courseMappings.forEach((cm: any) => {
					courseMappingMap.set(cm.id, cm.course_order || 999)
				})
			}
		}

		// Filter by semester (from course_offerings) and transform data
		const semesterNum = parseInt(semester)
		const filteredMarks = (finalMarksRaw || [])
			.filter((mark: any) => mark.course_offerings?.semester === semesterNum)
			.map((mark: any) => {
				// Get student name from exam_registrations
				const studentName = mark.exam_registrations?.student_name || ''
				const nameParts = studentName.split(' ')

				// Get course_order from course_mapping via course_offerings.course_id
				const courseMappingId = mark.course_offerings?.course_id
				const courseOrder = courseMappingId ? courseMappingMap.get(courseMappingId) : null

				return {
					id: mark.id,
					internal_marks_obtained: mark.internal_marks_obtained,
					internal_marks_maximum: mark.internal_marks_maximum,
					external_marks_obtained: mark.external_marks_obtained,
					external_marks_maximum: mark.external_marks_maximum,
					total_marks_obtained: mark.total_marks_obtained,
					total_marks_maximum: mark.total_marks_maximum,
					percentage: mark.percentage,
					letter_grade: mark.letter_grade,
					grade_points: mark.grade_points,
					is_pass: mark.is_pass,
					pass_status: mark.pass_status,
					result_status: mark.result_status,
					students: {
						id: mark.student_id,
						first_name: nameParts[0] || '',
						last_name: nameParts.slice(1).join(' ') || '',
						register_number: mark.exam_registrations?.stu_register_no || '',
						roll_number: mark.exam_registrations?.stu_register_no || ''
					},
					courses: {
						id: mark.courses?.id || mark.course_id,
						course_code: mark.courses?.course_code || '',
						course_name: mark.courses?.course_name || '',
						display_code: mark.courses?.course_code || '',
						credit: mark.courses?.credit || 0,
						internal_max_mark: mark.internal_marks_maximum,
						external_max_mark: mark.external_marks_maximum,
						total_max_mark: mark.total_marks_maximum,
						course_category: null,
						course_type: null,
						course_order: courseOrder
					}
				}
			})

		// Fetch semester results for the students (no need for students join - we get it from final_marks)
		const { data: semesterResults, error: semResultsError } = await supabase
			.from('semester_results')
			.select(`
				id,
				student_id,
				semester,
				sgpa,
				cgpa,
				percentage,
				total_credits_registered,
				total_credits_earned,
				result_status,
				result_class,
				is_distinction,
				is_first_class,
				total_backlogs
			`)
			.eq('institutions_id', institutionId)
			.eq('examination_session_id', sessionId)
			.eq('program_id', programId)
			.eq('semester', parseInt(semester))
			.eq('is_active', true)

		if (semResultsError) throw semResultsError

		// Group marks by student
		const studentMarksMap = new Map()
		filteredMarks.forEach((mark: any) => {
			const studentId = mark.students?.id
			if (!studentId) return

			if (!studentMarksMap.has(studentId)) {
				studentMarksMap.set(studentId, {
					student: mark.students,
					courses: []
				})
			}
			studentMarksMap.get(studentId).courses.push({
				course: mark.courses,
				internal_marks: mark.internal_marks_obtained,
				internal_max: mark.internal_marks_maximum,
				external_marks: mark.external_marks_obtained,
				external_max: mark.external_marks_maximum,
				total_marks: mark.total_marks_obtained,
				total_max: mark.total_marks_maximum,
				percentage: mark.percentage,
				letter_grade: mark.letter_grade,
				grade_points: mark.grade_points,
				is_pass: mark.is_pass,
				pass_status: mark.pass_status,
				result_status: mark.result_status
			})
		})

		// Merge with semester results
		const students = Array.from(studentMarksMap.values()).map((studentData: any) => {
			const semResult = semesterResults?.find((sr: any) => sr.student_id === studentData.student.id)
			return {
				...studentData,
				semester_result: semResult ? {
					sgpa: semResult.sgpa,
					cgpa: semResult.cgpa,
					percentage: semResult.percentage,
					total_credits_registered: semResult.total_credits_registered,
					total_credits_earned: semResult.total_credits_earned,
					result_status: semResult.result_status,
					result_class: semResult.result_class,
					is_distinction: semResult.is_distinction,
					is_first_class: semResult.is_first_class,
					total_backlogs: semResult.total_backlogs
				} : null
			}
		}).sort((a, b) => {
			// Sort by register number
			const regA = a.student.register_number || ''
			const regB = b.student.register_number || ''
			return regA.localeCompare(regB)
		})

		// Get unique courses for the course-wise analysis
		const coursesMap = new Map()
		filteredMarks.forEach((mark: any) => {
			if (!mark.courses) return
			const courseId = mark.courses.id

			if (!coursesMap.has(courseId)) {
				coursesMap.set(courseId, {
					course: mark.courses,
					registered: 0,
					appeared: 0,
					absent: 0,
					passed: 0,
					failed: 0,
					reappear: 0,
					total_internal: 0,
					total_external: 0,
					total_marks: 0,
					grades: {} as Record<string, number>
				})
			}

			const courseData = coursesMap.get(courseId)
			courseData.registered++

			// Check for absent: pass_status = 'Absent' OR letter_grade = 'AAA' OR external marks is null/0 with no appearance
			const isAbsent = mark.pass_status === 'Absent' ||
				mark.pass_status === 'AAA' ||
				mark.letter_grade === 'AAA' ||
				(mark.external_marks_obtained === null && mark.internal_marks_obtained !== null)

			if (isAbsent) {
				courseData.absent++
			} else {
				courseData.appeared++
				courseData.total_internal += mark.internal_marks_obtained || 0
				courseData.total_external += mark.external_marks_obtained || 0
				courseData.total_marks += mark.total_marks_obtained || 0

				if (mark.is_pass) {
					courseData.passed++
				} else if (mark.pass_status === 'Reappear' || mark.pass_status === 'RA' || mark.letter_grade === 'U') {
					// Failed students who need to reappear
					courseData.reappear++
				} else {
					courseData.failed++
				}
			}

			// Track grade distribution
			if (mark.letter_grade) {
				courseData.grades[mark.letter_grade] = (courseData.grades[mark.letter_grade] || 0) + 1
			}
		})

		const courseAnalysis = Array.from(coursesMap.values()).map((courseData: any) => ({
			...courseData,
			pass_percentage: courseData.appeared > 0
				? ((courseData.passed / courseData.appeared) * 100).toFixed(2)
				: '0.00'
		})).sort((a, b) => a.course.course_code.localeCompare(b.course.course_code))

		// Calculate overall statistics
		const totalStudents = students.length
		const totalPassed = students.filter((s: any) =>
			s.semester_result?.result_status === 'Pass'
		).length
		const totalFailed = students.filter((s: any) =>
			s.semester_result?.result_status === 'Fail'
		).length
		const totalWithBacklogs = students.filter((s: any) =>
			(s.semester_result?.total_backlogs || 0) > 0
		).length

		// Grade distribution across all courses
		const overallGrades: Record<string, number> = {}
		filteredMarks.forEach((mark: any) => {
			if (mark.letter_grade) {
				overallGrades[mark.letter_grade] = (overallGrades[mark.letter_grade] || 0) + 1
			}
		})

		// Calculate top performers
		const topPerformers = students
			.filter((s: any) => s.semester_result?.cgpa)
			.sort((a: any, b: any) => (b.semester_result?.cgpa || 0) - (a.semester_result?.cgpa || 0))
			.slice(0, 10)

		// Calculate highest marks
		const studentTotalMarks = students.map((s: any) => ({
			student: s.student,
			total_marks: s.courses.reduce((sum: number, c: any) => sum + (c.total_marks || 0), 0),
			total_max: s.courses.reduce((sum: number, c: any) => sum + (c.total_max || 0), 0)
		})).sort((a, b) => b.total_marks - a.total_marks)

		const highestScorer = studentTotalMarks[0] || null

		const response = {
			institution,
			session,
			program,
			semester: parseInt(semester),
			batch: session?.session_code ? `${new Date(session.start_date).getFullYear()}-${new Date(session.start_date).getFullYear() + 3}` : '',
			students,
			courseAnalysis,
			statistics: {
				total_students: totalStudents,
				total_passed: totalPassed,
				total_failed: totalFailed,
				total_with_backlogs: totalWithBacklogs,
				pass_percentage: totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(2) : '0.00',
				grade_distribution: overallGrades,
				top_performers: topPerformers.map((s: any) => ({
					register_number: s.student.register_number,
					name: `${s.student.first_name} ${s.student.last_name || ''}`.trim(),
					cgpa: s.semester_result?.cgpa,
					sgpa: s.semester_result?.sgpa
				})),
				highest_scorer: highestScorer ? {
					register_number: highestScorer.student.register_number,
					name: `${highestScorer.student.first_name} ${highestScorer.student.last_name || ''}`.trim(),
					total_marks: highestScorer.total_marks,
					total_max: highestScorer.total_max
				} : null
			}
		}

		return NextResponse.json(response)

	} catch (error) {
		console.error('Galley Report API Error:', error)
		return NextResponse.json({
			error: error instanceof Error ? error.message : 'Failed to fetch galley report data'
		}, { status: 500 })
	}
}
