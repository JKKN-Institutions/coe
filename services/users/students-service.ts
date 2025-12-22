import type { Student, StudentFormData, DropdownData } from '@/types/students'

export async function fetchStudents(): Promise<Student[]> {
	const response = await fetch('/api/students')
	if (!response.ok) {
		throw new Error('Failed to fetch students')
	}
<<<<<<< HEAD
<<<<<<< Updated upstream
	return response.json()
=======

	// Enrich students with department and program names from master data
	try {
		const [deptRes, progRes] = await Promise.all([
			fetch('/api/master/departments'),
			fetch('/api/master/programs')
		])

		const departments = deptRes.ok ? await deptRes.json() : []
		const programs = progRes.ok ? await progRes.json() : []

		// Create lookup maps
		const deptMap = new Map(departments.map((d: any) => [d.department_code, d.department_name]))
		const progMap = new Map(programs.map((p: any) => [p.program_code, p.program_name]))

		// Enrich student data
		return allStudents.map(student => ({
			...student,
			department_name: student.department_code ? deptMap.get(student.department_code) || student.department_code : undefined,
			program_name: student.program_code ? progMap.get(student.program_code) || student.program_code : undefined,
		}))
	} catch (error) {
		console.error('Error enriching student data:', error)
		return allStudents
	}
>>>>>>> Stashed changes
=======
	return response.json()
>>>>>>> parent of 7476950 (commit)
}

export async function createStudent(data: StudentFormData): Promise<Student> {
	const payload = {
		...data,
		batch_year: data.batch_year ? Number(data.batch_year) : null,
	}

	const response = await fetch('/api/students', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	})

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}))
		throw new Error(errorData.error || errorData.details || 'Failed to create student')
	}

	return response.json()
}

export async function updateStudent(id: string, data: StudentFormData): Promise<Student> {
	const payload = {
		...data,
		batch_year: data.batch_year ? Number(data.batch_year) : null,
	}

	const response = await fetch(`/api/students/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	})

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}))
		throw new Error(errorData.error || errorData.details || 'Failed to update student')
	}

	return response.json()
}

export async function deleteStudent(id: string): Promise<void> {
	const response = await fetch(`/api/students/${id}`, {
		method: 'DELETE',
	})

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}))
		throw new Error(errorData.error || 'Failed to delete student')
	}
}

// Dropdown data services
export async function fetchDropdownData(): Promise<Partial<DropdownData>> {
	try {
		const [instRes, ayRes] = await Promise.all([
			fetch('/api/institutions'),
			fetch('/api/academic-year')
		])

		const institutions = instRes.ok ? await instRes.json() : []
		const academicYears = ayRes.ok ? await ayRes.json() : []

		return { institutions, academicYears }
	} catch (error) {
		console.error('Error fetching dropdown data:', error)
		return {}
	}
}

export async function fetchDepartmentsByInstitution(institutionId: string, institutionCode: string) {
	try {
		const url = `/api/departments?institution_code=${institutionCode}`
		const response = await fetch(url)

		if (response.ok) {
			return await response.json()
		}
		return []
	} catch (error) {
		console.error('Error fetching departments:', error)
		return []
	}
}

export async function fetchProgramsByDepartment(departmentId: string) {
	try {
		const response = await fetch(`/api/program?department_id=${departmentId}`)

		if (response.ok) {
			return await response.json()
		}
		return []
	} catch (error) {
		console.error('Error fetching programs:', error)
		return []
	}
}

export async function fetchDegreesByProgram(programId: string) {
	try {
		const response = await fetch(`/api/degrees?program_id=${programId}`)

		if (response.ok) {
			return await response.json()
		}
		return []
	} catch (error) {
		console.error('Error fetching degrees:', error)
		return []
	}
}

export async function fetchSemestersByProgram(programId: string) {
	try {
		const response = await fetch(`/api/semester?program_id=${programId}`)

		if (response.ok) {
			return await response.json()
		}
		return []
	} catch (error) {
		console.error('Error fetching semesters:', error)
		return []
	}
}

export async function fetchSectionsByProgram(programId: string) {
	try {
		const response = await fetch(`/api/section?program_id=${programId}`)

		if (response.ok) {
			return await response.json()
		}
		return []
	} catch (error) {
		console.error('Error fetching sections:', error)
		return []
	}
}
