import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: list exam registrations
export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const institutions_id = searchParams.get('institutions_id')
		const student_id = searchParams.get('student_id')
		const examination_session_id = searchParams.get('examination_session_id')
		const registration_status = searchParams.get('registration_status')

		let query = supabase
			.from('exam_registrations')
			.select(`
				*,
				institution:institutions(id, institution_code, name),
				student:students(id, roll_number, first_name, last_name),
				examination_session:examination_sessions(id, session_name, session_code, exam_start_date, exam_end_date),
				course_offering:course_offerings(id, course_code)
			`)
			.order('created_at', { ascending: false })

		if (institutions_id) {
			query = query.eq('institutions_id', institutions_id)
		}
		if (student_id) {
			query = query.eq('student_id', student_id)
		}
		if (examination_session_id) {
			query = query.eq('examination_session_id', examination_session_id)
		}
		if (registration_status) {
			query = query.eq('registration_status', registration_status)
		}

		const { data, error } = await query

		if (error) {
			console.error('Exam registrations table error:', error)
			return NextResponse.json({ error: 'Failed to fetch exam registrations' }, { status: 500 })
		}

		// Fetch course names from courses table to enrich course_offering data
		const { data: courses, error: coursesError } = await supabase
			.from('courses')
			.select('course_code, course_title')

		if (coursesError) {
			console.error('Courses fetch error:', coursesError)
			// Continue without course names rather than failing completely
		}

		// Create a map for quick lookup
		const courseMap = new Map(
			(courses || []).map((c: any) => [c.course_code, c.course_title])
		)

		// Transform the data to include course_title in course_offering
		const transformedData = (data || []).map((item: any) => ({
			...item,
			course_offering: item.course_offering ? {
				...item.course_offering,
				course_name: courseMap.get(item.course_offering.course_code) || null
			} : null
		}))

		return NextResponse.json(transformedData)
	} catch (e) {
		console.error('Exam registrations API error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// POST: create exam registration
export async function POST(request: Request) {
	try {
		const body = await request.json()
		const supabase = getSupabaseServer()

		// Validate required fields
		if (!body.institutions_id) {
			return NextResponse.json({
				error: 'institutions_id is required'
			}, { status: 400 })
		}
		if (!body.student_id) {
			return NextResponse.json({
				error: 'student_id is required'
			}, { status: 400 })
		}
		if (!body.examination_session_id) {
			return NextResponse.json({
				error: 'examination_session_id is required'
			}, { status: 400 })
		}
		if (!body.course_offering_id) {
			return NextResponse.json({
				error: 'course_offering_id is required'
			}, { status: 400 })
		}

		const insertPayload: any = {
			institutions_id: body.institutions_id,
			student_id: body.student_id,
			examination_session_id: body.examination_session_id,
			course_offering_id: body.course_offering_id,
			stu_register_no: body.stu_register_no ?? null,
			student_name: body.student_name ?? null,
			registration_date: body.registration_date || new Date().toISOString(),
			registration_status: body.registration_status || 'Pending',
			is_regular: body.is_regular ?? true,
			attempt_number: body.attempt_number || 1,
			fee_paid: body.fee_paid ?? false,
			fee_amount: body.fee_amount ?? null,
			payment_date: body.payment_date ?? null,
			payment_transaction_id: body.payment_transaction_id ?? null,
			remarks: body.remarks ?? null,
			approved_by: body.approved_by ?? null,
			approved_date: body.approved_date ?? null,
		}

		const { data, error } = await supabase
			.from('exam_registrations')
			.insert([insertPayload])
			.select(`
				*,
				institution:institutions(id, institution_code, name),
				student:students(id, roll_number, first_name, last_name),
				examination_session:examination_sessions(id, session_name, session_code, exam_start_date, exam_end_date),
				course_offering:course_offerings(id, course_code)
			`)
			.single()

		if (error) {
			console.error('Error creating exam registration:', error)

			// Handle duplicate key constraint violation
			if (error.code === '23505') {
				return NextResponse.json({
					error: 'This exam registration already exists for this student, session, and course.'
				}, { status: 400 })
			}

			// Handle foreign key constraint violation
			if (error.code === '23503') {
				return NextResponse.json({
					error: 'Invalid reference. Please select valid institution, student, session, or course.'
				}, { status: 400 })
			}

			return NextResponse.json({ error: 'Failed to create exam registration' }, { status: 500 })
		}

		// Enrich with course_name
		if (data && data.course_offering && data.course_offering.course_code) {
			const { data: course } = await supabase
				.from('courses')
				.select('course_title')
				.eq('course_code', data.course_offering.course_code)
				.single()

			if (course) {
				data.course_offering.course_name = course.course_title
			}
		}

		return NextResponse.json(data, { status: 201 })
	} catch (e) {
		console.error('Exam registration creation error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// PUT: update exam registration
export async function PUT(request: Request) {
	try {
		const body = await request.json()
		const supabase = getSupabaseServer()

		if (!body.id) {
			return NextResponse.json({
				error: 'Exam registration ID is required'
			}, { status: 400 })
		}

		const updatePayload: any = {
			institutions_id: body.institutions_id,
			student_id: body.student_id,
			examination_session_id: body.examination_session_id,
			course_offering_id: body.course_offering_id,
			stu_register_no: body.stu_register_no ?? null,
			student_name: body.student_name ?? null,
			registration_date: body.registration_date,
			registration_status: body.registration_status,
			is_regular: body.is_regular,
			attempt_number: body.attempt_number,
			fee_paid: body.fee_paid,
			fee_amount: body.fee_amount ?? null,
			payment_date: body.payment_date ?? null,
			payment_transaction_id: body.payment_transaction_id ?? null,
			remarks: body.remarks ?? null,
			approved_by: body.approved_by ?? null,
			approved_date: body.approved_date ?? null,
			updated_at: new Date().toISOString(),
		}

		const { data, error } = await supabase
			.from('exam_registrations')
			.update(updatePayload)
			.eq('id', body.id)
			.select(`
				*,
				institution:institutions(id, institution_code, name),
				student:students(id, roll_number, first_name, last_name),
				examination_session:examination_sessions(id, session_name, session_code, exam_start_date, exam_end_date),
				course_offering:course_offerings(id, course_code)
			`)
			.single()

		if (error) {
			console.error('Error updating exam registration:', error)

			// Handle duplicate key constraint violation
			if (error.code === '23505') {
				return NextResponse.json({
					error: 'This exam registration already exists for this student, session, and course.'
				}, { status: 400 })
			}

			// Handle foreign key constraint violation
			if (error.code === '23503') {
				return NextResponse.json({
					error: 'Invalid reference. Please select valid institution, student, session, or course.'
				}, { status: 400 })
			}

			return NextResponse.json({ error: 'Failed to update exam registration' }, { status: 500 })
		}

		// Enrich with course_name
		if (data && data.course_offering && data.course_offering.course_code) {
			const { data: course } = await supabase
				.from('courses')
				.select('course_title')
				.eq('course_code', data.course_offering.course_code)
				.single()

			if (course) {
				data.course_offering.course_name = course.course_title
			}
		}

		return NextResponse.json(data)
	} catch (e) {
		console.error('Exam registration update error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// DELETE: delete exam registration by id
export async function DELETE(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json({ error: 'Exam registration ID is required' }, { status: 400 })
		}

		const supabase = getSupabaseServer()

		const { error } = await supabase
			.from('exam_registrations')
			.delete()
			.eq('id', id)

		if (error) {
			console.error('Error deleting exam registration:', error)
			return NextResponse.json({ error: 'Failed to delete exam registration' }, { status: 500 })
		}

		return NextResponse.json({ success: true })
	} catch (e) {
		console.error('Exam registration deletion error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
