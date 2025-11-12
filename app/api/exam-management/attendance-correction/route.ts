import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: Search student attendance record by register number and course code
// Uses SQL logic: exam_attendance -> exam_registrations
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

		// Using the SQL join logic: exam_attendance -> exam_registrations
		// WHERE exam_registrations.stu_register_no = ? AND exam_registrations.course_code = ?
		const { data: attendanceRecords, error: attendanceError } = await supabase
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
				updated_by,
				created_at,
				exam_registrations!inner (
					id,
					student_id,
					course_code,
					stu_register_no,
					student_name
				)
			`)
			.eq('exam_registrations.course_code', courseCode.trim())
			.ilike('exam_registrations.stu_register_no', registerNo.trim())
			.order('created_at', { ascending: false })
			.limit(1)

		if (attendanceError) {
			console.error('Error fetching attendance record:', attendanceError)
			return NextResponse.json({
				error: 'Failed to fetch attendance record',
				details: attendanceError.message
			}, { status: 500 })
		}

		if (!attendanceRecords || attendanceRecords.length === 0) {
			return NextResponse.json({
				error: `No attendance record found for student "${registerNo}" in course "${courseCode}".`
			}, { status: 404 })
		}

		const attendanceData = attendanceRecords[0]
		const registrationData = attendanceData.exam_registrations

		// Get course details
		const { data: courseData } = await supabase
			.from('courses')
			.select('course_code, course_name')
			.eq('id', attendanceData.course_id)
			.single()

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
			stu_register_no: registrationData.stu_register_no,
			student_name: registrationData.student_name,
			program_code: programData?.program_code || 'N/A',
			program_name: programData?.program_name || 'N/A',
			course_code: courseData?.course_code || courseCode,
			course_name: courseData?.course_name || 'N/A',
			exam_date: timetableData?.exam_date || null,
			session: timetableData?.session || 'N/A',
			attendance_status: attendanceData.attendance_status,
			remarks: attendanceData.remarks || '',
			updated_by: attendanceData.updated_by || null
		}

		return NextResponse.json({
			student: {
				register_no: registrationData.stu_register_no,
				name: registrationData.student_name
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
				status: body.attendance_status === 'Present', // true if Present, false if Absent
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
