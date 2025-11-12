import type {
	CourseMapping,
	Institution,
	Program,
	Course,
	Regulation,
	Semester
} from '@/types/course-mapping'

/**
 * Fetch all institutions
 */
export async function fetchInstitutions(): Promise<Institution[]> {
	const response = await fetch('/api/master/institutions')

	if (!response.ok) {
		console.error('Error fetching institutions:', response.status)
		return []
	}

	return response.json()
}

/**
 * Fetch programs filtered by institution code
 */
export async function fetchPrograms(institutionCode: string): Promise<Program[]> {
	const response = await fetch(`/api/master/programs?institution_code=${institutionCode}`)

	if (!response.ok) {
		console.error('Error fetching programs:', response.status)
		return []
	}

	return response.json()
}

/**
 * Fetch semesters filtered by program code
 */
export async function fetchSemesters(programCode: string): Promise<Semester[]> {
	const response = await fetch(`/api/master/semesters?program_code=${programCode}`)

	if (!response.ok) {
		console.error('Error fetching semesters:', response.status)
		return []
	}

	return response.json()
}

/**
 * Fetch courses filtered by institution, department, and regulation
 */
export async function fetchCourses(
	institutionCode: string,
	offeringDepartmentCode?: string,
	regulationCode?: string
): Promise<Course[]> {
	let url = `/api/master/courses?institution_code=${institutionCode}`

	if (offeringDepartmentCode) {
		url += `&offering_department_code=${offeringDepartmentCode}`
	}

	if (regulationCode) {
		url += `&regulation_code=${regulationCode}`
	}

	const response = await fetch(url)

	if (!response.ok) {
		console.error('Error fetching courses:', response.status)
		return []
	}

	return response.json()
}

/**
 * Fetch regulations filtered by institution and program
 */
export async function fetchRegulations(
	institutionCode: string,
	programCode?: string
): Promise<Regulation[]> {
	let url = '/api/master/regulations?'

	if (institutionCode) url += `institution_code=${institutionCode}&`
	if (programCode) url += `program_code=${programCode}`

	const response = await fetch(url)

	if (!response.ok) {
		console.error('Error fetching regulations:', response.status)
		return []
	}

	return response.json()
}

/**
 * Fetch course by ID
 */
export async function fetchCourseById(courseId: string): Promise<Course | null> {
	const response = await fetch(`/api/master/courses?id=${courseId}`)

	if (!response.ok) {
		console.error('Error fetching course:', response.status)
		return null
	}

	const data = await response.json()
	return Array.isArray(data) ? data[0] : data
}

/**
 * Load existing course mappings for institution, program, and regulation
 */
export async function loadExistingMappings(
	institutionCode: string,
	programCode: string,
	regulationCode: string
): Promise<CourseMapping[]> {
	const response = await fetch(
		`/api/course-management/course-mapping?institution_code=${institutionCode}&program_code=${programCode}&regulation_code=${regulationCode}`
	)

	if (!response.ok) {
		console.error('Error loading course mappings:', response.status)
		return []
	}

	return response.json()
}

/**
 * Save course mappings (bulk create or update)
 */
export async function saveCourseMappings(
	mappings: CourseMapping[]
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch('/api/course-management/course-mapping', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mappings })
		})

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}))
			throw new Error(errorData.error || 'Failed to save course mappings')
		}

		return { success: true }
	} catch (error) {
		console.error('Error saving course mappings:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to save course mappings'
		}
	}
}

/**
 * Delete a course mapping by ID
 */
export async function deleteCourseMapping(id: string): Promise<void> {
	const response = await fetch(`/api/course-management/course-mapping/${id}`, {
		method: 'DELETE',
	})

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}))
		throw new Error(errorData.error || 'Failed to delete course mapping')
	}
}
