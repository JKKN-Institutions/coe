import { NextRequest, NextResponse } from 'next/server'
import { fetchMyJKKNStudents } from '@/services/shared/myjkkn-api'

/**
 * GET /api/myjkkn/students
 * Fetches students from MyJKKN API with pagination
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 */
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams
		const page = parseInt(searchParams.get('page') || '1', 10)
		const limit = parseInt(searchParams.get('limit') || '20', 10)

		// Validate pagination parameters
		if (page < 1) {
			return NextResponse.json(
				{ error: 'Page number must be greater than 0' },
				{ status: 400 }
			)
		}

		if (limit < 1 || limit > 100) {
			return NextResponse.json(
				{ error: 'Limit must be between 1 and 100' },
				{ status: 400 }
			)
		}

		const data = await fetchMyJKKNStudents({ page, limit })

		return NextResponse.json(data, { status: 200 })
	} catch (error) {
		console.error('MyJKKN Students API Error:', error)

		const errorMessage = error instanceof Error ? error.message : 'Failed to fetch students from MyJKKN API'

		// Return appropriate status code based on error type
		if (errorMessage.includes('Invalid API key')) {
			return NextResponse.json(
				{ error: errorMessage },
				{ status: 401 }
			)
		}

		if (errorMessage.includes('Access forbidden')) {
			return NextResponse.json(
				{ error: errorMessage },
				{ status: 403 }
			)
		}

		if (errorMessage.includes('not found')) {
			return NextResponse.json(
				{ error: errorMessage },
				{ status: 404 }
			)
		}

		return NextResponse.json(
			{ error: errorMessage },
			{ status: 500 }
		)
	}
}
