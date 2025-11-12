/**
 * Grade System Service Layer
 *
 * This module consolidates all API calls for the grade system module.
 * It provides a clean interface for fetching and managing grade systems
 * and related entities (institutions, regulations, grades).
 */

import type {
	GradeSystem,
	Institution,
	Regulation,
	Grade,
	GradeSystemPayload,
} from '@/types/grade-system'

/**
 * Fetch all grade systems
 * @returns Promise<GradeSystem[]>
 */
export async function fetchGradeSystems(): Promise<GradeSystem[]> {
	try {
		const response = await fetch('/api/grading/grade-system')
		if (!response.ok) {
			throw new Error('Failed to fetch grade systems')
		}
		const data = await response.json()
		return data
	} catch (error) {
		console.error('Error fetching grade systems:', error)
		return []
	}
}

/**
 * Fetch all institutions with mapping to clean interface
 * @returns Promise<Institution[]>
 */
export async function fetchInstitutions(): Promise<Institution[]> {
	try {
		const res = await fetch('/api/master/institutions')
		if (res.ok) {
			const data = await res.json()
			const mapped = Array.isArray(data)
				? data.filter((i: any) => i?.institution_code).map((i: any) => ({
					id: i.id,
					institution_code: i.institution_code,
					name: i.institution_name || i.name
				}))
				: []
			return mapped
		}
		return []
	} catch (e) {
		console.error('Failed to load institutions:', e)
		return []
	}
}

/**
 * Fetch all regulations with mapping to clean interface
 * @returns Promise<Regulation[]>
 */
export async function fetchRegulations(): Promise<Regulation[]> {
	try {
		const res = await fetch('/api/regulations')
		if (res.ok) {
			const data = await res.json()
			const mapped = Array.isArray(data)
				? data.filter((i: any) => i?.regulation_code).map((i: any) => ({
					id: i.id,
					regulation_code: i.regulation_code,
					name: i.regulation_name || i.name
				}))
				: []
			return mapped
		}
		return []
	} catch (e) {
		console.error('Failed to load regulations:', e)
		return []
	}
}

/**
 * Fetch all grades with mapping to clean interface
 * @returns Promise<Grade[]>
 */
export async function fetchGrades(): Promise<Grade[]> {
	try {
		const res = await fetch('/api/grades')
		if (res.ok) {
			const data = await res.json()
			const mapped = Array.isArray(data)
				? data.filter((i: any) => i?.grade).map((i: any) => ({
					id: i.id,
					grade: i.grade,
					grade_point: i.grade_point || 0
				}))
				: []
			return mapped
		}
		return []
	} catch (e) {
		console.error('Failed to load grades:', e)
		return []
	}
}

/**
 * Create a new grade system
 * @param payload - Grade system payload
 * @returns Promise<GradeSystem>
 */
export async function createGradeSystem(
	payload: GradeSystemPayload
): Promise<GradeSystem> {
	const response = await fetch('/api/grading/grade-system', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	})

	if (!response.ok) {
		const errorData = await response.json()
		throw new Error(errorData.error || 'Failed to create Grade System')
	}

	return response.json()
}

/**
 * Update an existing grade system
 * @param id - Grade system ID
 * @param payload - Grade system payload
 * @returns Promise<GradeSystem>
 */
export async function updateGradeSystem(
	id: string,
	payload: GradeSystemPayload
): Promise<GradeSystem> {
	const response = await fetch('/api/grading/grade-system', {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ id, ...payload }),
	})

	if (!response.ok) {
		const errorData = await response.json()
		throw new Error(errorData.error || 'Failed to update Grade System')
	}

	return response.json()
}

/**
 * Delete a grade system by ID
 * @param id - Grade system ID
 * @returns Promise<void>
 */
export async function deleteGradeSystem(id: string): Promise<void> {
	const response = await fetch(`/api/grade-system/${id}`, {
		method: 'DELETE',
	})

	if (!response.ok) {
		const errorData = await response.json()
		throw new Error(errorData.error || 'Failed to delete Grade System')
	}
}

/**
 * Save grade system (create or update based on editing state)
 * @param payload - Grade system payload
 * @param id - Optional ID for update operation
 * @returns Promise<GradeSystem>
 */
export async function saveGradeSystem(
	payload: GradeSystemPayload,
	id?: string
): Promise<GradeSystem> {
	if (id) {
		return updateGradeSystem(id, payload)
	} else {
		return createGradeSystem(payload)
	}
}
