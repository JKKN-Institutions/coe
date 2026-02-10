/**
 * MyJKKN Learners API
 *
 * Dedicated API route for fetching learner profiles from MyJKKN
 * with high limit (100000) for bulk operations like semester marksheets
 */

import { NextResponse } from 'next/server'

const MYJKKN_API_URL = process.env.MYJKKN_API_URL || 'https://www.jkkn.ai/api'
const MYJKKN_API_KEY = process.env.MYJKKN_API_KEY || ''

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const institutionId = searchParams.get('institution_id')
		const programCode = searchParams.get('program_code')
		const batchId = searchParams.get('batch_id')
		const currentSemester = searchParams.get('current_semester')
		const limit = searchParams.get('limit') || '100000'

		if (!MYJKKN_API_KEY) {
			return NextResponse.json(
				{ error: 'MYJKKN_API_KEY not configured' },
				{ status: 500 }
			)
		}

		if (!institutionId) {
			return NextResponse.json(
				{ error: 'institution_id is required' },
				{ status: 400 }
			)
		}

		// Build query parameters
		const params = new URLSearchParams()
		params.set('institution_id', institutionId)
		params.set('limit', limit)
		params.set('page', '1')

		if (programCode) params.set('program_code', programCode)
		if (batchId) params.set('batch_id', batchId)
		if (currentSemester) params.set('current_semester', currentSemester)

		const url = `${MYJKKN_API_URL}/api-management/learners/profiles?${params.toString()}`
		console.log(`[MyJKKN Learners API] Fetching: ${url}`)

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${MYJKKN_API_KEY}`,
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
			cache: 'no-store',
		})

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}))
			console.error(`[MyJKKN Learners API] Error ${response.status}:`, errorBody)
			return NextResponse.json(
				{ error: errorBody.message || `MyJKKN API Error: ${response.status}` },
				{ status: response.status }
			)
		}

		const data = await response.json()
		const profiles = data.data || []

		console.log(`[MyJKKN Learners API] Success: ${profiles.length} profiles fetched`)

		// Return profiles with metadata
		return NextResponse.json({
			data: profiles,
			total: profiles.length,
			metadata: data.metadata || { total: profiles.length }
		})

	} catch (error) {
		console.error('[MyJKKN Learners API] Error:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch learner profiles from MyJKKN' },
			{ status: 500 }
		)
	}
}
