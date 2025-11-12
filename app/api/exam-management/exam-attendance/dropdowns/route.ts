import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: Cascading dropdown data for exam attendance form
export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const type = searchParams.get('type')
		const institutionId = searchParams.get('institution_id')
		const sessionId = searchParams.get('session_id')
		const programCode = searchParams.get('program_code')
		const examDate = searchParams.get('exam_date')
		const sessionType = searchParams.get('session_type')

		// 1. Fetch Institutions
		if (type === 'institutions') {
			const { data, error } = await supabase
				.from('institutions')
				.select('id, institution_code, name')
				.eq('is_active', true)
				.order('name', { ascending: true })

			if (error) {
				console.error('Error fetching institutions:', error)
				return NextResponse.json({ error: 'Failed to fetch institutions' }, { status: 500 })
			}

			// Map 'name' to 'institution_name' to match frontend interface
			const mappedData = (data || []).map(inst => ({
				id: inst.id,
				institution_code: inst.institution_code,
				institution_name: inst.name
			}))

			return NextResponse.json(mappedData)
		}

		// 2. Fetch Examination Sessions (filtered by institution)
		if (type === 'sessions' && institutionId) {
			const { data, error } = await supabase
				.from('examination_sessions')
				.select('id, session_name, session_code, semester_type, exam_start_date, exam_end_date')
				.eq('institutions_id', institutionId)
				.order('exam_start_date', { ascending: false })

			if (error) {
				console.error('Error fetching sessions:', error)
				return NextResponse.json({ error: 'Failed to fetch examination sessions' }, { status: 500 })
			}

			// Map the response to match frontend interface
			const mappedData = (data || []).map(session => ({
				id: session.id,
				session_name: session.session_name,
				session_code: session.session_code,
				session_type: session.semester_type, // Map semester_type to session_type
				start_date: session.exam_start_date,
				end_date: session.exam_end_date
			}))

			return NextResponse.json(mappedData)
		}

		// 3. Fetch Programs (filtered by institution and session)
	if (type === 'programs' && institutionId && sessionId) {
		const { data, error } = await supabase
			.from('course_offerings')
			.select(`
				program_id,
				programs!inner(
					id,
					program_code,
					program_name,
					program_order
				)
			`)
			.eq('institutions_id', institutionId)
			.eq('examination_session_id', sessionId)
			.eq('is_active', true)

		if (error) {
			console.error('Error fetching programs:', error)
			return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 })
		}

		// Extract unique programs
		const uniquePrograms = new Map()
		data?.forEach((item: any) => {
			const program = item.programs
			const programCode = program?.program_code
			if (program && programCode && !uniquePrograms.has(programCode)) {
				uniquePrograms.set(programCode, {
					id: program.id,
					program_code: programCode,
					program_name: program.program_name || programCode,
					program_order: program.program_order || 999
				})
			}
		})

		const programs = Array.from(uniquePrograms.values()).sort((a: any, b: any) => {
			// Sort by program_order first, then by program_code
			if (a.program_order !== b.program_order) {
				return a.program_order - b.program_order
			}
			return a.program_code.localeCompare(b.program_code)
		})

		return NextResponse.json(programs)
	}

	// 4. Fetch Exam Dates (filtered by examination_session, program_code, and TODAY's date only)
		if (type === 'exam_dates' && institutionId && sessionId && programCode) {
			const today = new Date().toISOString().split('T')[0]
			console.log('Fetching exam dates for:', { institutionId, sessionId, programCode, today })

			const { data, error } = await supabase
				.from('exam_timetables')
				.select(`
					id,
					exam_date,
					exam_time,
					session,
					duration_minutes,
					course_offering_id,
					course_offerings!inner(
						program_id,
						programs!inner(
							program_code
						)
					)
				`)
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('exam_date', today)
				.eq('is_published', true)
				.order('exam_time', { ascending: true })

			if (error) {
				console.error('Error fetching exam dates:', error)
				return NextResponse.json({ error: 'Failed to fetch exam dates', details: error }, { status: 500 })
			}

			console.log('Raw exam dates data:', data?.length, 'records')

			// Filter by program_code
			const filteredData = (data || []).filter((item: any) => {
				const itemProgramCode = item.course_offerings?.programs?.program_code
				return itemProgramCode === programCode
			})
			console.log('Filtered exam dates:', filteredData.length, 'records for program', programCode)

			// Get unique dates (remove duplicates)
			const uniqueDates = new Map()
			filteredData.forEach((item: any) => {
				const key = `${item.exam_date}-${item.session}`
				if (!uniqueDates.has(key)) {
					uniqueDates.set(key, item)
				}
			})

			const result = Array.from(uniqueDates.values())
			console.log('Returning unique exam dates:', result.length)
			return NextResponse.json(result)
		}

		// 5. Fetch Session Types (FN/AN) from exam_timetables for selected exam date and course
		if (type === 'session_types' && institutionId && sessionId && programCode && examDate) {
			const { data, error } = await supabase
				.from('exam_timetables')
				.select(`
					id,
					session,
					exam_time,
					course_offering_id,
					course_offerings!inner(
						program_id,
						programs!inner(
							program_code
						)
					)
				`)
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('exam_date', examDate)
				.eq('is_published', true)

			if (error) {
				console.error('Error fetching session types:', error)
				return NextResponse.json({ error: 'Failed to fetch session types' }, { status: 500 })
			}

			// Filter by course_code
			const filteredData = (data || []).filter((item: any) => {
				const itemProgramCode = item.course_offerings?.programs?.program_code
				return itemProgramCode === programCode
			})

			// Get unique sessions (FN/AN)
			const uniqueSessions = new Map()
			filteredData.forEach((item: any) => {
				const key = item.session
				if (!uniqueSessions.has(key)) {
					uniqueSessions.set(key, item)
				}
			})

			return NextResponse.json(Array.from(uniqueSessions.values()))
		}

		// 6. Fetch Courses - Following exact SQL pattern with exam_registrations as base
		// Pattern matches: exam_registrations → course_offerings → courses
		//                  LEFT JOIN exam_timetables ON et.course_id = c.id
		if (type === 'courses' && institutionId && sessionId && programCode && examDate && sessionType) {
			console.log('Fetching courses with params:', { institutionId, sessionId, programCode, examDate, sessionType })

			// Query exam_registrations as base table (matching SQL)
			const { data, error } = await supabase
				.from('exam_registrations')
				.select(`
					id,
					institutions!inner(id),
					course_offerings!inner(
						id,
						examination_sessions!inner(id),
						programs!inner(program_code),
						courses!inner(
							id,
							course_code,
							course_name
						)
					)
				`)
				.eq('institutions.id', institutionId)
				.eq('course_offerings.examination_sessions.id', sessionId)
				.eq('course_offerings.programs.program_code', programCode)

			if (error) {
				console.error('Error fetching courses from exam_registrations:', error)
				return NextResponse.json({ error: 'Failed to fetch courses', details: error }, { status: 500 })
			}

			console.log('Exam registrations query - records found:', data?.length)

			// Get unique course IDs
			const courseIds = new Set<string>()
			data?.forEach((item: any) => {
				const courseId = item.course_offerings?.courses?.id
				if (courseId) {
					courseIds.add(courseId)
				}
			})

			if (courseIds.size === 0) {
				return NextResponse.json([])
			}

			console.log('Found course IDs:', Array.from(courseIds))

			// Now filter by exam_timetables (et.course_id = c.id)
			const { data: timetableData, error: timetableError } = await supabase
				.from('exam_timetables')
				.select('course_id')
				.in('course_id', Array.from(courseIds))
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('exam_date', examDate)
				.eq('session', sessionType)
				.eq('is_published', true)

			if (timetableError) {
				console.error('Error fetching exam timetables:', timetableError)
				return NextResponse.json({ error: 'Failed to filter by exam timetables', details: timetableError }, { status: 500 })
			}

			console.log('Timetable matches found:', timetableData?.length)

			// Get valid course IDs that have timetables
			const validCourseIds = new Set(timetableData?.map((t: any) => t.course_id) || [])

			// Extract unique courses
			const uniqueCourses = new Map()
			data?.forEach((item: any) => {
				const course = item.course_offerings?.courses
				const courseId = course?.id
				const courseCode = course?.course_code

				if (course && courseId && validCourseIds.has(courseId) && !uniqueCourses.has(courseCode)) {
					uniqueCourses.set(courseCode, {
						course_code: courseCode,
						course_title: course.course_name || courseCode
					})
				}
			})

			const courses = Array.from(uniqueCourses.values()).sort((a: any, b: any) =>
				a.course_code.localeCompare(b.course_code)
			)

			console.log('Unique courses after timetable filter:', courses.length)
			return NextResponse.json(courses)
		}

		return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
	} catch (e) {
		console.error('Cascading dropdown API error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
