import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const { id } = params
		const body = await req.json()
		const input = body as Record<string, unknown>

		if (!input.institution_code || !input.regulation_code || !input.course_code || !input.course_title) {
			return NextResponse.json({
				error: 'Missing required fields: institution_code, regulation_code, course_code, course_title'
			}, { status: 400 })
		}

		const supabase = getSupabaseServer()

		// 1. Fetch institutions_id from institution_code
		const { data: institutionData, error: institutionError } = await supabase
			.from('institutions')
			.select('id')
			.eq('institution_code', String(input.institution_code))
			.single()

		if (institutionError || !institutionData) {
			return NextResponse.json({
				error: `Institution with code "${input.institution_code}" not found. Please ensure the institution exists.`
			}, { status: 400 })
		}

		// 2. Fetch regulation_id from regulation_code
		const { data: regulationData, error: regulationError } = await supabase
			.from('regulations')
			.select('id')
			.eq('regulation_code', String(input.regulation_code))
			.single()

		if (regulationError || !regulationData) {
			return NextResponse.json({
				error: `Regulation with code "${input.regulation_code}" not found. Please ensure the regulation exists.`
			}, { status: 400 })
		}

		// 3. Fetch offering_department_id from offering_department_code (optional)
		let offeringDepartmentId = null
		if (input.offering_department_code) {
			const { data: deptData, error: deptError } = await supabase
				.from('departments')
				.select('id')
				.eq('department_code', String(input.offering_department_code))
				.single()

			if (deptError || !deptData) {
				return NextResponse.json({
					error: `Department with code "${input.offering_department_code}" not found. Please ensure the department exists.`
				}, { status: 400 })
			}
			offeringDepartmentId = deptData.id
		}

		// 4. Fetch board_id from board_code (optional)
		let boardId = null
		if (input.board_code) {
			const { data: boardData, error: boardError } = await supabase
				.from('board')
				.select('id')
				.eq('board_code', String(input.board_code))
				.single()

			if (boardError || !boardData) {
				return NextResponse.json({
					error: `Board with code "${input.board_code}" not found. Please ensure the board exists.`
				}, { status: 400 })
			}
			boardId = boardData.id
		}

		// 5. Update course with resolved IDs
		const { data, error } = await supabase
			.from('courses_temp')
			.update({
				institutions_id: institutionData.id,
				regulation_id: regulationData.id,
				offering_department_id: offeringDepartmentId,
				board_id: boardId,
				institution_code: String(input.institution_code),
				regulation_code: String(input.regulation_code),
				offering_department_code: input.offering_department_code ? String(input.offering_department_code) : null,
				board_code: input.board_code ? String(input.board_code) : null,
				course_code: String(input.course_code),
				course_name: String(input.course_title),
				display_code: input.display_code ? String(input.display_code) : null,
				course_category: input.course_category ? String(input.course_category) : null,
				course_type: input.course_type ? String(input.course_type) : null,
				course_part_master: input.course_part_master ? String(input.course_part_master) : null,
				credit: input.credits !== undefined ? Number(input.credits) : 0,
				split_credit: input.split_credit !== undefined ? Boolean(input.split_credit) : false,
				theory_credit: input.theory_credit !== undefined ? Number(input.theory_credit) : null,
				practical_credit: input.practical_credit !== undefined ? Number(input.practical_credit) : null,
				qp_code: input.qp_code ? String(input.qp_code) : null,
				e_code_name: input.e_code_name ? String(input.e_code_name) : null,
				exam_duration: input.exam_duration !== undefined ? Number(input.exam_duration) : null,
				evaluation_type: input.evaluation_type ? String(input.evaluation_type) : null,
				result_type: input.result_type ? String(input.result_type) : 'Mark',
				self_study_course: input.self_study_course !== undefined ? Boolean(input.self_study_course) : false,
				outside_class_course: input.outside_class_course !== undefined ? Boolean(input.outside_class_course) : false,
				open_book: input.open_book !== undefined ? Boolean(input.open_book) : false,
				online_course: input.online_course !== undefined ? Boolean(input.online_course) : false,
				dummy_number_not_required: input.dummy_number_required !== undefined ? !Boolean(input.dummy_number_required) : false,
				annual_course: input.annual_course !== undefined ? Boolean(input.annual_course) : false,
				multiple_qp_set: input.multiple_qp_set !== undefined ? Boolean(input.multiple_qp_set) : false,
				no_of_qp_setter: input.no_of_qp_setter !== undefined ? Number(input.no_of_qp_setter) : null,
				no_of_scrutinizer: input.no_of_scrutinizer !== undefined ? Number(input.no_of_scrutinizer) : null,
				fee_exception: input.fee_exception !== undefined ? Boolean(input.fee_exception) : false,
				syllabus_pdf_url: input.syllabus_pdf_url ? String(input.syllabus_pdf_url) : null,
				description: input.description ? String(input.description) : null,
				status: input.is_active !== undefined ? Boolean(input.is_active) : true,
				class_hours: input.class_hours !== undefined ? Number(input.class_hours) : 0,
				theory_hours: input.theory_hours !== undefined ? Number(input.theory_hours) : 0,
				practical_hours: input.practical_hours !== undefined ? Number(input.practical_hours) : 0,
				internal_max_mark: input.internal_max_mark !== undefined ? Number(input.internal_max_mark) : 0,
				internal_pass_mark: input.internal_pass_mark !== undefined ? Number(input.internal_pass_mark) : 0,
				internal_converted_mark: input.internal_converted_mark !== undefined ? Number(input.internal_converted_mark) : 0,
				external_max_mark: input.external_max_mark !== undefined ? Number(input.external_max_mark) : 0,
				external_pass_mark: input.external_pass_mark !== undefined ? Number(input.external_pass_mark) : 0,
				external_converted_mark: input.external_converted_mark !== undefined ? Number(input.external_converted_mark) : 0,
				total_pass_mark: input.total_pass_mark !== undefined ? Number(input.total_pass_mark) : 0,
				total_max_mark: input.total_max_mark !== undefined ? Number(input.total_max_mark) : 0,
				annual_semester: input.annual_semester !== undefined ? Boolean(input.annual_semester) : false,
				registration_based: input.registration_based !== undefined ? Boolean(input.registration_based) : false,
				program_code: input.program_code ? String(input.program_code) : null,
				program_nam: input.program_name ? String(input.program_name) : null,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select('*')
			.single()

		if (error) {
			console.error('Supabase error:', error)

			// Handle foreign key constraint violation
			if (error.code === '23503') {
				return NextResponse.json({
					error: 'Foreign key constraint failed. Ensure institution, regulation, department, and board exist.'
				}, { status: 400 })
			}

			// Handle duplicate key violation
			if (error.code === '23505') {
				return NextResponse.json({
					error: 'Course already exists. Please use different values.'
				}, { status: 400 })
			}

			// Handle check constraint violation
			if (error.code === '23514') {
				return NextResponse.json({
					error: 'Invalid value. Please check your input values and ensure they match the allowed options.'
				}, { status: 400 })
			}

			throw error
		}

		return NextResponse.json(data, { status: 200 })
	} catch (err) {
		console.error('API Error:', err)
		return NextResponse.json({
			error: 'Failed to update course',
			details: err instanceof Error ? err.message : 'Unknown error'
		}, { status: 500 })
	}
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const { id } = params
		const supabase = getSupabaseServer()

		const { error } = await supabase
			.from('courses_temp')
			.delete()
			.eq('id', id)

		if (error) {
			console.error('Supabase error:', error)
			throw error
		}

		return NextResponse.json({ success: true }, { status: 200 })
	} catch (err) {
		console.error('API Error:', err)
		return NextResponse.json({
			error: 'Failed to delete course',
			details: err instanceof Error ? err.message : 'Unknown error'
		}, { status: 500 })
	}
}
