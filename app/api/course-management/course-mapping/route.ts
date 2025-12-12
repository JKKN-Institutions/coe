import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)

		const includeDetails = searchParams.get('details') === 'true'
		const institutionCode = searchParams.get('institution_code')
		const programCode = searchParams.get('program_code')
		const regulationCode = searchParams.get('regulation_code')
		const semesterCode = searchParams.get('semester_code')
		const isActive = searchParams.get('is_active')

		if (includeDetails) {
			// Fetch course mappings with course details joined
			let query = supabase
				.from('course_mapping')
				.select(`
					*,
					course:courses!course_mapping_course_id_fkey (
						id,
						course_code,
						course_name
					)
				`)
				.order('created_at', { ascending: false })

			if (institutionCode) query = query.eq('institution_code', institutionCode)
			if (programCode) query = query.eq('program_code', programCode)
			if (regulationCode) query = query.eq('regulation_code', regulationCode)
			if (semesterCode) query = query.eq('semester_code', semesterCode)
			if (isActive !== null) query = query.eq('is_active', isActive === 'true')

			const { data, error } = await query

			if (error) {
				console.error('Course mapping view error:', error)
				return NextResponse.json({ error: error.message }, { status: 500 })
			}

			return NextResponse.json(data || [])
		} else {
			// Fetch course mappings with course details joined
			let query = supabase
				.from('course_mapping')
				.select(`
					*,
					course:courses!course_mapping_course_id_fkey (
						id,
						course_code,
						course_name
					)
				`)
				.order('course_order', { ascending: true })
				.order('created_at', { ascending: false })

			if (institutionCode) query = query.eq('institution_code', institutionCode)
			if (programCode) query = query.eq('program_code', programCode)
			if (regulationCode) query = query.eq('regulation_code', regulationCode)
			if (semesterCode) query = query.eq('semester_code', semesterCode)
			if (isActive !== null) query = query.eq('is_active', isActive === 'true')

			const { data, error } = await query

			if (error) {
				console.error('Error fetching course mappings:', error)
				return NextResponse.json({ error: error.message }, { status: 500 })
			}

			// If we have mappings and program_code, fetch semesters to get display_order
			if (data && data.length > 0 && programCode) {
				// Fetch program_id first
				const { data: programData } = await supabase
					.from('programs')
					.select('id')
					.eq('program_code', programCode)
					.single()

				if (programData) {
					// Fetch semesters for this program to get display_order mapping
					const { data: semesters } = await supabase
						.from('semesters')
						.select('semester_name, display_order, institution_code')
						.eq('program_id', programData.id)

					if (semesters) {
						// Create a map of semester_code to display_order
						const semesterOrderMap: { [key: string]: number } = {}
						semesters.forEach(sem => {
							// Generate semester_code in the same format as stored in course_mapping
							const semCode = `${sem.institution_code}-${programCode}-${sem.semester_name.replace(/\s+/g, '')}`
							semesterOrderMap[semCode] = sem.display_order
						})

						// Add display_order to each mapping
						const enrichedData = data.map(mapping => ({
							...mapping,
							semester_display_order: semesterOrderMap[mapping.semester_code] || 0
						}))

						// Sort by semester_display_order first, then by course_order
						enrichedData.sort((a, b) => {
							if (a.semester_display_order !== b.semester_display_order) {
								return a.semester_display_order - b.semester_display_order
							}
							return (a.course_order || 0) - (b.course_order || 0)
						})

						return NextResponse.json(enrichedData)
					}
				}
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
			const errors: Array<{ semester_code: string; course_id: string; error: string }> = []
			const validMappings: typeof body.mappings = []

			// Step 1: Validate required fields and marks consistency upfront
			for (const mapping of body.mappings) {
				if (!mapping.course_id || !mapping.institution_code || !mapping.program_code || !mapping.regulation_code) {
					errors.push({
						semester_code: mapping.semester_code,
						course_id: mapping.course_id,
						error: 'Missing required fields'
					})
					continue
				}

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

				validMappings.push(mapping)
			}

			if (validMappings.length === 0) {
				return NextResponse.json({
					success: [],
					errors,
					message: `0 mappings created, ${errors.length} failed validation`
				})
			}

			// Step 2: Batch fetch all required lookup data in parallel
			const uniqueCourseIds = [...new Set(validMappings.map(m => m.course_id))]
			const uniqueInstitutionCodes = [...new Set(validMappings.map(m => m.institution_code))]
			const uniqueProgramCodes = [...new Set(validMappings.map(m => m.program_code))]
			const uniqueRegulationCodes = [...new Set(validMappings.map(m => m.regulation_code).filter(Boolean))]

			// Parallel batch lookups - 4 queries instead of N*4
			const [coursesResult, institutionsResult, programsResult, regulationsResult] = await Promise.all([
				supabase.from('courses').select('id, course_code').in('id', uniqueCourseIds),
				supabase.from('institutions').select('id, institution_code').in('institution_code', uniqueInstitutionCodes),
				supabase.from('programs').select('id, program_code, institution_code').in('program_code', uniqueProgramCodes),
				uniqueRegulationCodes.length > 0
					? supabase.from('regulations').select('id, regulation_code, institution_code').in('regulation_code', uniqueRegulationCodes)
					: Promise.resolve({ data: [], error: null })
			])

			// Create lookup maps for O(1) access
			const courseMap = new Map<string, { id: string; course_code: string }>()
			coursesResult.data?.forEach(c => courseMap.set(c.id, c))

			const institutionMap = new Map<string, string>()
			institutionsResult.data?.forEach(i => institutionMap.set(i.institution_code, i.id))

			const programMap = new Map<string, string>()
			programsResult.data?.forEach(p => programMap.set(`${p.institution_code}:${p.program_code}`, p.id))

			const regulationMap = new Map<string, string>()
			regulationsResult.data?.forEach(r => regulationMap.set(`${r.institution_code}:${r.regulation_code}`, r.id))

			// Step 3: Build upsert records with resolved IDs
			const upsertRecords: any[] = []
			const now = new Date().toISOString()

			for (const mapping of validMappings) {
				const course = courseMap.get(mapping.course_id)
				if (!course) {
					errors.push({ semester_code: mapping.semester_code, course_id: mapping.course_id, error: 'Course not found' })
					continue
				}

				const institutionId = institutionMap.get(mapping.institution_code)
				if (!institutionId) {
					errors.push({ semester_code: mapping.semester_code, course_id: mapping.course_id, error: `Institution not found: ${mapping.institution_code}` })
					continue
				}

				const programId = programMap.get(`${mapping.institution_code}:${mapping.program_code}`)
				if (!programId) {
					errors.push({ semester_code: mapping.semester_code, course_id: mapping.course_id, error: `Program not found: ${mapping.program_code}` })
					continue
				}

				let regulationId = null
				if (mapping.regulation_code) {
					regulationId = regulationMap.get(`${mapping.institution_code}:${mapping.regulation_code}`)
					if (!regulationId) {
						errors.push({ semester_code: mapping.semester_code, course_id: mapping.course_id, error: `Regulation not found: ${mapping.regulation_code}` })
						continue
					}
				}

				upsertRecords.push({
					...mapping,
					course_code: course.course_code,
					institutions_id: institutionId,
					program_id: programId,
					regulation_id: regulationId,
					updated_at: now
				})
			}

			if (upsertRecords.length === 0) {
				return NextResponse.json({
					success: [],
					errors,
					message: `0 mappings created, ${errors.length} failed`
				})
			}

			// Step 4: Batch upsert all records in a single operation
			// Using onConflict for records with existing IDs (updates) and inserting new ones
			const recordsWithId = upsertRecords.filter(r => r.id)
			const recordsWithoutId = upsertRecords.filter(r => !r.id)

			let allResults: any[] = []

			// Bulk update existing records (those with id)
			if (recordsWithId.length > 0) {
				const { data: updateData, error: updateError } = await supabase
					.from('course_mapping')
					.upsert(recordsWithId, {
						onConflict: 'id',
						ignoreDuplicates: false
					})
					.select(`
						*,
						course:courses!course_mapping_course_id_fkey (
							id,
							course_code,
							course_name
						)
					`)

				if (updateError) {
					console.error('Bulk update error:', updateError)
					// Add all as errors
					recordsWithId.forEach(r => {
						errors.push({ semester_code: r.semester_code, course_id: r.course_id, error: updateError.message })
					})
				} else if (updateData) {
					allResults = [...allResults, ...updateData]
				}
			}

			// Bulk insert new records (those without id)
			if (recordsWithoutId.length > 0) {
				// Add created_at for new records
				const newRecords = recordsWithoutId.map(r => ({ ...r, created_at: now }))

				const { data: insertData, error: insertError } = await supabase
					.from('course_mapping')
					.insert(newRecords)
					.select(`
						*,
						course:courses!course_mapping_course_id_fkey (
							id,
							course_code,
							course_name
						)
					`)

				if (insertError) {
					console.error('Bulk insert error:', insertError)
					// Try individual inserts for better error granularity on duplicates
					for (const record of newRecords) {
						const { data: singleData, error: singleError } = await supabase
							.from('course_mapping')
							.insert([record])
							.select(`
								*,
								course:courses!course_mapping_course_id_fkey (
									id,
									course_code,
									course_name
								)
							`)
							.single()

						if (singleError) {
							errors.push({ semester_code: record.semester_code, course_id: record.course_id, error: singleError.message })
						} else if (singleData) {
							allResults.push(singleData)
						}
					}
				} else if (insertData) {
					allResults = [...allResults, ...insertData]
				}
			}

			return NextResponse.json({
				success: allResults,
				errors,
				message: `${allResults.length} mappings saved successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
			})
		}

		// Single mapping creation (existing logic)
		// Validate required fields - support both course_id and course_code
		if (!body.course_id && !body.course_code) {
			return NextResponse.json(
				{ error: 'course_id or course_code is required' },
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

		if (!body.regulation_code) {
			return NextResponse.json(
				{ error: 'regulation_code is required' },
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

		// Lookup course_id from course_code if course_id not provided
		let courseId = body.course_id
		let courseCode = body.course_code

		if (!courseId && courseCode) {
			// Lookup course by course_code
			const { data: courseData, error: courseError } = await supabase
				.from('courses')
				.select('id, course_code')
				.eq('course_code', courseCode)
				.single()

			if (courseError || !courseData) {
				return NextResponse.json(
					{ error: `Course not found with code: ${courseCode}` },
					{ status: 404 }
				)
			}
			courseId = courseData.id
			courseCode = courseData.course_code
		} else if (courseId && !courseCode) {
			// Fetch course_code from courses table using course_id
			const { data: courseData, error: courseError } = await supabase
				.from('courses')
				.select('course_code')
				.eq('id', courseId)
				.single()

			if (courseError || !courseData) {
				return NextResponse.json(
					{ error: 'Course not found' },
					{ status: 404 }
				)
			}
			courseCode = courseData.course_code
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

		// Fetch regulation_id from regulations table based on regulation_code
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

		// Check for duplicate mapping (NO BATCH)
		const { data: existing } = await supabase
			.from('course_mapping')
			.select('id')
			.eq('course_id', courseId)
			.eq('institution_code', body.institution_code)
			.eq('program_code', body.program_code)
			.eq('regulation_code', body.regulation_code)
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
				course_id: courseId,                  // Ensure course_id is set
				course_code: courseCode,              // Ensure course_code is set
				institutions_id: institutionData.id,  // Add institution ID
				program_id: programData.id,           // Add program ID
				regulation_id: regulationId           // Add regulation ID
			}])
			.select(`
				*,
				course:courses!course_mapping_course_id_fkey (
					id,
					course_code,
					course_name
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
			.select(`
				*,
				course:courses!course_mapping_course_id_fkey (
					id,
					course_code,
					course_name
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
