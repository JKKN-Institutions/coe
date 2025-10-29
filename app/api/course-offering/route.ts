import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET - Fetch all course offer with course title from course_mapping
export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const examinationSessionId = searchParams.get('examination_session_id')
		const courseId = searchParams.get('course_id')
		const institutionId = searchParams.get('institutions_id')
		const programId = searchParams.get('program_id')
		const semester = searchParams.get('semester')
		const isActive = searchParams.get('is_active')

		// First fetch course_offerings
		let query = supabase
			.from('course_offerings')
			.select('*')
			.order('created_at', { ascending: false })

		if (examinationSessionId) {
			query = query.eq('examination_session_id', examinationSessionId)
		}
		if (courseId) {
			query = query.eq('course_id', courseId)
		}
		if (institutionId) {
			query = query.eq('institutions_id', institutionId)
		}
		if (programId) {
			query = query.eq('program_id', programId)
		}
		if (semester) {
			query = query.eq('semester', parseInt(semester))
		}
		if (isActive !== null && isActive !== undefined) {
			query = query.eq('is_active', isActive === 'true')
		}

		const { data: offerings, error: offeringsError } = await query

		if (offeringsError) {
			console.error('Course offer table error:', offeringsError)
			return NextResponse.json({ error: 'Failed to fetch course offer' }, { status: 500 })
		}

		// Fetch course_mapping data with courses and semesters relationships
		// course_offerings.course_id -> course_mapping.id
		// course_mapping.course_id -> courses.id
		// course_mapping.semester_code -> semesters.semester_code
		const courseMappingIds = (offerings || []).map((o: any) => o.course_id).filter(Boolean)

		let courseMappingData: any[] = []
		if (courseMappingIds.length > 0) {
			const { data: mappingData, error: mappingError } = await supabase
				.from('course_mapping')
				.select(`
					id,
					course_id,
					semester_code,
					program_code,
					courses (
						id,
						course_code,
						course_name,
						institution_code,
						regulation_code
					)
				`)
				.in('id', courseMappingIds)

			if (mappingError) {
				console.error('Course mapping fetch error:', mappingError)
				console.error('Error details:', JSON.stringify(mappingError, null, 2))
				// Continue without course details rather than failing completely
			} else {
				courseMappingData = mappingData || []
			}
		}

		// Fetch semesters data to get semester_name from semester_code
		const semesterCodes = courseMappingData
			.map((cm: any) => cm.semester_code)
			.filter(Boolean)

		let semestersData: any[] = []
		if (semesterCodes.length > 0) {
			const { data: semData, error: semError } = await supabase
				.from('semesters')
				.select('semester_code, semester_name, semester_number')
				.in('semester_code', semesterCodes)

			if (semError) {
				console.error('Semesters fetch error:', semError)
				// Continue without semester names
			} else {
				semestersData = semData || []
			}
		}

		// Create a map for semester lookups: semester_code -> semester_name
		const semesterMap = new Map(
			semestersData.map((sem: any) => [sem.semester_code, sem])
		)

		// Create a map for quick lookup: course_mapping_id -> course details
		const courseMappingMap = new Map(
			courseMappingData.map((cm: any) => {
				const semesterInfo = semesterMap.get(cm.semester_code)
				return [
					cm.id,
					{
						course_code: cm.courses?.course_code || null,
						course_name: cm.courses?.course_name || null,
						program_code: cm.program_code || null,
						semester_code: cm.semester_code || null,
						semester_name: semesterInfo?.semester_name || null,
						semester_number: semesterInfo?.semester_number || null,
						institution_code: cm.courses?.institution_code || null,
						regulation_code: cm.courses?.regulation_code || null
					}
				]
			})
		)

		// Transform the data to include course details from courses table and semester info
		const transformedData = (offerings || []).map((item: any) => {
			const courseDetails = courseMappingMap.get(item.course_id) || {}
			return {
				...item,
				course_title: courseDetails.course_name || item.course_code || null,
				course_program_code: courseDetails.program_code || null,
				course_semester_code: courseDetails.semester_code || null,
				course_semester_name: courseDetails.semester_name || null,
				course_semester_number: courseDetails.semester_number || null,
				course_institution_code: courseDetails.institution_code || null,
				course_regulation_code: courseDetails.regulation_code || null
			}
		})

		return NextResponse.json(transformedData)
	} catch (e) {
		console.error('Course offer API error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// POST - Create new course offer
export async function POST(request: Request) {
	try {
		const body = await request.json()
		const supabase = getSupabaseServer()

		// Validate required fields
		if (!body.institutions_id) {
			return NextResponse.json({
				error: 'Institution is required'
			}, { status: 400 })
		}

		if (!body.course_id) {
			return NextResponse.json({
				error: 'Course is required'
			}, { status: 400 })
		}

		if (!body.examination_session_id) {
			return NextResponse.json({
				error: 'Examination session is required'
			}, { status: 400 })
		}

		if (!body.program_id) {
			return NextResponse.json({
				error: 'Program is required'
			}, { status: 400 })
		}

		if (!body.semester) {
			return NextResponse.json({
				error: 'Semester is required'
			}, { status: 400 })
		}

		// Validate semester range
		const semester = parseInt(body.semester)
		if (semester < 1 || semester > 12) {
			return NextResponse.json({
				error: 'Semester must be between 1 and 12'
			}, { status: 400 })
		}

		// Validate foreign key - institutions and get institution_code
		const { data: institutionData, error: institutionError } = await supabase
			.from('institutions')
			.select('id, institution_code')
			.eq('id', body.institutions_id)
			.maybeSingle()

		if (institutionError || !institutionData) {
			return NextResponse.json({
				error: `Institution not found. Please select a valid institution.`
			}, { status: 400 })
		}

		// Validate foreign key - examination_sessions and get session_code
		const { data: examSessionData, error: examSessionError } = await supabase
			.from('examination_sessions')
			.select('id, session_code')
			.eq('id', body.examination_session_id)
			.maybeSingle()

		if (examSessionError || !examSessionData) {
			return NextResponse.json({
				error: `Examination session not found. Please select a valid examination session.`
			}, { status: 400 })
		}

		// Validate foreign key - course_mapping and get course_code
		const { data: courseData, error: courseError } = await supabase
			.from('course_mapping')
			.select('id, course_code')
			.eq('id', body.course_id)
			.maybeSingle()

		if (courseError || !courseData) {
			return NextResponse.json({
				error: `Course not found. Please select a valid course.`
			}, { status: 400 })
		}

		// Validate foreign key - programs and get program_code
		const { data: programData, error: programError } = await supabase
			.from('programs')
			.select('id, program_code')
			.eq('id', body.program_id)
			.maybeSingle()

		if (programError || !programData) {
			return NextResponse.json({
				error: `Program not found. Please select a valid program.`
			}, { status: 400 })
		}

		// Validate numeric fields
		const maxEnrollment = body.max_enrollment ? parseInt(body.max_enrollment) : null
		const enrolledCount = body.enrolled_count ? parseInt(body.enrolled_count) : 0

		if (maxEnrollment !== null && maxEnrollment <= 0) {
			return NextResponse.json({
				error: 'Max enrollment must be greater than 0 or null'
			}, { status: 400 })
		}

		if (enrolledCount < 0) {
			return NextResponse.json({
				error: 'Enrolled count cannot be negative'
			}, { status: 400 })
		}

		if (maxEnrollment !== null && enrolledCount > maxEnrollment) {
			return NextResponse.json({
				error: 'Enrolled count cannot exceed max enrollment'
			}, { status: 400 })
		}

		const insertPayload: any = {
			institutions_id: body.institutions_id,
			institution_code: institutionData.institution_code,
			course_id: body.course_id,
			course_code: courseData.course_code,
			examination_session_id: body.examination_session_id,
			session_code: examSessionData.session_code,
			program_id: body.program_id,
			program_code: programData.program_code,
			semester: semester,
			section: body.section || null,
			faculty_id: body.faculty_id || null,
			max_enrollment: maxEnrollment,
			enrolled_count: enrolledCount,
			is_active: body.is_active ?? true,
			created_by: body.created_by || null,
		}

		const { data, error } = await supabase
			.from('course_offerings')
			.insert([insertPayload])
			.select()
			.single()

		if (error) {
			console.error('Error creating course offer:', error)

			// Handle duplicate key constraint violation
			if (error.code === '23505') {
				return NextResponse.json({
					error: `Course offer already exists for this combination: ${institutionData.institution_code}, ${courseData.course_code}, ${programData.program_code}, ${examSessionData.session_code}, Semester ${semester}.`
				}, { status: 400 })
			}

			// Handle foreign key constraint violation
			if (error.code === '23503') {
				return NextResponse.json({
					error: 'Invalid reference. Please select valid institution, examination session, course, and program.'
				}, { status: 400 })
			}

			// Handle check constraint violation
			if (error.code === '23514') {
				return NextResponse.json({
					error: 'Invalid value. Please check your input values (semester: 1-12, enrollment constraints).'
				}, { status: 400 })
			}

			return NextResponse.json({ error: 'Failed to create course offer' }, { status: 500 })
		}

		return NextResponse.json(data, { status: 201 })
	} catch (e) {
		console.error('Course offer creation error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// PUT - Update course offer
export async function PUT(request: Request) {
	try {
		const body = await request.json()
		const supabase = getSupabaseServer()

		if (!body.id) {
			return NextResponse.json({ error: 'Course offer ID is required' }, { status: 400 })
		}

		// Validate semester if provided
		if (body.semester) {
			const semester = parseInt(body.semester)
			if (semester < 1 || semester > 12) {
				return NextResponse.json({
					error: 'Semester must be between 1 and 12'
				}, { status: 400 })
			}
		}

		// Variables to store code values
		let institutionCode: string | undefined
		let sessionCode: string | undefined
		let courseCode: string | undefined
		let programCode: string | undefined

		// Validate foreign key - institutions (if provided)
		if (body.institutions_id) {
			const { data: institutionData, error: institutionError } = await supabase
				.from('institutions')
				.select('id, institution_code')
				.eq('id', body.institutions_id)
				.maybeSingle()

			if (institutionError || !institutionData) {
				return NextResponse.json({
					error: `Institution not found. Please select a valid institution.`
				}, { status: 400 })
			}
			institutionCode = institutionData.institution_code
		}

		// Validate foreign key - examination_sessions (if provided)
		if (body.examination_session_id) {
			const { data: examSessionData, error: examSessionError } = await supabase
				.from('examination_sessions')
				.select('id, session_code')
				.eq('id', body.examination_session_id)
				.maybeSingle()

			if (examSessionError || !examSessionData) {
				return NextResponse.json({
					error: `Examination session not found. Please select a valid examination session.`
				}, { status: 400 })
			}
			sessionCode = examSessionData.session_code
		}

		// Validate foreign key - course_mapping (if provided)
		if (body.course_id) {
			const { data: courseData, error: courseError } = await supabase
				.from('course_mapping')
				.select('id, course_code')
				.eq('id', body.course_id)
				.maybeSingle()

			if (courseError || !courseData) {
				return NextResponse.json({
					error: `Course not found. Please select a valid course.`
				}, { status: 400 })
			}
			courseCode = courseData.course_code
		}

		// Validate foreign key - programs (if provided)
		if (body.program_id) {
			const { data: programData, error: programError } = await supabase
				.from('programs')
				.select('id, program_code')
				.eq('id', body.program_id)
				.maybeSingle()

			if (programError || !programData) {
				return NextResponse.json({
					error: `Program not found. Please select a valid program.`
				}, { status: 400 })
			}
			programCode = programData.program_code
		}

		// Validate numeric fields if provided
		if (body.max_enrollment !== undefined) {
			const maxEnrollment = body.max_enrollment ? parseInt(body.max_enrollment) : null
			if (maxEnrollment !== null && maxEnrollment <= 0) {
				return NextResponse.json({
					error: 'Max enrollment must be greater than 0 or null'
				}, { status: 400 })
			}
		}

		if (body.enrolled_count !== undefined) {
			const enrolledCount = parseInt(body.enrolled_count)
			if (enrolledCount < 0) {
				return NextResponse.json({
					error: 'Enrolled count cannot be negative'
				}, { status: 400 })
			}
		}

		const updatePayload: any = {
			institutions_id: body.institutions_id,
			institution_code: institutionCode,
			course_id: body.course_id,
			course_code: courseCode,
			examination_session_id: body.examination_session_id,
			session_code: sessionCode,
			program_id: body.program_id,
			program_code: programCode,
			semester: body.semester ? parseInt(body.semester) : undefined,
			section: body.section,
			faculty_id: body.faculty_id,
			max_enrollment: body.max_enrollment ? parseInt(body.max_enrollment) : null,
			enrolled_count: body.enrolled_count !== undefined ? parseInt(body.enrolled_count) : undefined,
			is_active: body.is_active,
			updated_by: body.updated_by || null,
		}

		// Remove undefined fields
		Object.keys(updatePayload).forEach(key => {
			if (updatePayload[key] === undefined) {
				delete updatePayload[key]
			}
		})

		const { data, error } = await supabase
			.from('course_offerings')
			.update(updatePayload)
			.eq('id', body.id)
			.select()
			.single()

		if (error) {
			console.error('Error updating course offer:', error)

			// Handle duplicate key constraint violation
			if (error.code === '23505') {
				return NextResponse.json({
					error: 'Course offer already exists for this combination of institution, course, examination session, program, and semester.'
				}, { status: 400 })
			}

			// Handle foreign key constraint violation
			if (error.code === '23503') {
				return NextResponse.json({
					error: 'Invalid reference. Please select valid references.'
				}, { status: 400 })
			}

			// Handle check constraint violation
			if (error.code === '23514') {
				return NextResponse.json({
					error: 'Invalid value. Please check your input values (semester: 1-12, enrollment constraints).'
				}, { status: 400 })
			}

			return NextResponse.json({ error: 'Failed to update course offer' }, { status: 500 })
		}

		return NextResponse.json(data)
	} catch (e) {
		console.error('Course offer update error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// DELETE - Delete course offer
export async function DELETE(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json({ error: 'Course offer ID is required' }, { status: 400 })
		}

		const supabase = getSupabaseServer()

		const { error } = await supabase
			.from('course_offerings')
			.delete()
			.eq('id', id)

		if (error) {
			console.error('Error deleting course offer:', error)
			return NextResponse.json({ error: 'Failed to delete course offer' }, { status: 500 })
		}

		return NextResponse.json({ success: true })
	} catch (e) {
		console.error('Course offer deletion error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
