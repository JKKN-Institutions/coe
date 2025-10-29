import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: Search student attendance records
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const registerNo = searchParams.get('register_no')

		if (!registerNo) {
			return NextResponse.json({ error: 'Register number is required' }, { status: 400 })
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

		// Step 2: Get all exam registrations for this student
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
				student: {
					register_no: studentData.register_number,
					name: studentData.student_name
				},
				records: []
			})
		}

		const registrationIds = registrations.map(r => r.id)

		// Step 3: Get all attendance records for these registrations with full details
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
				examination_session_id
			`)
			.in('exam_registration_id', registrationIds)
			.order('created_at', { ascending: false })

		if (attendanceError) {
			console.error('Error fetching attendance records:', attendanceError)
			throw attendanceError
		}

		if (!attendanceData || attendanceData.length === 0) {
			return NextResponse.json({
				student: {
					register_no: studentData.register_number,
					name: studentData.student_name
				},
				records: []
			})
		}

		// Step 4: Get related data for each attendance record
		const enrichedRecords = await Promise.all(
			attendanceData.map(async (attendance) => {
				// Get program details
				const { data: programData } = await supabase
					.from('programs')
					.select('program_code, program_name')
					.eq('id', attendance.program_id)
					.single()

				// Get course details
				const { data: courseData } = await supabase
					.from('courses')
					.select('course_code, course_title')
					.eq('id', attendance.course_id)
					.single()

				// Get exam timetable details
				const { data: timetableData } = await supabase
					.from('exam_timetables')
					.select('exam_date, session')
					.eq('id', attendance.exam_timetable_id)
					.single()

				return {
					id: attendance.id,
					stu_register_no: studentData.register_number,
					student_name: studentData.student_name,
					program_code: programData?.program_code || 'N/A',
					program_name: programData?.program_name || 'N/A',
					course_code: courseData?.course_code || 'N/A',
					course_name: courseData?.course_title || 'N/A',
					exam_date: timetableData?.exam_date || null,
					session: timetableData?.session || 'N/A',
					attendance_status: attendance.attendance_status,
					remarks: attendance.remarks || ''
				}
			})
		)

		return NextResponse.json({
			student: {
				register_no: studentData.register_number,
				name: studentData.student_name
			},
			records: enrichedRecords
		})

	} catch (error) {
		console.error('Error in attendance-correction GET:', error)
		return NextResponse.json({
			error: 'Failed to fetch attendance records'
		}, { status: 500 })
	}
}

// PUT: Update attendance records
export async function PUT(request: NextRequest) {
	try {
		const body = await request.json()

		if (!body.records || !Array.isArray(body.records) || body.records.length === 0) {
			return NextResponse.json({
				error: 'No records provided for update'
			}, { status: 400 })
		}

		const supabase = getSupabaseServer()

		// Update each record
		const updatePromises = body.records.map(async (record: any) => {
			const { error } = await supabase
				.from('exam_attendance')
				.update({
					attendance_status: record.attendance_status,
					status: record.status,
					remarks: record.remarks,
					updated_at: new Date().toISOString()
				})
				.eq('id', record.id)

			if (error) {
				console.error(`Error updating record ${record.id}:`, error)
				throw error
			}

			return { id: record.id, success: true }
		})

		const results = await Promise.all(updatePromises)

		return NextResponse.json({
			message: `Successfully updated ${results.length} attendance record${results.length > 1 ? 's' : ''}`,
			updated_count: results.length
		})

	} catch (error) {
		console.error('Error in attendance-correction PUT:', error)
		return NextResponse.json({
			error: 'Failed to update attendance records'
		}, { status: 500 })
	}
}
