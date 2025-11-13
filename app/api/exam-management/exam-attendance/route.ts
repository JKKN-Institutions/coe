import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { getISTDate } from '@/lib/utils/date-utils'

// GET: Fetch exam attendance records or student list
export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const mode = searchParams.get('mode') // 'check' or 'list'
		const institution_id = searchParams.get('institution_id')
		const examination_session_id = searchParams.get('examination_session_id')
		const course_code = searchParams.get('course_code')
		const exam_date = searchParams.get('exam_date')
		const program_code = searchParams.get('program_code')
		const session = searchParams.get('session')

		// MODE: Check if attendance already exists
		if (mode === 'check' && institution_id && examination_session_id && course_code && exam_date && session && program_code) {
			console.log('Checking attendance with params:', { institution_id, examination_session_id, course_code, exam_date, session, program_code })

			// Step 1: Get course_id from course_code
			const { data: courseData, error: courseError } = await supabase
				.from('courses')
				.select('id')
				.eq('course_code', course_code)
				.single()

			if (courseError || !courseData) {
				console.error('Course not found:', courseError)
				return NextResponse.json({ error: 'Course not found', details: courseError }, { status: 404 })
			}

			const courseId = courseData.id

			// Step 2: Get exam_timetable_id (program is validated via exam_registrations)
			const { data: timetableData, error: timetableError } = await supabase
				.from('exam_timetables')
				.select('id')
				.eq('institutions_id', institution_id)
				.eq('examination_session_id', examination_session_id)
				.eq('course_id', courseId)
				.eq('exam_date', exam_date)
				.eq('session', session)
				.eq('is_published', true)
				.maybeSingle()

			if (timetableError) {
				console.error('Error finding exam timetable:', timetableError)
				return NextResponse.json({ error: 'Failed to find exam timetable', details: timetableError }, { status: 500 })
			}

			if (!timetableData) {
				console.log('No exam timetable found')
				return NextResponse.json({ exists: false, data: [] })
			}

			const timetableId = timetableData.id
			console.log('Found exam timetable:', timetableId)

			// Step 2b: Get program_id from program_code
			const { data: programData, error: programError } = await supabase
				.from('programs')
				.select('id')
				.eq('program_code', program_code)
				.single()

			if (programError || !programData) {
				console.error('Program not found:', programError)
				return NextResponse.json({ exists: false, data: [] })
			}

			const programId = programData.id

			// Step 3: Check if attendance records exist for this program
			const { data: attendanceRecords, error: attendanceError } = await supabase
				.from('exam_attendance')
				.select(`
					*,
					exam_registrations!inner(
						stu_register_no,
						student_name,
						attempt_number,
						is_regular
					)
				`)
				.eq('exam_timetable_id', timetableId)
				.eq('program_id', programId)
				.order('exam_registrations(stu_register_no)', { ascending: true })

			if (attendanceError) {
				console.error('Error checking existing attendance:', attendanceError)
				return NextResponse.json({ error: 'Failed to check attendance', details: attendanceError }, { status: 500 })
			}

			console.log('Attendance records found:', attendanceRecords?.length || 0)

			// Map to flatten the nested structure
			const mappedRecords = (attendanceRecords || []).map((att: any) => ({
				...att,
				stu_register_no: att.exam_registrations.stu_register_no,
				student_name: att.exam_registrations.student_name,
				attempt_number: att.exam_registrations.attempt_number
			}))

			return NextResponse.json({
				exists: (attendanceRecords && attendanceRecords.length > 0),
				data: mappedRecords
			})
		}

		// MODE: List students for attendance entry
		if (mode === 'list' && institution_id && examination_session_id && course_code && exam_date && session && program_code) {
			console.log('Fetching student list with params:', { institution_id, examination_session_id, course_code, exam_date, session, program_code })

			// Step 1: Get course_id from course_code
			const { data: courseData, error: courseError } = await supabase
				.from('courses')
				.select('id')
				.eq('course_code', course_code)
				.single()

			if (courseError || !courseData) {
				console.error('Course not found:', courseError)
				return NextResponse.json({ error: 'Course not found', details: courseError }, { status: 404 })
			}

			const courseId = courseData.id
			console.log('Course ID found:', courseId)

			// Step 2: Get program_id from program_code
			const { data: programData, error: programError } = await supabase
				.from('programs')
				.select('id')
				.eq('program_code', program_code)
				.single()

			if (programError || !programData) {
				console.error('Program not found:', programError)
				return NextResponse.json({ error: 'Program not found. Please verify the program code.', details: programError }, { status: 404 })
			}

			const programId = programData.id
			console.log('Program ID found:', programId)

			// Step 3: Get exam_timetable_id (without program filter - program validated via exam_registrations)
			const { data: timetableData, error: timetableError } = await supabase
				.from('exam_timetables')
				.select('id')
				.eq('institutions_id', institution_id)
				.eq('examination_session_id', examination_session_id)
				.eq('course_id', courseId)
				.eq('exam_date', exam_date)
				.eq('session', session)
				.eq('is_published', true)
				.maybeSingle()

			if (timetableError) {
				console.error('Error checking exam timetable:', timetableError)
				return NextResponse.json({ error: 'Failed to verify exam schedule', details: timetableError }, { status: 500 })
			}

			if (!timetableData) {
				console.log('No published exam timetable found for these criteria')
				return NextResponse.json({ error: 'No exam scheduled for this course on the selected date and session', details: 'Check exam timetable settings' }, { status: 404 })
			}

			const timetableId = timetableData.id
			console.log('Exam timetable verified:', timetableId)

			// Step 3: Check if attendance already exists (join with exam_registrations)
			const { data: existingAttendance, error: checkAttendanceError } = await supabase
				.from('exam_attendance')
				.select(`
					*,
					exam_registrations!inner(
						stu_register_no,
						student_name,
						attempt_number,
						is_regular
					)
				`)
				.eq('exam_timetable_id', timetableId)
				.eq('program_id', programId)
				.order('exam_registrations(stu_register_no)', { ascending: true })

			if (checkAttendanceError) {
				console.error('Error checking existing attendance:', checkAttendanceError)
			}

			// If attendance exists, return the existing records
			if (existingAttendance && existingAttendance.length > 0) {
				console.log('Attendance already exists, returning saved records:', existingAttendance.length)

				// Map records to match the expected format
				const mappedRecords = existingAttendance.map((att: any) => ({
					id: att.exam_registration_id,
					student_id: att.student_id,
					stu_register_no: att.exam_registrations.stu_register_no,
					student_name: att.exam_registrations.student_name,
					attempt_number: att.exam_registrations.attempt_number,
					is_regular: att.exam_registrations.is_regular,
					// Include attendance status for viewing
					is_absent: att.is_absent,
					attendance_status: att.attendance_status,
					remarks: att.remarks
				}))

				return NextResponse.json(mappedRecords)
			}

			// Step 4: Get exam registrations for this course with program filter
			const { data: examRegistrations, error: regError } = await supabase
				.from('exam_registrations')
				.select(`
					id,
					student_id,
					stu_register_no,
					student_name,
					attempt_number,
					is_regular,
					course_offerings!inner(
						id,
						course_id,
						examination_session_id,
						programs!inner(
							program_code
						)
					)
				`)
				.eq('institutions_id', institution_id)
				.eq('course_offerings.examination_session_id', examination_session_id)
				.eq('course_offerings.course_id', courseId)
				.eq('course_offerings.programs.program_code', program_code)
				.order('stu_register_no', { ascending: true })

			if (regError) {
				console.error('Error fetching exam registrations:', regError)
				return NextResponse.json({ error: 'Failed to fetch students', details: regError }, { status: 500 })
			}

			console.log('Exam registrations found:', examRegistrations?.length)

			if (!examRegistrations || examRegistrations.length === 0) {
				return NextResponse.json({ error: 'No students registered for this course', details: 'Check student course registrations' }, { status: 404 })
			}

			// Return cleaned data (remove nested objects)
			const cleanedData = examRegistrations.map((reg: any) => ({
				id: reg.id,
				student_id: reg.student_id,
				stu_register_no: reg.stu_register_no,
				student_name: reg.student_name,
				attempt_number: reg.attempt_number,
				is_regular: reg.is_regular
			}))

			return NextResponse.json(cleanedData)
		}

		return NextResponse.json({ error: 'Invalid request. Please specify mode=check or mode=list' }, { status: 400 })
	} catch (e) {
		console.error('Exam attendance GET error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// POST: Save exam attendance records
export async function POST(request: Request) {
	try {
		const body = await request.json()
		const supabase = getSupabaseServer()

		// Validate required fields
		if (!body.institutions_id || !body.exam_session_code || !body.course_code || !body.program_code || !body.session_code || !body.exam_date) {
			return NextResponse.json({
				error: 'Required fields: institutions_id, exam_session_code, course_code, program_code, session_code, exam_date'
			}, { status: 400 })
		}

		if (!body.attendance_records || !Array.isArray(body.attendance_records)) {
			return NextResponse.json({
				error: 'attendance_records array is required'
			}, { status: 400 })
		}

		// Step 1: Get course_id from course_code
		const { data: courseData, error: courseError } = await supabase
			.from('courses')
			.select('id')
			.eq('course_code', body.course_code)
			.single()

		if (courseError || !courseData) {
			return NextResponse.json({
				error: 'Course not found. Please verify the course code.'
			}, { status: 400 })
		}

		const courseId = courseData.id

		// Step 2: Get program_id from program_code
		const { data: programData, error: programError } = await supabase
			.from('programs')
			.select('id')
			.eq('program_code', body.program_code)
			.single()

		if (programError || !programData) {
			return NextResponse.json({
				error: 'Program not found. Please verify the program code.'
			}, { status: 400 })
		}

		const programId = programData.id

		// Step 3: Get exam_timetable_id
		const { data: timetableData, error: timetableError } = await supabase
			.from('exam_timetables')
			.select('id')
			.eq('institutions_id', body.institutions_id)
			.eq('examination_session_id', body.exam_session_code)
			.eq('course_id', courseId)
			.eq('exam_date', body.exam_date)
			.eq('session', body.session_code)
			.eq('is_published', true)
			.maybeSingle()

		if (timetableError || !timetableData) {
			return NextResponse.json({
				error: 'Exam timetable not found. Please ensure the exam is scheduled and published.'
			}, { status: 400 })
		}

		const timetableId = timetableData.id

		// Step 4: Check if attendance already exists for this program
		const { data: existingAttendance, error: checkError } = await supabase
			.from('exam_attendance')
			.select('id')
			.eq('exam_timetable_id', timetableId)
			.eq('program_id', programId)
			.limit(1)

		if (checkError) {
			console.error('Error checking existing attendance:', checkError)
			return NextResponse.json({ error: 'Failed to check existing attendance', details: checkError }, { status: 500 })
		}

		if (existingAttendance && existingAttendance.length > 0) {
			return NextResponse.json({
				error: 'Attendance already recorded for this exam session. Cannot modify.'
			}, { status: 400 })
		}

		// Step 5: Prepare attendance records for insertion
		const attendancePayloads = body.attendance_records.map((record: any) => ({
			institutions_id: body.institutions_id,
			examination_session_id: body.exam_session_code,
			program_id: programId,
			course_id: courseId,
			exam_timetable_id: timetableId,
			exam_registration_id: record.exam_registration_id,
			student_id: record.student_id, // Include student_id from attendance records
			is_absent: record.is_absent, // Add is_absent field
			status: !record.is_absent, // Status is true when present, false when absent
			attendance_status: record.is_absent ? 'Absent' : 'Present',
			remarks: record.remarks || null,
			verified_by: body.submitted_by || null,
		}))

		// Step 6: Insert all attendance records
		const { data: insertedData, error: insertError } = await supabase
			.from('exam_attendance')
			.insert(attendancePayloads)
			.select()

		if (insertError) {
			console.error('Error inserting attendance records:', insertError)

			if (insertError.code === '23505') {
				return NextResponse.json({
					error: 'Attendance record already exists for one or more students.'
				}, { status: 400 })
			}

			if (insertError.code === '23503') {
				return NextResponse.json({
					error: 'Invalid reference. Please ensure all IDs exist in their respective tables.'
				}, { status: 400 })
			}

			return NextResponse.json({ error: 'Failed to save attendance records', details: insertError }, { status: 500 })
		}

		const presentCount = body.attendance_records.filter((r: any) => !r.is_absent).length
		const absentCount = body.attendance_records.filter((r: any) => r.is_absent).length
		const totalStudents = body.attendance_records.length

		return NextResponse.json({
			success: true,
			message: `Attendance saved successfully. ${presentCount} present, ${absentCount} absent out of ${totalStudents} students.`,
			records_saved: insertedData.length
		}, { status: 201 })
	} catch (e) {
		console.error('Exam attendance POST error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// PUT: Update exam attendance (if needed in future)
export async function PUT(request: Request) {
	try {
		return NextResponse.json({
			error: 'Attendance records cannot be modified once saved'
		}, { status: 403 })
	} catch (e) {
		console.error('Exam attendance PUT error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
