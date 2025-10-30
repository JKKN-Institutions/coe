import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: Search student attendance record by register number and course code
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const registerNo = searchParams.get('register_no')
		const courseCode = searchParams.get('course_code')

		if (!registerNo) {
			return NextResponse.json({ error: 'Register number is required' }, { status: 400 })
		}

		if (!courseCode) {
			return NextResponse.json({ error: 'Course code is required' }, { status: 400 })
		}

		const supabase = getSupabaseServer()

		// Step 1: Find student by register number (case-insensitive search)
		const { data: studentData, error: studentError } = await supabase
			.from('students')
			.select('id, register_number, student_name')
			.ilike('register_number', registerNo.trim())
			.single()

		if (studentError) {
			console.error('Error fetching student:', studentError)

			// Check if it's a "no rows" error
			if (studentError.code === 'PGRST116') {
				return NextResponse.json({
					error: `Student with register number "${registerNo}" not found. Please verify the register number is correct.`
				}, { status: 404 })
			}

			return NextResponse.json({
				error: `Error searching for student: ${studentError.message}`
			}, { status: 500 })
		}

		if (!studentData) {
			return NextResponse.json({
				error: `Student with register number "${registerNo}" not found. Please verify the register number is correct.`
			}, { status: 404 })
		}

		// Step 2: Find course by course code
		const { data: courseData, error: courseError } = await supabase
			.from('courses')
			.select('id, course_code, course_title')
			.ilike('course_code', courseCode.trim())
			.single()

		if (courseError) {
			console.error('Error fetching course:', courseError)

			if (courseError.code === 'PGRST116') {
				return NextResponse.json({
					error: `Course with code "${courseCode}" not found. Please verify the course code is correct.`
				}, { status: 404 })
			}

			return NextResponse.json({
				error: `Error searching for course: ${courseError.message}`
			}, { status: 500 })
		}

		if (!courseData) {
			return NextResponse.json({
				error: `Course with code "${courseCode}" not found. Please verify the course code is correct.`
			}, { status: 404 })
		}

		// Step 3: Get exam registrations for this student
		const { data: registrations, error: regError } = await supabase
			.from('exam_registrations')
			.select('id')
			.eq('student_id', studentData.id)

		if (regError) {
			console.error('Error fetching exam registrations:', regError)
			throw regError
		}

		if (!registrations || registrations.length === 0) {
			return NextResponse.json({
				error: `No exam registrations found for student "${registerNo}".`
			}, { status: 404 })
		}

		const registrationIds = registrations.map(r => r.id)

		// Step 4: Get the single attendance record matching student and course
		const { data: attendanceData, error: attendanceError } = await supabase
			.from('exam_attendance')
			.select(`
				id,
				exam_registration_id,
				attendance_status,
				status,
				remarks,
				exam_timetable_id,
				program_id,
				course_id,
				examination_session_id,
				updated_by
			`)
			.in('exam_registration_id', registrationIds)
			.eq('course_id', courseData.id)
			.order('created_at', { ascending: false })
			.limit(1)
			.single()

		if (attendanceError) {
			console.error('Error fetching attendance record:', attendanceError)

			if (attendanceError.code === 'PGRST116') {
				return NextResponse.json({
					error: `No attendance record found for student "${registerNo}" in course "${courseCode}".`
				}, { status: 404 })
			}

			throw attendanceError
		}

		if (!attendanceData) {
			return NextResponse.json({
				error: `No attendance record found for student "${registerNo}" in course "${courseCode}".`
			}, { status: 404 })
		}

		// Step 5: Get related data for the attendance record
		// Get program details
		const { data: programData } = await supabase
			.from('programs')
			.select('program_code, program_name')
			.eq('id', attendanceData.program_id)
			.single()

		// Get exam timetable details
		const { data: timetableData } = await supabase
			.from('exam_timetables')
			.select('exam_date, session')
			.eq('id', attendanceData.exam_timetable_id)
			.single()

		const record = {
			id: attendanceData.id,
			stu_register_no: studentData.register_number,
			student_name: studentData.student_name,
			program_code: programData?.program_code || 'N/A',
			program_name: programData?.program_name || 'N/A',
			course_code: courseData.course_code,
			course_name: courseData.course_title,
			exam_date: timetableData?.exam_date || null,
			session: timetableData?.session || 'N/A',
			attendance_status: attendanceData.attendance_status,
			remarks: attendanceData.remarks || '',
			updated_by: attendanceData.updated_by || null
		}

		return NextResponse.json({
			student: {
				register_no: studentData.register_number,
				name: studentData.student_name
			},
			record
		})

	} catch (error) {
		console.error('Error in attendance-correction GET:', error)
		return NextResponse.json({
			error: 'Failed to fetch attendance record'
		}, { status: 500 })
	}
}

// PUT: Update attendance record
export async function PUT(request: NextRequest) {
	try {
		const body = await request.json()

		if (!body.id) {
			return NextResponse.json({
				error: 'Record ID is required'
			}, { status: 400 })
		}

		if (!body.attendance_status) {
			return NextResponse.json({
				error: 'Attendance status is required'
			}, { status: 400 })
		}

		if (!body.remarks || body.remarks.trim() === '') {
			return NextResponse.json({
				error: 'Remarks are required for attendance correction'
			}, { status: 400 })
		}

		if (!body.updated_by) {
			return NextResponse.json({
				error: 'Updated by email is required'
			}, { status: 400 })
		}

		const supabase = getSupabaseServer()

		// Update the attendance record
		const { data, error } = await supabase
			.from('exam_attendance')
			.update({
				attendance_status: body.attendance_status,
				status: body.attendance_status === 'Absent', // true if Absent, false if Present
				remarks: body.remarks.trim(),
				updated_by: body.updated_by,
				updated_at: new Date().toISOString()
			})
			.eq('id', body.id)
			.select()
			.single()

		if (error) {
			console.error('Error updating attendance record:', error)
			throw error
		}

		return NextResponse.json({
			message: 'Attendance record updated successfully',
			data
		})

	} catch (error) {
		console.error('Error in attendance-correction PUT:', error)
		return NextResponse.json({
			error: 'Failed to update attendance record'
		}, { status: 500 })
	}
}
