import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: Fetch attendance data for bundle cover generation
export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)

		const institutionId = searchParams.get('institution_id')
		const sessionId = searchParams.get('session_id')
		const programCode = searchParams.get('program_code') // Optional
		const examDate = searchParams.get('exam_date')
		const sessionType = searchParams.get('session') // FN or AN
		const courseCode = searchParams.get('course_code') // Optional

		// Validate required parameters
		if (!institutionId || !sessionId || !examDate || !sessionType) {
			return NextResponse.json(
				{
					error: 'Missing required parameters: institution_id, session_id, exam_date, session'
				},
				{ status: 400 }
			)
		}

		console.log('Fetching bundle cover data with params:', {
			institutionId,
			sessionId,
			programCode,
			examDate,
			sessionType,
			courseCode
		})

		// Get session details
		const { data: session, error: sessionError } = await supabase
			.from('examination_sessions')
			.select('session_name, session_code')
			.eq('id', sessionId)
			.single()

		if (sessionError || !session) {
			return NextResponse.json(
				{ error: 'Session not found' },
				{ status: 404 }
			)
		}

		// Get program details (optional)
		let program = null
		if (programCode) {
			const { data: programData, error: programError } = await supabase
				.from('programs')
				.select('program_code, program_name')
				.eq('program_code', programCode)
				.single()

			if (programError || !programData) {
				return NextResponse.json(
					{ error: 'Program not found' },
					{ status: 404 }
				)
			}
			program = programData
		}

		// Get course details (optional)
		let course = null
		if (courseCode) {
			const { data: courseData, error: courseError } = await supabase
				.from('courses')
				.select('course_code, course_name')
				.eq('course_code', courseCode)
				.single()

			if (courseError || !courseData) {
				return NextResponse.json(
					{ error: 'Course not found' },
					{ status: 404 }
				)
			}
			course = courseData
		}

		// Build the attendance query
		let query = supabase
			.from('exam_attendance')
			.select(`
				exam_registration_id,
				student_id,
				attendance_status,
				remarks,
				exam_registrations!inner (
					stu_register_no,
					student_name,
					is_regular,
					course_offerings!inner (
						course_id,
						program_id,
						examination_session_id,
						courses!inner (
							course_code,
							course_name
						),
						programs!inner (
							program_code,
							program_name
						)
					)
				),
				exam_timetables!inner (
					exam_date,
					session
				)
			`)
			.eq('exam_registrations.course_offerings.examination_session_id', sessionId)
			.eq('exam_timetables.exam_date', examDate)
			.eq('exam_timetables.session', sessionType)
			.in('attendance_status', ['Present', 'Absent'])

		// Apply optional filters
		if (programCode) {
			query = query.eq('exam_registrations.course_offerings.programs.program_code', programCode)
		}

		if (courseCode) {
			query = query.eq('exam_registrations.course_offerings.courses.course_code', courseCode)
		}

		// Execute query
		const { data: attendanceData, error: attendanceError } = await query

		if (attendanceError) {
			console.error('Error fetching attendance data:', attendanceError)
			return NextResponse.json(
				{ error: 'Failed to fetch attendance data', details: attendanceError.message },
				{ status: 500 }
			)
		}

		// Format exam date (DD-MM-YYYY)
		const formattedDate = new Date(examDate).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		})

		// Group attendance data by subject code (course_code)
		const groupedBySubject: Record<string, any[]> = {}

		attendanceData.forEach((record: any) => {
			const courseCode = record.exam_registrations.course_offerings.courses.course_code
			const courseName = record.exam_registrations.course_offerings.courses.course_name
			const programCode = record.exam_registrations.course_offerings.programs.program_code
			const programName = record.exam_registrations.course_offerings.programs.program_name

			if (!groupedBySubject[courseCode]) {
				groupedBySubject[courseCode] = []
			}

			groupedBySubject[courseCode].push({
				register_number: record.exam_registrations.stu_register_no,
				attendance: record.attendance_status.toUpperCase(),
				is_regular: record.exam_registrations.is_regular,
				course_code: courseCode,
				course_name: courseName,
				program_code: programCode,
				program_name: programName
			})
		})

		// Create bundle data for each subject
		const bundleDataList = Object.keys(groupedBySubject).map((courseCode) => {
			const subjectStudents = groupedBySubject[courseCode]

			// Sort students: regular first, then by register number
			const sortedStudents = subjectStudents.sort((a, b) => {
				if (a.is_regular !== b.is_regular) {
					return a.is_regular ? -1 : 1
				}
				return a.register_number.localeCompare(b.register_number)
			})

			// Get course and program info from first student
			const firstStudent = sortedStudents[0]

			return {
				program_code: program?.program_code || firstStudent.program_code,
				program_name: program?.program_name || firstStudent.program_name,
				subject_code: course?.course_code || firstStudent.course_code,
				subject_name: course?.course_name || firstStudent.course_name,
				exam_date: formattedDate,
				session: sessionType,
				session_name: session.session_name,
				session_code: session.session_code,
				students: sortedStudents.map(s => ({
					register_number: s.register_number,
					attendance: s.attendance,
					is_regular: s.is_regular
				}))
			}
		})

		console.log('Bundle cover data generated:', {
			total_subjects: bundleDataList.length,
			subjects: bundleDataList.map(b => ({
				subject_code: b.subject_code,
				total_students: b.students.length,
				present: b.students.filter((s: any) => s.attendance === 'PRESENT').length,
				absent: b.students.filter((s: any) => s.attendance === 'ABSENT').length
			}))
		})

		return NextResponse.json({ bundles: bundleDataList })

	} catch (error) {
		console.error('Bundle cover API error:', error)
		const errorMessage = error instanceof Error ? error.message : 'Internal server error'
		return NextResponse.json(
			{ error: 'Failed to generate bundle cover data', details: errorMessage },
			{ status: 500 }
		)
	}
}
