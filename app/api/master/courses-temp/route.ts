import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url)
		const id = searchParams.get('id')
		const search = searchParams.get('search')
		const institution_code = searchParams.get('institution_code')
		const regulation_code = searchParams.get('regulation_code')
		const offering_department_code = searchParams.get('offering_department_code')
		const course_type = searchParams.get('course_type')
		const is_active = searchParams.get('is_active')

		const supabase = getSupabaseServer()
		let query = supabase
			.from('courses_temp')
			.select(`
				id,
				institutions_id,
				regulation_id,
				offering_department_id,
				board_id,
				institution_code,
				regulation_code,
				offering_department_code,
				board_code,
				course_code,
				course_name,
				display_code,
				course_category,
				course_type,
				course_part_master,
				credit,
				split_credit,
				theory_credit,
				practical_credit,
				qp_code,
				e_code_name,
				exam_duration,
				evaluation_type,
				result_type,
				self_study_course,
				outside_class_course,
				open_book,
				online_course,
				dummy_number_not_required,
				annual_course,
				multiple_qp_set,
				no_of_qp_setter,
				no_of_scrutinizer,
				fee_exception,
				syllabus_pdf_url,
				description,
				status,
				created_at,
				updated_at,
				class_hours,
				theory_hours,
				practical_hours,
				internal_max_mark,
				internal_pass_mark,
				internal_converted_mark,
				external_max_mark,
				external_pass_mark,
				external_converted_mark,
				total_pass_mark,
				total_max_mark,
				annual_semester,
				registration_based,
				program_code,
				program_nam
			`, { count: 'exact' })
			.order('created_at', { ascending: false })
			.range(0, 9999)

		// Apply filters
		if (id) {
			query = query.eq('id', id)
		}
		if (search) {
			query = query.or(`course_code.ilike.%${search}%,course_name.ilike.%${search}%`)
		}
		if (institution_code) {
			query = query.eq('institution_code', institution_code)
		}
		if (regulation_code) {
			query = query.eq('regulation_code', regulation_code)
		}
		if (offering_department_code) {
			query = query.eq('offering_department_code', offering_department_code)
		}
		if (course_type) {
			query = query.eq('course_type', course_type)
		}
		if (is_active !== null) {
			query = query.eq('status', is_active === 'true')
		}

		const { data, error } = await query

		if (error) {
			console.error('Supabase error:', error)
			return NextResponse.json({
				error: 'Failed to fetch courses',
				details: error.message || 'Unknown error'
			}, { status: 500 })
		}

		// Map to frontend format
		const mapped = (data || []).map((row: any) => ({
			id: row.id,
			institutions_id: row.institutions_id,
			regulation_id: row.regulation_id,
			offering_department_id: row.offering_department_id,
			board_id: row.board_id,
			institution_code: row.institution_code,
			regulation_code: row.regulation_code,
			offering_department_code: row.offering_department_code,
			board_code: row.board_code,
			course_code: row.course_code,
			course_title: row.course_name,
			display_code: row.display_code,
			course_category: row.course_category,
			course_type: row.course_type,
			course_part_master: row.course_part_master,
			credits: row.credit ?? 0,
			split_credit: row.split_credit,
			theory_credit: row.theory_credit,
			practical_credit: row.practical_credit,
			qp_code: row.qp_code,
			e_code_name: row.e_code_name,
			exam_duration: row.exam_duration,
			evaluation_type: row.evaluation_type,
			result_type: row.result_type,
			self_study_course: row.self_study_course,
			outside_class_course: row.outside_class_course,
			open_book: row.open_book,
			online_course: row.online_course,
			dummy_number_required: !row.dummy_number_not_required,
			annual_course: row.annual_course,
			multiple_qp_set: row.multiple_qp_set,
			no_of_qp_setter: row.no_of_qp_setter,
			no_of_scrutinizer: row.no_of_scrutinizer,
			fee_exception: row.fee_exception,
			syllabus_pdf_url: row.syllabus_pdf_url,
			description: row.description,
			is_active: row.status ?? true,
			created_at: row.created_at,
			updated_at: row.updated_at,
			class_hours: row.class_hours ?? 0,
			theory_hours: row.theory_hours ?? 0,
			practical_hours: row.practical_hours ?? 0,
			internal_max_mark: row.internal_max_mark ?? 0,
			internal_pass_mark: row.internal_pass_mark ?? 0,
			internal_converted_mark: row.internal_converted_mark ?? 0,
			external_max_mark: row.external_max_mark ?? 0,
			external_pass_mark: row.external_pass_mark ?? 0,
			external_converted_mark: row.external_converted_mark ?? 0,
			total_pass_mark: row.total_pass_mark ?? 0,
			total_max_mark: row.total_max_mark ?? 0,
			annual_semester: row.annual_semester ?? false,
			registration_based: row.registration_based ?? false,
			program_code: row.program_code,
			program_name: row.program_nam,
		}))

		return NextResponse.json(mapped)
	} catch (err) {
		console.error('API Error:', err)
		return NextResponse.json({
			error: 'Failed to fetch courses',
			details: err instanceof Error ? err.message : 'Unknown error'
		}, { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	try {
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

		// 5. Insert course with resolved IDs
		const { data, error } = await supabase.from('courses_temp').insert({
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
		}).select('*').single()

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

		return NextResponse.json(data, { status: 201 })
	} catch (err) {
		console.error('API Error:', err)
		return NextResponse.json({
			error: 'Failed to create course',
			details: err instanceof Error ? err.message : 'Unknown error'
		}, { status: 500 })
	}
}
