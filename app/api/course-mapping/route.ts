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
			// Use basic query without joins - will fetch course data separately if needed
			let query = supabase
				.from('course_mapping')
				.select('*')
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

		// Check if it's a bulk operation (multiple semesters)
		if (body.bulk && Array.isArray(body.mappings)) {
			const results = []
			const errors = []

			for (const mapping of body.mappings) {
				// Validate required fields
				if (!mapping.course_id || !mapping.institution_code || !mapping.program_code || !mapping.batch_code) {
					errors.push({
						semester_code: mapping.semester_code,
						course_id: mapping.course_id,
						error: 'Missing required fields'
					})
					continue
				}

				// Validate marks consistency
				if (mapping.internal_pass_mark > mapping.internal_max_mark ||
					mapping.external_pass_mark > mapping.external_max_mark ||
					mapping.total_pass_mark > mapping.total_max_mark) {
					errors.push({
						semester_code: mapping.semester_code,
						course_id: mapping.course_id,
						error: 'Pass marks cannot exceed max marks'
					})
					continue
				}

				// Fetch course_code from courses table
				const { data: courseData, error: courseError } = await supabase
					.from('courses')
					.select('course_code')
					.eq('id', mapping.course_id)
					.single()

				if (courseError || !courseData) {
					errors.push({
						semester_code: mapping.semester_code,
						course_id: mapping.course_id,
						error: 'Course not found'
					})
					continue
				}

				// Fetch institution_id from institutions table based on institution_code
				const { data: institutionData, error: institutionError } = await supabase
					.from('institutions')
					.select('id')
					.eq('institution_code', mapping.institution_code)
					.single()

				if (institutionError || !institutionData) {
					errors.push({
						semester_code: mapping.semester_code,
						course_id: mapping.course_id,
						error: `Institution not found: ${mapping.institution_code}`
					})
					continue
				}

				// Fetch program_id from programs table based on program_code
				const { data: programData, error: programError } = await supabase
					.from('programs')
					.select('id')
					.eq('program_code', mapping.program_code)
					.eq('institution_code', mapping.institution_code)
					.single()

				if (programError || !programData) {
					errors.push({
						semester_code: mapping.semester_code,
						course_id: mapping.course_id,
						error: `Program not found: ${mapping.program_code}`
					})
					continue
				}

				// Fetch batch_id from batch table based on batch_code
				const { data: batchData, error: batchError } = await supabase
					.from('batch')
					.select('id')
					.eq('batch_code', mapping.batch_code)
					.eq('institution_code', mapping.institution_code)
					.single()

				if (batchError || !batchData) {
					errors.push({
						semester_code: mapping.semester_code,
						course_id: mapping.course_id,
						error: `Batch not found: ${mapping.batch_code}`
					})
					continue
				}

				// Fetch regulation_id from regulations table based on regulation_code (if provided)
				let regulationId = null
				if (mapping.regulation_code) {
					const { data: regulationData, error: regulationError } = await supabase
						.from('regulations')
						.select('id')
						.eq('regulation_code', mapping.regulation_code)
						.eq('institution_code', mapping.institution_code)
						.single()

					if (regulationError || !regulationData) {
						errors.push({
							semester_code: mapping.semester_code,
							course_id: mapping.course_id,
							error: `Regulation not found: ${mapping.regulation_code}`
						})
						continue
					}
					regulationId = regulationData.id
				}

				// Check for duplicate mapping
				const { data: existing } = await supabase
					.from('course_mapping')
					.select('id')
					.eq('course_id', mapping.course_id)
					.eq('institution_code', mapping.institution_code)
					.eq('program_code', mapping.program_code)
					.eq('batch_code', mapping.batch_code)
					.eq('semester_code', mapping.semester_code || '')
					.eq('is_active', true)
					.single()

				if (existing) {
					errors.push({
						semester_code: mapping.semester_code,
						course_id: mapping.course_id,
						error: 'Duplicate mapping exists'
					})
					continue
				}

				const { data, error } = await supabase
					.from('course_mapping')
					.insert([{
						...mapping,
						course_code: courseData.course_code,
						institutions_id: institutionData.id,  // Add institution ID
						program_id: programData.id,           // Add program ID
						batch_id: batchData.id,               // Add batch ID
						regulation_id: regulationId,          // Add regulation ID if provided
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					}])
					.select('*')
					.single()

				if (error) {
					console.error('Error creating course mapping:', error)
					errors.push({
						semester_code: mapping.semester_code,
						course_id: mapping.course_id,
						error: error.message
					})
				} else {
					results.push(data)
				}
			}

			return NextResponse.json({
				success: results,
				errors: errors,
				message: `${results.length} mappings created successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
			})
		}

		// Single mapping creation (existing logic)
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

		// Fetch course_code from courses table
		const { data: courseData, error: courseError } = await supabase
			.from('courses')
			.select('course_code')
			.eq('id', body.course_id)
			.single()

		if (courseError || !courseData) {
			return NextResponse.json(
				{ error: 'Course not found' },
				{ status: 404 }
			)
		}

		// Fetch institution_id from institutions table based on institution_code
		const { data: institutionData, error: institutionError } = await supabase
			.from('institutions')
			.select('id')
			.eq('institution_code', body.institution_code)
			.single()

		if (institutionError || !institutionData) {
			return NextResponse.json(
				{ error: `Institution not found: ${body.institution_code}` },
				{ status: 404 }
			)
		}

		// Fetch program_id from programs table based on program_code
		const { data: programData, error: programError } = await supabase
			.from('programs')
			.select('id')
			.eq('program_code', body.program_code)
			.eq('institution_code', body.institution_code)
			.single()

		if (programError || !programData) {
			return NextResponse.json(
				{ error: `Program not found: ${body.program_code}` },
				{ status: 404 }
			)
		}

		// Fetch batch_id from batch table based on batch_code
		const { data: batchData, error: batchError } = await supabase
			.from('batch')
			.select('id')
			.eq('batch_code', body.batch_code)
			.eq('institution_code', body.institution_code)
			.single()

		if (batchError || !batchData) {
			return NextResponse.json(
				{ error: `Batch not found: ${body.batch_code}` },
				{ status: 404 }
			)
		}

		// Fetch regulation_id from regulations table based on regulation_code (if provided)
		let regulationId = null
		if (body.regulation_code) {
			const { data: regulationData, error: regulationError } = await supabase
				.from('regulations')
				.select('id')
				.eq('regulation_code', body.regulation_code)
				.eq('institution_code', body.institution_code)
				.single()

			if (regulationError || !regulationData) {
				return NextResponse.json(
					{ error: `Regulation not found: ${body.regulation_code}` },
					{ status: 404 }
				)
			}
			regulationId = regulationData.id
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
			.insert([{
				...body,
				course_code: courseData.course_code,
				institutions_id: institutionData.id,  // Add institution ID
				program_id: programData.id,           // Add program ID
				batch_id: batchData.id,               // Add batch ID
				regulation_id: regulationId           // Add regulation ID if provided
			}])
			.select('*')
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

		// If course_id is being updated, fetch the new course_code
		if (updateData.course_id) {
			const { data: courseData, error: courseError } = await supabase
				.from('courses')
				.select('course_code')
				.eq('id', updateData.course_id)
				.single()

			if (courseError || !courseData) {
				return NextResponse.json(
					{ error: 'Course not found' },
					{ status: 404 }
				)
			}

			updateData.course_code = courseData.course_code
		}

		const { data, error } = await supabase
			.from('course_mapping')
			.update(updateData)
			.eq('id', id)
			.select('*')
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
