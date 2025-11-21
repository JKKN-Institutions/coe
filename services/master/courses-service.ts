import type { Course, CourseFormData } from '@/types/courses'

export async function fetchCourses(): Promise<Course[]> {
	const response = await fetch('/api/master/courses')
	if (!response.ok) {
		let errorData: any = {}
		try {
			errorData = await response.json()
		} catch {
			const text = await response.text().catch(() => '')
			errorData = text ? { error: text } : { error: 'Unknown error' }
		}

		// Check if courses table doesn't exist
		if (errorData.error === 'Courses table not found') {
			console.error('Database Setup Required:', errorData.message)
			console.log('Setup Instructions:', errorData.instructions)
			throw new Error(errorData.message || 'Courses table not found')
		}

		throw new Error('Failed to fetch courses')
	}
	return response.json()
}

export async function createCourse(data: Partial<CourseFormData>): Promise<Course> {
	const payload = {
		institution_code: data.institution_code,
		regulation_code: data.regulation_code,
		offering_department_code: data.offering_department_code || null,
		board_code: data.board_code || null,
		course_code: data.course_code,
		course_title: data.course_title,
		display_code: data.display_code || null,
		course_category: data.course_category || null,
		course_type: data.course_type || null,
		course_part_master: data.course_part_master || null,
		credits: data.credits ? Math.trunc(Number(data.credits)) : 0,
		split_credit: Boolean(data.split_credit),
		theory_credit: data.theory_credit ? Math.trunc(Number(data.theory_credit)) : 0,
		practical_credit: data.practical_credit ? Math.trunc(Number(data.practical_credit)) : 0,
		qp_code: data.qp_code || null,
		e_code_name: data.e_code_name || null,
		exam_duration: data.exam_duration ? Math.trunc(Number(data.exam_duration)) : 0,
		evaluation_type: data.evaluation_type,
		result_type: data.result_type,
		self_study_course: Boolean(data.self_study_course),
		outside_class_course: Boolean(data.outside_class_course),
		open_book: Boolean(data.open_book),
		online_course: Boolean(data.online_course),
		dummy_number_required: Boolean(data.dummy_number_required),
		annual_course: Boolean(data.annual_course),
		multiple_qp_set: Boolean(data.multiple_qp_set),
		no_of_qp_setter: data.no_of_qp_setter ? Number(data.no_of_qp_setter) : null,
		no_of_scrutinizer: data.no_of_scrutinizer ? Number(data.no_of_scrutinizer) : null,
		fee_exception: Boolean(data.fee_exception),
		syllabus_pdf_url: data.syllabus_pdf_url || null,
		description: data.description || null,
		is_active: Boolean(data.is_active),
		course_level: data.course_level,
		// Required fields - always send as numbers (0 if empty)
		class_hours: Number(data.class_hours) || 0,
		theory_hours: Number(data.theory_hours) || 0,
		practical_hours: Number(data.practical_hours) || 0,
		internal_max_mark: Number(data.internal_max_mark) || 0,
		internal_pass_mark: Number(data.internal_pass_mark) || 0,
		internal_converted_mark: Number(data.internal_converted_mark) || 0,
		external_max_mark: Number(data.external_max_mark) || 0,
		external_pass_mark: Number(data.external_pass_mark) || 0,
		external_converted_mark: Number(data.external_converted_mark) || 0,
		total_pass_mark: Number(data.total_pass_mark) || 0,
		total_max_mark: Number(data.total_max_mark) || 0,
		annual_semester: Boolean(data.annual_semester),
		registration_based: Boolean(data.registration_based),
	}

	const response = await fetch('/api/master/courses', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	})

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}))
		throw new Error(errorData.error || errorData.details || 'Failed to create course')
	}

	return response.json()
}

