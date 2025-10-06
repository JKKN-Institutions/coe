import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)

		const includeDetails = searchParams.get('details') === 'true'
		const institutionCode = searchParams.get('institution_code')
		const programCode = searchParams.get('program_code')
		const batchCode = searchParams.get('batch_code')
		const semesterCode = searchParams.get('semester_code')
		const isActive = searchParams.get('is_active')

		if (includeDetails) {
			// Use the detailed view for comprehensive data
			let query = supabase
				.from('course_mapping_detailed_view')
				.select('*')
				.order('created_at', { ascending: false })

			if (institutionCode) query = query.eq('institution_code', institutionCode)
			if (programCode) query = query.eq('program_code', programCode)
			if (batchCode) query = query.eq('batch_code', batchCode)
			if (semesterCode) query = query.eq('semester_code', semesterCode)
			if (isActive !== null) query = query.eq('is_active', isActive === 'true')

			const { data, error } = await query

			if (error) {
				console.error('Error fetching course mappings (detailed):', error)
				return NextResponse.json({ error: error.message }, { status: 500 })
			}

			return NextResponse.json(data || [])
		} else {
			// Use basic query with manual joins
			let query = supabase
				.from('course_mapping')
				.select(`
					*,
					course:courses!course_id (
						id,
						course_code,
						course_title,
						course_short_name,
						course_type,
						credits,
						institution_code,
						program_code,
						regulation_code
					)
				`)
				.order('created_at', { ascending: false })

			if (institutionCode) query = query.eq('institution_code', institutionCode)
			if (programCode) query = query.eq('program_code', programCode)
			if (batchCode) query = query.eq('batch_code', batchCode)
			if (semesterCode) query = query.eq('semester_code', semesterCode)
			if (isActive !== null) query = query.eq('is_active', isActive === 'true')

			const { data, error } = await query

			if (error) {
				console.error('Error fetching course mappings:', error)
				return NextResponse.json({ error: error.message }, { status: 500 })
			}

			return NextResponse.json(data || [])
		}
	} catch (err) {
		console.error('Unexpected error in GET /api/course-mapping:', err)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export async function POST(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const body = await request.json()

		// Validate required fields
		if (!body.course_id) {
			return NextResponse.json(
				{ error: 'course_id is required' },
				{ status: 400 }
			)
		}

		if (!body.institution_code) {
			return NextResponse.json(
				{ error: 'institution_code is required' },
				{ status: 400 }
			)
		}

		if (!body.program_code) {
			return NextResponse.json(
				{ error: 'program_code is required' },
				{ status: 400 }
			)
		}

		if (!body.batch_code) {
			return NextResponse.json(
				{ error: 'batch_code is required' },
				{ status: 400 }
			)
		}

		// Validate marks consistency
		if (body.internal_pass_mark > body.internal_max_mark) {
			return NextResponse.json(
				{ error: 'Internal pass mark cannot exceed internal max mark' },
				{ status: 400 }
			)
		}

		if (body.external_pass_mark > body.external_max_mark) {
			return NextResponse.json(
				{ error: 'External pass mark cannot exceed external max mark' },
				{ status: 400 }
			)
		}

		if (body.total_pass_mark > body.total_max_mark) {
			return NextResponse.json(
				{ error: 'Total pass mark cannot exceed total max mark' },
				{ status: 400 }
			)
		}

		// Check for duplicate mapping
		const { data: existing } = await supabase
			.from('course_mapping')
			.select('id')
			.eq('course_id', body.course_id)
			.eq('institution_code', body.institution_code)
			.eq('program_code', body.program_code)
			.eq('batch_code', body.batch_code)
			.eq('semester_code', body.semester_code || '')
			.eq('is_active', true)
			.single()

		if (existing) {
			return NextResponse.json(
				{ error: 'Course mapping already exists for this combination' },
				{ status: 409 }
			)
		}

		const { data, error } = await supabase
			.from('course_mapping')
			.insert([body])
			.select(`
				*,
				course:courses!course_id (
					id,
					course_code,
					course_title,
					course_short_name,
					institution_code,
					program_code
				)
			`)
			.single()

		if (error) {
			console.error('Error creating course mapping:', error)
			return NextResponse.json({ error: error.message }, { status: 500 })
		}

		return NextResponse.json(data, { status: 201 })
	} catch (err) {
		console.error('Unexpected error in POST /api/course-mapping:', err)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export async function PUT(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const body = await request.json()

		if (!body.id) {
			return NextResponse.json(
				{ error: 'Mapping ID is required' },
				{ status: 400 }
			)
		}

		// Validate marks consistency
		if (body.internal_pass_mark && body.internal_max_mark && body.internal_pass_mark > body.internal_max_mark) {
			return NextResponse.json(
				{ error: 'Internal pass mark cannot exceed internal max mark' },
				{ status: 400 }
			)
		}

		if (body.external_pass_mark && body.external_max_mark && body.external_pass_mark > body.external_max_mark) {
			return NextResponse.json(
				{ error: 'External pass mark cannot exceed external max mark' },
				{ status: 400 }
			)
		}

		if (body.total_pass_mark && body.total_max_mark && body.total_pass_mark > body.total_max_mark) {
			return NextResponse.json(
				{ error: 'Total pass mark cannot exceed total max mark' },
				{ status: 400 }
			)
		}

		const { id, ...updateData } = body

		const { data, error } = await supabase
			.from('course_mapping')
			.update(updateData)
			.eq('id', id)
			.select(`
				*,
				course:courses!course_id (
					id,
					course_code,
					course_title,
					course_short_name,
					institution_code,
					program_code
				)
			`)
			.single()

		if (error) {
			console.error('Error updating course mapping:', error)
			return NextResponse.json({ error: error.message }, { status: 500 })
		}

		return NextResponse.json(data)
	} catch (err) {
		console.error('Unexpected error in PUT /api/course-mapping:', err)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export async function DELETE(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json(
				{ error: 'Mapping ID is required' },
				{ status: 400 }
			)
		}

		const { error } = await supabase
			.from('course_mapping')
			.delete()
			.eq('id', id)

		if (error) {
			console.error('Error deleting course mapping:', error)
			return NextResponse.json({ error: error.message }, { status: 500 })
		}

		return NextResponse.json({ success: true })
	} catch (err) {
		console.error('Unexpected error in DELETE /api/course-mapping:', err)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
