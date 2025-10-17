import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: Fetch exam attendance records or student list for attendance marking
export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const institutionId = searchParams.get('institution_id')
		const examinationSessionId = searchParams.get('examination_session_id')
		const courseOfferingId = searchParams.get('course_offering_id')
		const examDate = searchParams.get('exam_date')
		const mode = searchParams.get('mode') // 'check' or 'list'

		// Mode: Check if attendance already exists
		if (mode === 'check' && institutionId && examinationSessionId && courseOfferingId && examDate) {
			const { data: existingAttendance, error } = await supabase
				.from('exam_attendance')
				.select(`
					id,
					attendance_status,
					remarks,
					exam_registrations!inner(
						id,
						stu_register_no,
						student_name,
						examination_session_id,
						course_offering_id
					)
				`)
				.eq('institutions_id', institutionId)

			if (error) {
				console.error('Error checking attendance:', error)
				return NextResponse.json({ error: 'Failed to check attendance' }, { status: 500 })
			}

			// Filter by session, course, and date match from exam_timetables
			const { data: timetableData } = await supabase
				.from('exam_timetables')
				.select('id')
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', examinationSessionId)
				.eq('course_offering_id', courseOfferingId)
				.eq('exam_date', examDate)
				.single()

			if (!timetableData) {
				return NextResponse.json({ exists: false, data: [] })
			}

			// Filter attendance records that match the session and course
			const filteredAttendance = existingAttendance?.filter((att: any) =>
				att.exam_registrations?.examination_session_id === examinationSessionId &&
				att.exam_registrations?.course_offering_id === courseOfferingId
			) || []

			return NextResponse.json({
				exists: filteredAttendance.length > 0,
				data: filteredAttendance
			})
		}

		// Mode: Get student list for attendance marking
		if (mode === 'list' && institutionId && examinationSessionId && courseOfferingId) {
			const { data: registrations, error } = await supabase
				.from('exam_registrations')
				.select('id, stu_register_no, student_name, student_id')
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', examinationSessionId)
				.eq('course_offering_id', courseOfferingId)
				.eq('registration_status', 'Approved')
				.order('stu_register_no', { ascending: true })

			if (error) {
				console.error('Error fetching registrations:', error)
				return NextResponse.json({ error: 'Failed to fetch student list' }, { status: 500 })
			}

			return NextResponse.json(registrations || [])
		}

		// Default: Fetch all attendance records
		const { data, error } = await supabase
			.from('exam_attendance')
			.select(`
				*,
				institutions:institutions_id(institution_name),
				exam_registrations:exam_registration_id(stu_register_no, student_name)
			`)
			.order('created_at', { ascending: false })

		if (error) {
			console.error('Error fetching attendance:', error)
			return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
		}

		return NextResponse.json(data || [])
	} catch (e) {
		console.error('Exam attendance API error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// POST: Create bulk attendance records
export async function POST(request: Request) {
	try {
		const body = await request.json()
		const {
			institutions_id,
			examination_session_id,
			course_offering_id,
			exam_date,
			attendance_records, // Array of { exam_registration_id, attendance_status, remarks }
			verified_by
		} = body

		// Validate required fields
		if (!institutions_id || !examination_session_id || !course_offering_id || !exam_date || !attendance_records || !Array.isArray(attendance_records)) {
			return NextResponse.json({
				error: 'Missing required fields: institutions_id, examination_session_id, course_offering_id, exam_date, attendance_records'
			}, { status: 400 })
		}

		const supabase = getSupabaseServer()

		// Check if attendance already exists
		const { data: existingCheck } = await supabase
			.from('exam_attendance')
			.select('id, exam_registrations!inner(examination_session_id, course_offering_id)')
			.eq('institutions_id', institutions_id)
			.limit(1)

		if (existingCheck && existingCheck.length > 0) {
			const matchExists = existingCheck.some((rec: any) =>
				rec.exam_registrations?.examination_session_id === examination_session_id &&
				rec.exam_registrations?.course_offering_id === course_offering_id
			)

			if (matchExists) {
				return NextResponse.json({
					error: 'Attendance already recorded for this exam session'
				}, { status: 400 })
			}
		}

		// Prepare bulk insert payload
		const now = new Date()
		const currentTime = now.toTimeString().split(' ')[0] // HH:MM:SS format

		const insertPayload = attendance_records.map((record: any) => ({
			institutions_id,
			exam_registration_id: record.exam_registration_id,
			attendance_status: record.attendance_status,
			entry_time: currentTime,
			verified_by: verified_by || null,
			identity_verified: true,
			remarks: record.remarks || null,
			created_at: now.toISOString(),
			updated_at: now.toISOString()
		}))

		// Bulk insert
		const { data, error } = await supabase
			.from('exam_attendance')
			.insert(insertPayload)
			.select()

		if (error) {
			console.error('Error creating attendance records:', error)

			// Handle duplicate key constraint
			if (error.code === '23505') {
				return NextResponse.json({
					error: 'Attendance already exists for one or more students'
				}, { status: 400 })
			}

			// Handle foreign key constraint
			if (error.code === '23503') {
				return NextResponse.json({
					error: 'Invalid reference. Please ensure institution and registration IDs are valid.'
				}, { status: 400 })
			}

			return NextResponse.json({ error: 'Failed to save attendance records' }, { status: 500 })
		}

		return NextResponse.json({
			success: true,
			count: data?.length || 0,
			message: `Successfully recorded attendance for ${data?.length || 0} students`
		}, { status: 201 })
	} catch (e) {
		console.error('Exam attendance creation error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// PUT: Update attendance records (if needed)
export async function PUT(request: Request) {
	try {
		const body = await request.json()
		const { id, attendance_status, remarks, verified_by } = body

		if (!id) {
			return NextResponse.json({ error: 'Attendance ID is required' }, { status: 400 })
		}

		const supabase = getSupabaseServer()

		const updatePayload: any = {
			updated_at: new Date().toISOString()
		}

		if (attendance_status !== undefined) updatePayload.attendance_status = attendance_status
		if (remarks !== undefined) updatePayload.remarks = remarks
		if (verified_by !== undefined) updatePayload.verified_by = verified_by

		const { data, error } = await supabase
			.from('exam_attendance')
			.update(updatePayload)
			.eq('id', id)
			.select()
			.single()

		if (error) {
			console.error('Error updating attendance:', error)
			return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 })
		}

		return NextResponse.json(data)
	} catch (e) {
		console.error('Exam attendance update error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// DELETE: Delete attendance record
export async function DELETE(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json({ error: 'Attendance ID is required' }, { status: 400 })
		}

		const supabase = getSupabaseServer()

		const { error } = await supabase
			.from('exam_attendance')
			.delete()
			.eq('id', id)

		if (error) {
			console.error('Error deleting attendance:', error)
			return NextResponse.json({ error: 'Failed to delete attendance record' }, { status: 500 })
		}

		return NextResponse.json({ success: true })
	} catch (e) {
		console.error('Exam attendance deletion error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