export async function updateCourse(id: string, data: Partial<CourseFormData>): Promise<Course> {
	const payload = {
		institution_code: data.institution_code,
		regulation_code: data.regulation_code,
		offering_department_code: data.offering_department_code || null,
		board_code: data.board_code || null,
		course_code: data.course_code,
		course_title: data.course_title,
		display_code: data.display_code || null,
		course_category: data.course_category || null,
		course_type: data.course_type || null,
		course_part_master: data.course_part_master || null,
		credits: data.credits ? Math.trunc(Number(data.credits)) : 0,
		split_credit: Boolean(data.split_credit),
		theory_credit: data.theory_credit ? Math.trunc(Number(data.theory_credit)) : 0,
		practical_credit: data.practical_credit ? Math.trunc(Number(data.practical_credit)) : 0,
		qp_code: data.qp_code || null,
		e_code_name: data.e_code_name || null,
		exam_duration: data.exam_duration ? Math.trunc(Number(data.exam_duration)) : 0,
		evaluation_type: data.evaluation_type,
		result_type: data.result_type,
		self_study_course: Boolean(data.self_study_course),
		outside_class_course: Boolean(data.outside_class_course),
		open_book: Boolean(data.open_book),
		online_course: Boolean(data.online_course),
		dummy_number_required: Boolean(data.dummy_number_required),
		annual_course: Boolean(data.annual_course),
		multiple_qp_set: Boolean(data.multiple_qp_set),
		no_of_qp_setter: data.no_of_qp_setter ? Number(data.no_of_qp_setter) : null,
		no_of_scrutinizer: data.no_of_scrutinizer ? Number(data.no_of_scrutinizer) : null,
		fee_exception: Boolean(data.fee_exception),
		syllabus_pdf_url: data.syllabus_pdf_url || null,
		description: data.description || null,
		is_active: Boolean(data.is_active),
		course_level: data.course_level,
		// Required fields
		class_hours: Number(data.class_hours) || 0,
		theory_hours: Number(data.theory_hours) || 0,
		practical_hours: Number(data.practical_hours) || 0,
		internal_max_mark: Number(data.internal_max_mark) || 0,
		internal_pass_mark: Number(data.internal_pass_mark) || 0,
		internal_converted_mark: Number(data.internal_converted_mark) || 0,
		external_max_mark: Number(data.external_max_mark) || 0,
		external_pass_mark: Number(data.external_pass_mark) || 0,
		external_converted_mark: Number(data.external_converted_mark) || 0,
		total_pass_mark: Number(data.total_pass_mark) || 0,
		total_max_mark: Number(data.total_max_mark) || 0,
		annual_semester: Boolean(data.annual_semester),
		registration_based: Boolean(data.registration_based),
	}

	const response = await fetch(`/api/master/courses/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	})

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}))
		throw new Error(errorData.error || errorData.details || 'Failed to update course')
	}

	return response.json()
}

export async function deleteCourse(id: string): Promise<void> {
	const response = await fetch(`/api/master/courses/${id}`, {
		method: 'DELETE',
	})

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}))
		throw new Error(errorData.error || 'Failed to delete course')
	}
}

// Dropdown data services
export async function fetchDropdownData() {
	try {
		const [instRes, deptRes, regRes, boardRes] = await Promise.all([
			fetch('/api/master/institutions').catch(() => null),
			fetch('/api/master/departments').catch(() => null),
			fetch('/api/master/regulations').catch(() => null),
			fetch('/api/master/boards').catch(() => null),
		])

		const institutions = instRes && instRes.ok
			? (await instRes.json()).filter((i: any) => i?.institution_code).map((i: any) => ({ id: i.id, institution_code: i.institution_code }))
			: []

		const departments = deptRes && deptRes.ok
			? (await deptRes.json()).filter((d: any) => d?.department_code).map((d: any) => ({ id: d.id, department_code: d.department_code, department_name: d.department_name }))
			: []

		const regulations = regRes && regRes.ok
			? (await regRes.json()).filter((r: any) => r?.regulation_code).map((r: any) => ({ id: r.id, regulation_code: r.regulation_code }))
			: []

		const boards = boardRes && boardRes.ok
			? (await boardRes.json()).filter((b: any) => b?.board_code).map((b: any) => ({ id: b.id, board_code: b.board_code, board_name: b.board_name }))
			: []

		return { institutions, departments, regulations, boards }
	} catch (error) {
		console.error('Error loading dropdown codes:', error)
		return { institutions: [], departments: [], regulations: [], boards: [] }
	}
}

// Template download
export async function downloadTemplate() {
	const response = await fetch('/api/master/courses/template')

	if (!response.ok) {
		throw new Error('Failed to download template')
	}

	const blob = await response.blob()
	const url = window.URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `Course_Master_Template_${new Date().toISOString().split('T')[0]}.xlsx`
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	window.URL.revokeObjectURL(url)
}
