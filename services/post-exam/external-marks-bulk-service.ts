/**
 * External Marks Bulk Upload Service
 * Handles all API calls for bulk external marks operations
 */

import type {
	ExternalMark,
	Institution,
	ExamSession,
	Program,
	Course,
	BulkUploadPayload,
	BulkUploadResponse,
	BulkDeleteResponse
} from '@/types/external-marks'

const API_BASE = '/api/post-exam/external-marks-bulk'

/**
 * Fetch all institutions
 */
export async function fetchInstitutions(): Promise<Institution[]> {
	const res = await fetch(`${API_BASE}?action=institutions`)
	if (!res.ok) {
		throw new Error('Failed to fetch institutions')
	}
	return res.json()
}

/**
 * Fetch sessions for an institution
 */
export async function fetchSessions(institutionId: string): Promise<ExamSession[]> {
	const res = await fetch(`${API_BASE}?action=sessions&institutionId=${institutionId}`)
	if (!res.ok) {
		throw new Error('Failed to fetch sessions')
	}
	return res.json()
}

/**
 * Fetch programs for an institution
 */
export async function fetchPrograms(institutionId: string): Promise<Program[]> {
	const res = await fetch(`${API_BASE}?action=programs&institutionId=${institutionId}`)
	if (!res.ok) {
		throw new Error('Failed to fetch programs')
	}
	return res.json()
}

/**
 * Fetch courses for an institution
 */
export async function fetchCourses(institutionId: string): Promise<Course[]> {
	const res = await fetch(`${API_BASE}?action=courses&institutionId=${institutionId}`)
	if (!res.ok) {
		throw new Error('Failed to fetch courses')
	}
	return res.json()
}

/**
 * Fetch external marks with filters
 */
export async function fetchExternalMarks(filters: {
	institutionId: string
	sessionId?: string
	programId?: string
	courseId?: string
}): Promise<ExternalMark[]> {
	let url = `${API_BASE}?action=marks&institutionId=${filters.institutionId}`
	if (filters.sessionId) url += `&sessionId=${filters.sessionId}`
	if (filters.programId) url += `&programId=${filters.programId}`
	if (filters.courseId) url += `&courseId=${filters.courseId}`

	const res = await fetch(url)
	if (!res.ok) {
		const errorData = await res.json().catch(() => ({}))
		throw new Error(errorData.error || 'Failed to fetch marks data')
	}
	return res.json()
}

/**
 * Bulk upload external marks
 */
export async function bulkUploadMarks(payload: BulkUploadPayload): Promise<BulkUploadResponse> {
	console.log('=== bulkUploadMarks called ===')
	console.log('payload:', { ...payload, marks_data: `${payload.marks_data.length} rows` })
	console.log('First row sample:', payload.marks_data[0])

	try {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout

		const res = await fetch(API_BASE, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
			signal: controller.signal
		})

		clearTimeout(timeoutId)

		console.log('API response status:', res.status)
		const result = await res.json()
		console.log('API response result:', result)

		if (!res.ok) {
			throw new Error(result.error || 'Upload failed')
		}

		return result
	} catch (error: any) {
		console.error('=== bulkUploadMarks error ===', error)
		if (error.name === 'AbortError') {
			throw new Error('Upload timed out. Please try with fewer rows.')
		}
		throw error
	}
}

/**
 * Bulk delete external marks
 */
export async function bulkDeleteMarks(ids: string[]): Promise<BulkDeleteResponse> {
	const res = await fetch(API_BASE, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			action: 'bulk-delete',
			ids
		})
	})

	const result = await res.json()

	if (!res.ok) {
		// Return the result even on error as it may contain non_deletable info
		if (result.non_deletable) {
			return result
		}
		throw new Error(result.error || 'Delete failed')
	}

	return result
}
