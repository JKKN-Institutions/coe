import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import type {
	StudentResultRow,
	GenerateFinalMarksPayload,
	GenerateFinalMarksResponse
} from '@/types/final-marks'

/**
 * GET /api/grading/final-marks
 * Fetch data for the final marks generation page
 * Actions: institutions, sessions, programs, courses, course-offerings, grades, final-marks
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const action = searchParams.get('action')
		const supabase = getSupabaseServer()

		switch (action) {
			case 'institutions': {
				const { data, error } = await supabase
					.from('institutions')
					.select('id, name, institution_code')
					.eq('is_active', true)
					.order('name')

				if (error) {
					console.error('Error fetching institutions:', error)
					return NextResponse.json({ error: 'Failed to fetch institutions' }, { status: 400 })
				}
				return NextResponse.json(data || [])
			}

			case 'sessions': {
				const institutionId = searchParams.get('institutionId')
				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				const { data, error } = await supabase
					.from('examination_sessions')
					.select('id, session_name, session_code')
					.eq('institutions_id', institutionId)
					.order('session_name', { ascending: false })

				if (error) {
					console.error('Error fetching sessions:', error)
					return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 400 })
				}
				return NextResponse.json(data || [])
			}

			case 'programs': {
				const institutionId = searchParams.get('institutionId')
				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				// Fetch programs with degree info
				const { data: programsData, error: programsError } = await supabase
					.from('programs')
					.select(`
						id,
						program_code,
						program_name,
						degree_id,
						degrees (
							id,
							degree_code,
							degree_name
						)
					`)
					.eq('institutions_id', institutionId)
					.eq('is_active', true)
					.order('program_name')

				if (programsError) {
					console.error('Error fetching programs:', programsError)
					return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 400 })
				}

				// Helper function to determine UG/PG from degree code/name
				const inferGradeSystem = (degreeCode?: string, degreeName?: string): 'UG' | 'PG' => {
					const code = (degreeCode || '').toUpperCase()
					const name = (degreeName || '').toUpperCase()
					// PG patterns: M.A., M.Sc., MBA, MCA, M.Com, M.Phil, Ph.D, etc.
					const pgPatterns = ['M.', 'MA', 'MSC', 'MBA', 'MCA', 'MCOM', 'MPHIL', 'PHD', 'PH.D', 'MASTER', 'POST']
					for (const pattern of pgPatterns) {
						if (code.includes(pattern) || name.includes(pattern)) {
							return 'PG'
						}
					}
					return 'UG'
				}

				// Transform to include grade_system_code based on degree name/code
				const transformed = programsData?.map((p: any) => {
					const degreeCode = p.degrees?.degree_code || null
					const degreeName = p.degrees?.degree_name || null
					return {
						id: p.id,
						program_code: p.program_code,
						program_name: p.program_name,
						degree_id: p.degree_id,
						degree_code: degreeCode,
						degree_name: degreeName,
						grade_system_code: inferGradeSystem(degreeCode, degreeName)
					}
				}) || []

				return NextResponse.json(transformed)
			}

			case 'course-offerings': {
				const institutionId = searchParams.get('institutionId')
				const programId = searchParams.get('programId')
				const programCode = searchParams.get('programCode')
				const sessionId = searchParams.get('sessionId')

				// Support both programCode and programId (lookup program_code from programs table)
				let filterProgramCode = programCode
				if (!filterProgramCode && programId) {
					// Lookup program_code from local programs table
					const { data: programData } = await supabase
						.from('programs')
						.select('program_code')
						.eq('id', programId)
						.single()
					filterProgramCode = programData?.program_code
				}

				if (!filterProgramCode) {
					return NextResponse.json({ error: 'Program code or ID is required' }, { status: 400 })
				}

				// First fetch course_offerings - filter by program_code (not program_id)
				// course_offerings.program_id is MyJKKN UUID, but we have local programs.id
				// course_offerings.program_code is the CODE field which matches programs.program_code
				let query = supabase
					.from('course_offerings')
					.select(`
						id,
						course_id,
						course_mapping_id,
						program_id,
						program_code,
						semester,
						section
					`)
					.eq('program_code', filterProgramCode)
					.eq('is_active', true)

				if (sessionId) {
					query = query.eq('examination_session_id', sessionId)
				}

				const { data: offerings, error } = await query.order('semester')

				if (error) {
					console.error('Error fetching course offerings:', error)
					return NextResponse.json({ error: 'Failed to fetch course offerings' }, { status: 400 })
				}

				// Get course_mapping IDs to fetch course details
				// course_offerings.course_mapping_id is the FK to course_mapping.id
				// course_offerings.course_id is a denormalized FK to courses.id (different!)
				const courseMappingIds = (offerings || []).map((o: any) => o.course_mapping_id).filter(Boolean)

				let courseMappingData: any[] = []
				if (courseMappingIds.length > 0) {
					const { data: mappingData, error: mappingError } = await supabase
						.from('course_mapping')
						.select(`
							id,
							course_id,
							course_code,
							internal_max_mark,
							internal_pass_mark,
							external_max_mark,
							external_pass_mark,
							total_max_mark,
							total_pass_mark,
							courses (
								id,
								course_code,
								course_name,
								course_type,
								credit
							)
						`)
						.in('id', courseMappingIds)

					if (mappingError) {
						console.error('Course mapping fetch error:', mappingError)
					} else {
						courseMappingData = mappingData || []
					}
				}

				// Create a map for quick lookup: course_mapping_id -> course details
				const courseMappingMap = new Map(
					courseMappingData.map((cm: any) => [
						cm.id,
						{
							course_id: cm.courses?.id || cm.course_id,
							course_code: cm.courses?.course_code || cm.course_code,
							course_name: cm.courses?.course_name || cm.courses?.course_code || cm.course_code,
							course_type: cm.courses?.course_type,
							credit: cm.courses?.credit
						}
					])
				)

				// Check which courses already have final marks saved and their result_status
				// Map: course_id -> { is_saved: boolean, result_status: string }
				const courseStatusMap = new Map<string, { is_saved: boolean; result_status: string }>()
				if (institutionId && sessionId && offerings && offerings.length > 0) {
					// Get actual course IDs from course_mapping (courses.id, not course_mapping.id)
					const courseIds = offerings
						.map((co: any) => {
							const mapping = courseMappingMap.get(co.course_mapping_id)
							return mapping?.course_id
						})
						.filter(Boolean)

					if (courseIds.length > 0) {
						const { data: savedMarks } = await supabase
							.from('final_marks')
							.select('course_id, result_status')
							.eq('institutions_id', institutionId)
							.eq('program_id', programId)
							.eq('examination_session_id', sessionId)
							.in('course_id', courseIds)
							.eq('is_active', true)

						if (savedMarks) {
							// Group by course_id and get the most restrictive status
							// Priority: Published > Under Review > Withheld > Cancelled > Pending
							const statusPriority: Record<string, number> = {
								'Published': 5,
								'Under Review': 4,
								'Withheld': 3,
								'Cancelled': 2,
								'Pending': 1
							}

							savedMarks.forEach((m: any) => {
								const existing = courseStatusMap.get(m.course_id)
								const currentPriority = statusPriority[m.result_status] || 0
								const existingPriority = existing ? (statusPriority[existing.result_status] || 0) : 0

								if (!existing || currentPriority > existingPriority) {
									courseStatusMap.set(m.course_id, {
										is_saved: true,
										result_status: m.result_status
									})
								}
							})
						}
					}
				}

				// Transform to flatten course data and include result_status
				const transformed = (offerings || []).map((co: any) => {
					const courseDetails = courseMappingMap.get(co.course_mapping_id) || {}
					const actualCourseId = courseDetails.course_id || co.course_id
					const status = courseStatusMap.get(actualCourseId)
					return {
						id: co.id,
						course_id: actualCourseId,
						course_mapping_id: co.course_mapping_id,
						program_id: co.program_id,
						semester: co.semester,
						section: co.section,
						course_code: courseDetails.course_code,
						course_name: courseDetails.course_name || courseDetails.course_code,
						course_type: courseDetails.course_type,
						credits: courseDetails.credit,
						is_saved: status?.is_saved || false,
						result_status: status?.result_status || null,
						// Can regenerate only if no results exist for this course
						// Once results are saved, regeneration is blocked regardless of status
						can_regenerate: !status
					}
				})

				return NextResponse.json(transformed)
			}

			case 'courses': {
				const institutionId = searchParams.get('institutionId')
				const programId = searchParams.get('programId')

				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				let query = supabase
					.from('courses')
					.select(`
						id,
						course_code,
						course_type,
						credit
					`)
					.eq('institutions_id', institutionId)
					.eq('is_active', true)

				const { data, error } = await query.order('course_code')

				if (error) {
					console.error('Error fetching courses:', error)
					return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 400 })
				}
				return NextResponse.json(data || [])
			}

			case 'grades': {
				const institutionId = searchParams.get('institutionId')
				const regulationId = searchParams.get('regulationId')

				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				let query = supabase
					.from('grades')
					.select('*')
					.eq('institutions_id', institutionId)

				if (regulationId) {
					query = query.eq('regulation_id', regulationId)
				}

				const { data, error } = await query.order('min_mark', { ascending: false })

				if (error) {
					console.error('Error fetching grades:', error)
					return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 400 })
				}
				return NextResponse.json(data || [])
			}

			case 'final-marks': {
				const institutionId = searchParams.get('institutionId')
				const sessionId = searchParams.get('sessionId')
				const programId = searchParams.get('programId')
				const courseId = searchParams.get('courseId')
				const resultStatus = searchParams.get('resultStatus')

				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				let query = supabase
					.from('final_marks_detailed_view')
					.select('*')
					.eq('institutions_id', institutionId)
					.eq('is_active', true)

				if (sessionId) query = query.eq('examination_session_id', sessionId)
				if (programId) query = query.eq('program_id', programId)
				if (courseId) query = query.eq('course_id', courseId)
				if (resultStatus) query = query.eq('result_status', resultStatus)

				const { data, error } = await query.order('created_at', { ascending: false })

				if (error) {
					console.error('Error fetching final marks:', error)
					return NextResponse.json({ error: 'Failed to fetch final marks' }, { status: 400 })
				}
				return NextResponse.json(data || [])
			}

			case 'exam-registrations': {
				const institutionId = searchParams.get('institutionId')
				const sessionId = searchParams.get('sessionId')
				const programId = searchParams.get('programId')

				if (!institutionId || !sessionId) {
					return NextResponse.json({ error: 'Institution ID and Session ID are required' }, { status: 400 })
				}

				let query = supabase
					.from('exam_registrations')
					.select(`
						id,
						stu_register_no,
						student_id,
						student_name,
						course_offering_id,
						examination_session_id,
						institutions_id,
						course_offerings!inner (
							id,
							course_id,
							program_id,
							semester,
							courses!inner (
								id,
								course_code,
								course_type,
								credit
							)
						)
					`)
					.eq('institutions_id', institutionId)
					.eq('examination_session_id', sessionId)

				if (programId) {
					query = query.eq('course_offerings.program_id', programId)
				}

				const { data, error } = await query

				if (error) {
					console.error('Error fetching exam registrations:', error)
					return NextResponse.json({ error: 'Failed to fetch exam registrations' }, { status: 400 })
				}
				return NextResponse.json(data || [])
			}

			default:
				return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
		}
	} catch (error) {
		console.error('Final marks API GET error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

/**
 * POST /api/grading/final-marks
 * Generate final marks for selected courses
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const body: GenerateFinalMarksPayload = await request.json()

		const {
			institutions_id,
			program_id,
			examination_session_id,
			course_ids,
			regulation_id,
			grade_system_code,
			calculated_by,
			save_to_db = false
		} = body

		// Validate required fields
		if (!institutions_id || !program_id || !examination_session_id || !course_ids?.length) {
			return NextResponse.json({
				error: 'Missing required fields: institutions_id, program_id, examination_session_id, course_ids'
			}, { status: 400 })
		}

		// Lookup program_code from local programs table
		// program_id from payload is local programs.id, but course_offerings.program_id is MyJKKN UUID
		// We need to use program_code which is consistent across both systems
		const { data: programData } = await supabase
			.from('programs')
			.select('program_code')
			.eq('id', program_id)
			.single()

		const programCode = programData?.program_code
		if (!programCode) {
			return NextResponse.json({
				error: 'Program not found or program_code is missing'
			}, { status: 400 })
		}

		// =========================================================
		// BUSINESS RULE: Check if results already exist
		// Generation is ONLY allowed when NO records exist for the course
		// Once results are saved, regeneration is blocked regardless of status
		// =========================================================
		const { data: existingResults, error: existingError } = await supabase
			.from('final_marks')
			.select('course_id, result_status')
			.eq('institutions_id', institutions_id)
			.eq('program_id', program_id)
			.eq('examination_session_id', examination_session_id)
			.in('course_id', course_ids)
			.eq('is_active', true)

		if (existingError) {
			console.error('Error checking existing results:', existingError)
		}

		// If any course has saved results, block regeneration
		if (existingResults && existingResults.length > 0) {
			// Get unique course IDs with saved results
			const blockedCourseIds = [...new Set(existingResults.map(r => r.course_id))]
			const blockedStatuses = [...new Set(existingResults.map(r => r.result_status))]

			return NextResponse.json({
				error: `Cannot regenerate results. ${blockedCourseIds.length} course(s) already have saved results (status: ${blockedStatuses.join(', ')}). Once results are saved, regeneration is not allowed.`,
				blocked_courses: blockedCourseIds,
				blocked_statuses: blockedStatuses
			}, { status: 400 })
		}

		// 1. Fetch grade_system table with grades info for percentage-based grading
		let gradesQuery = supabase
			.from('grade_system')
			.select(`
				id,
				grade_system_code,
				grade,
				grade_point,
				min_mark,
				max_mark,
				description,
				grades:grade_id (
					id,
					qualify,
					is_absent,
					exclude_cgpa,
					result_status
				)
			`)
			.eq('institutions_id', institutions_id)
			.eq('is_active', true)

		if (regulation_id) {
			gradesQuery = gradesQuery.eq('regulation_id', regulation_id)
		}
		if (grade_system_code) {
			gradesQuery = gradesQuery.eq('grade_system_code', grade_system_code)
		}

		const { data: grades, error: gradesError } = await gradesQuery.order('min_mark', { ascending: false })

		if (gradesError || !grades?.length) {
			console.error('Grade system error:', gradesError)
			return NextResponse.json({
				error: 'No grade system found. Please configure grades first.'
			}, { status: 400 })
		}

		// 2. First, get course codes for the given course IDs
		// course_ids from frontend are courses.id (UUIDs)
		// We need to get course_codes to filter course_offerings
		console.log('[Final Marks] Received course_ids from frontend:', course_ids)

		const { data: coursesData } = await supabase
			.from('courses')
			.select('id, course_code')
			.in('id', course_ids)

		console.log('[Final Marks] Found courses in DB:', coursesData?.length || 0, coursesData?.map((c: any) => c.course_code))

		const courseCodes = (coursesData || []).map((c: any) => c.course_code).filter(Boolean)

		if (courseCodes.length === 0) {
			return NextResponse.json({
				error: 'No courses found for the selected course IDs.'
			}, { status: 400 })
		}

		// Create a map of course_code -> course_id for later use
		const courseCodeToIdMap = new Map(
			(coursesData || []).map((c: any) => [c.course_code, c.id])
		)

		// 3. Fetch exam registrations with course_offerings
		// NOTE: Don't filter by program_code here because courses can be shared across programs
		// Instead, filter by course_code and let the course selection determine which courses to include
		console.log('[Final Marks] Query params:')
		console.log('  - institutions_id:', institutions_id)
		console.log('  - examination_session_id:', examination_session_id)
		console.log('  - program_code (for reference):', programCode)
		console.log('  - course_codes:', courseCodes)

		// Step 1: Get exam_registrations for the program (without course_code filter on join)
		const { data: examRegsRaw, error: examRegError } = await supabase
			.from('exam_registrations')
			.select(`
				id,
				stu_register_no,
				student_id,
				student_name,
				course_offering_id,
				examination_session_id,
				institutions_id,
				program_code,
				course_offerings (
					id,
					course_id,
					course_mapping_id,
					program_id,
					program_code,
					course_code,
					semester
				)
			`)
			.eq('institutions_id', institutions_id)
			.eq('examination_session_id', examination_session_id)
			.eq('program_code', programCode)

		if (examRegError) {
			console.error('Error fetching exam registrations:', examRegError)
			return NextResponse.json({ error: 'Failed to fetch exam registrations' }, { status: 400 })
		}

		console.log('[Final Marks] Raw exam registrations for program:', examRegsRaw?.length || 0)

		// Step 2: Filter by course_code client-side
		// The course_offerings.course_code must match one of our selected course codes
		const examRegistrations = (examRegsRaw || []).filter((er: any) => {
			const coCode = er.course_offerings?.course_code
			return coCode && courseCodes.includes(coCode)
		})

		if (!examRegistrations?.length) {
			console.log('[Final Marks] No matches after course_code filter')
			console.log('[Final Marks] Available course_codes in exam_regs:',
				[...new Set((examRegsRaw || []).map((er: any) => er.course_offerings?.course_code).filter(Boolean))]
			)
			return NextResponse.json({
				error: 'No exam registrations found for the selected courses and session.'
			}, { status: 400 })
		}

		console.log('[Final Marks] Exam registrations found after course filter:', examRegistrations.length)
		console.log('[Final Marks] Sample exam reg:', JSON.stringify(examRegistrations[0], null, 2))

		// 3a. Fetch course_mapping data for the course offerings
		// course_offerings.course_id references course_mapping.id
		// NOTE: course_offerings has both course_id (FK to course_mapping) and course_mapping_id
		const courseMappingIds = [...new Set(
			examRegistrations.map((er: any) => er.course_offerings?.course_mapping_id || er.course_offerings?.course_id).filter(Boolean)
		)]

		console.log('[Final Marks] Course mapping IDs to fetch:', courseMappingIds)

		const { data: courseMappingData } = await supabase
			.from('course_mapping')
			.select(`
				id,
				course_id,
				course_code,
				internal_max_mark,
				internal_pass_mark,
				external_max_mark,
				external_pass_mark,
				total_max_mark,
				total_pass_mark
			`)
			.in('id', courseMappingIds)

		// Create course_mapping lookup map: course_mapping.id -> mapping data
		const courseMappingMap = new Map<string, any>()
		courseMappingData?.forEach((cm: any) => {
			courseMappingMap.set(cm.id, cm)
		})

		console.log('[Final Marks] Course mappings found:', courseMappingData?.length || 0)
		console.log('[Final Marks] Sample course mapping:', courseMappingData?.[0])

		// 3b. Fetch course details for the course_mapping entries
		const actualCourseIds = [...new Set(
			(courseMappingData || []).map((cm: any) => cm.course_id).filter(Boolean)
		)]

		console.log('[Final Marks] Actual course IDs to fetch:', actualCourseIds)

		const { data: courseDetails } = await supabase
			.from('courses')
			.select(`
				id,
				course_code,
				course_name,
				course_type,
				credit,
				evaluation_type,
				internal_max_mark,
				internal_pass_mark,
				internal_converted_mark,
				external_max_mark,
				external_pass_mark,
				external_converted_mark,
				total_max_mark,
				total_pass_mark
			`)
			.in('id', actualCourseIds)

		// Create courses lookup map: courses.id -> course data
		const coursesMap = new Map<string, any>()
		courseDetails?.forEach((c: any) => {
			coursesMap.set(c.id, c)
		})

		console.log('[Final Marks] Courses found:', courseDetails?.length || 0)
		console.log('[Final Marks] Sample course:', courseDetails?.[0])

		// 4. Fetch internal marks for these students/courses
		const studentIds = [...new Set(examRegistrations.map((er: any) => er.student_id))]
		const { data: internalMarks, error: internalError } = await supabase
			.from('internal_marks')
			.select('*')
			.eq('institutions_id', institutions_id)
			.eq('examination_session_id', examination_session_id)
			.in('student_id', studentIds)
			.in('course_id', course_ids)
			.eq('is_active', true)

		if (internalError) {
			console.error('Error fetching internal marks:', internalError)
		}

		// Create internal marks lookup map: student_id + course_id -> marks
		const internalMarksMap = new Map<string, any>()
		internalMarks?.forEach((im: any) => {
			const key = `${im.student_id}|${im.course_id}`
			internalMarksMap.set(key, im)
		})

		// 4. Fetch external marks (marks_entry table)
		const examRegIds = examRegistrations.map((er: any) => er.id)
		const { data: externalMarks, error: externalError } = await supabase
			.from('marks_entry')
			.select('*')
			.in('exam_registration_id', examRegIds)

		if (externalError) {
			console.error('Error fetching external marks:', externalError)
		}

		// Create external marks lookup map: exam_registration_id -> marks
		const externalMarksMap = new Map<string, any>()
		externalMarks?.forEach((em: any) => {
			externalMarksMap.set(em.exam_registration_id, em)
		})

		// 5. Fetch exam attendance records for absence checking
		// NOTE: Only attendance_status column exists (is_absent column doesn't exist)
		const { data: examAttendance, error: attendanceError } = await supabase
			.from('exam_attendance')
			.select('id, exam_registration_id, attendance_status')
			.in('exam_registration_id', examRegIds)

		if (attendanceError) {
			console.error('Error fetching exam attendance:', attendanceError)
		}

		// Create exam attendance lookup map: exam_registration_id -> attendance record
		const examAttendanceMap = new Map<string, any>()
		examAttendance?.forEach((ea: any) => {
			examAttendanceMap.set(ea.exam_registration_id, ea)
		})

		// 6. Process each exam registration and calculate final marks
		const results: StudentResultRow[] = []
		const errors: Array<{
			student_id: string
			student_name: string
			register_no: string
			course_code: string
			error: string
		}> = []

		const summary = {
			passed: 0,
			failed: 0,
			absent: 0,
			reappear: 0,
			withheld: 0,
			distinction: 0,
			first_class: 0,
			skipped_no_attendance: 0,
			skipped_missing_marks: 0
		}

		let skippedNoCourse = 0
		let skippedNoMapping = 0
		for (const examReg of examRegistrations) {
			const courseOffering = (examReg as any).course_offerings
			// Look up course_mapping and course from our maps
			// course_offerings.course_mapping_id is the FK to course_mapping.id
			const courseMappingId = courseOffering?.course_mapping_id || courseOffering?.course_id
			const courseMapping = courseMappingMap.get(courseMappingId)
			const course = courseMapping ? coursesMap.get(courseMapping.course_id) : null

			if (!courseMapping) {
				skippedNoMapping++
				continue
			}
			if (!course) {
				skippedNoCourse++
				continue
			}

			const internalKey = `${examReg.student_id}|${course.id}`
			const internalMark = internalMarksMap.get(internalKey)
			const externalMark = externalMarksMap.get(examReg.id)
			const attendanceRecord = examAttendanceMap.get(examReg.id)

			// =========================================================
			// BUSINESS RULE: Validation before generating final marks
			// 1. Attendance is mandatory - No attendance record → Skip
			// 2. Internal and External marks are required (both must exist)
			// 3. For courses with evaluation_type = 'CIA & ESE':
			//    - If internal exists but external missing → Skip
			//    - If external exists but internal missing → Skip
			// 4. Generate only when: attendance + internal + external all exist
			// =========================================================

			// Rule 1: Attendance is mandatory
			if (!attendanceRecord) {
				// No attendance record means student didn't appear for exam
				// Skip this student-course combination (no result needed)
				summary.skipped_no_attendance++
				continue
			}

			// Check if student is marked absent in attendance
			// NOTE: Only attendance_status column exists (is_absent column doesn't exist)
			const isAbsent = attendanceRecord.attendance_status?.toLowerCase() === 'absent'

			// Check marks availability
			const hasInternalMark = internalMark && internalMark.total_internal_marks !== null && internalMark.total_internal_marks !== undefined
			const hasExternalMark = externalMark && externalMark.total_marks_obtained !== null && externalMark.total_marks_obtained !== undefined
			const evaluationType = course.evaluation_type?.toUpperCase() || ''

			// Determine evaluation type category
			const isCIAandESE = evaluationType === 'CIA & ESE' || evaluationType === 'CIA AND ESE' || evaluationType === 'CIA&ESE'
			const isCIAOnly = evaluationType === 'CIA' || evaluationType === 'CIA ONLY'
			const isESEOnly = evaluationType === 'ESE' || evaluationType === 'ESE ONLY'

			// =========================================================
			// VALIDATION RULES:
			// 1. Absent in attendance → Generate with AAA grade, 0 GP (always)
			// 2. Present + CIA & ESE + missing internal OR external → Skip
			// 3. Present + CIA only + missing external → Generate normally (internal only)
			// 4. Present + ESE only + missing internal → Generate normally (external only)
			// 5. Present + Other types + both marks missing → Skip
			// 6. Present + all required marks exist → Generate normally
			// =========================================================

			// If student is absent, we generate AAA grade regardless of marks availability
			// No validation needed for absent students

			// If student is present, validate marks based on evaluation type
			if (!isAbsent) {
				if (isCIAandESE) {
					// CIA & ESE: Both internal AND external marks are required
					if (!hasInternalMark || !hasExternalMark) {
						summary.skipped_missing_marks++
						continue
					}
				} else if (isCIAOnly) {
					// CIA only: Internal mark is required (external is optional)
					if (!hasInternalMark) {
						summary.skipped_missing_marks++
						continue
					}
				} else if (isESEOnly) {
					// ESE only: External mark is required (internal is optional)
					if (!hasExternalMark) {
						summary.skipped_missing_marks++
						continue
					}
				} else {
					// Other evaluation types: At least one mark type should exist
					if (!hasInternalMark && !hasExternalMark) {
						summary.skipped_missing_marks++
						continue
					}
				}
			}

			// Get marks configuration - prioritize course_mapping values over generic course values
			// course_mapping has program/semester specific pass marks
			const internalMax = Number(courseMapping?.internal_max_mark || course.internal_max_mark) || 0
			const internalPassMark = Number(courseMapping?.internal_pass_mark || course.internal_pass_mark) || 0
			const externalMax = Number(courseMapping?.external_max_mark || course.external_max_mark) || 0
			const externalPassMark = Number(courseMapping?.external_pass_mark || course.external_pass_mark) || 0
			const totalMax = Number(courseMapping?.total_max_mark || course.total_max_mark) || 0
			const totalPassMark = Number(courseMapping?.total_pass_mark || course.total_pass_mark) || 0

			// Get marks obtained (cap at max values)
			let internalMarksObtained = Number(internalMark?.total_internal_marks) || 0
			let externalMarksObtained = Number(externalMark?.total_marks_obtained) || 0

			// Validate: marks should not exceed max marks
			if (internalMarksObtained > internalMax) {
				internalMarksObtained = internalMax
			}
			if (externalMarksObtained > externalMax) {
				externalMarksObtained = externalMax
			}

			// Calculate total (cap at total max)
			let totalMarks = internalMarksObtained + externalMarksObtained
			if (totalMarks > totalMax) {
				totalMarks = totalMax
			}

			const percentage = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100 * 100) / 100 : 0

			// Determine pass/fail based on course rules
			let failReason: 'INTERNAL' | 'EXTERNAL' | 'TOTAL' | null = null
			let isPass = true

			// Case 1: Student is absent in external exam (from exam_attendance)
			if (isAbsent) {
				isPass = false
				failReason = 'EXTERNAL'
			}
			// Case 2: Student is present, check pass conditions
			else {
				// Check internal pass condition
				if (internalPassMark > 0 && internalMarksObtained < internalPassMark) {
					isPass = false
					failReason = 'INTERNAL'
				}
				// Check external pass condition
				else if (externalPassMark > 0 && externalMarksObtained < externalPassMark) {
					isPass = false
					failReason = 'EXTERNAL'
				}
				// Check total pass condition
				else if (totalPassMark > 0 && totalMarks < totalPassMark) {
					isPass = false
					failReason = 'TOTAL'
				}
			}

			// Determine grade based on percentage
			let gradeEntry: any = undefined

			// Grade lookup based on attendance and pass status
			if (isAbsent) {
				// ABSENT: Find absent grade from grade_system (AAA grade)
				gradeEntry = grades.find((g: any) => g.grades?.is_absent === true || (g.min_mark === -1 && g.max_mark === -1))
			} else if (!isPass) {
				// FAILED: Find fail/reappear grade (U grade)
				gradeEntry = grades.find((g: any) => g.grade === 'U' || g.grades?.result_status === 'REAPPEAR')
			} else {
				// PASSED: Find grade by percentage range
				gradeEntry = grades.find((g: any) => percentage >= g.min_mark && percentage <= g.max_mark)
			}

			// Determine letter grade based on attendance and pass status
			let letterGrade: string
			let gradePoint: number
			let gradeDescription: string

			if (isAbsent) {
				// ABSENT (from exam_attendance): Always use AAA grade, grade_point = 0
				letterGrade = 'AAA'
				gradePoint = 0
				gradeDescription = 'Absent'
			} else if (!isPass) {
				// FAILED: Always use U grade, grade_point = 0
				letterGrade = 'U'
				gradePoint = 0
				gradeDescription = 'Re-Appear'
			} else {
				// PASSED: Use grade letter from grade_system
				// Grade point = total_marks / 10 (e.g., 59 marks = 5.9 GP, 74 marks = 7.4 GP)
				letterGrade = gradeEntry?.grade || 'RA'
				gradePoint = Math.round((totalMarks / 10) * 100) / 100 // Round to 2 decimal places
				gradeDescription = gradeEntry?.description || ''
			}
			const credits = course.credit || 0
			const creditPoints = gradePoint * credits

			// Determine pass status based on attendance and course rules
			let passStatus: 'Pass' | 'Fail' | 'Reappear' | 'Absent' | 'Withheld' | 'Expelled' = 'Fail'
			if (isAbsent) {
				passStatus = 'Absent'
				summary.absent++
			} else if (isPass) {
				passStatus = 'Pass'
				summary.passed++
				// Check distinction/first class based on grade description and calculated grade point
				const gradeDesc = (gradeEntry?.description || '').toUpperCase()
				const gradeLetter = (gradeEntry?.grade || '').toUpperCase()
				// Distinction: D, D+ grades or description contains 'DISTINCTION'
				if (gradeLetter === 'D' || gradeLetter === 'D+' || gradeDesc.includes('DISTINCTION')) {
					summary.distinction++
				}
				// First class: A, A+, D, D+, O grades or description contains 'FIRST' or grade_point >= 6.0
				if (gradeLetter === 'A' || gradeLetter === 'A+' || gradeLetter === 'D' || gradeLetter === 'D+' || gradeLetter === 'O' ||
					gradeDesc.includes('FIRST') || gradePoint >= 6.0) {
					summary.first_class++
				}
			} else {
				passStatus = 'Reappear'
				summary.failed++
				summary.reappear++
			}

			const resultRow: StudentResultRow = {
				student_id: examReg.student_id,
				student_name: examReg.student_name || 'Unknown',
				register_no: examReg.stu_register_no || 'N/A',
				exam_registration_id: examReg.id,
				course_offering_id: courseOffering.id,
				course_id: course.id,
				course_code: course.course_code,
				course_name: course.course_name || course.course_code,
				internal_marks: internalMarksObtained,
				internal_max: internalMax,
				internal_pass_mark: internalPassMark,
				external_marks: externalMarksObtained,
				external_max: externalMax,
				external_pass_mark: externalPassMark,
				total_marks: totalMarks,
				total_max: totalMax,
				total_pass_mark: totalPassMark,
				percentage,
				grade: letterGrade,
				grade_point: gradePoint,
				grade_description: gradeDescription,
				credits,
				credit_points: creditPoints,
				pass_status: passStatus,
				is_pass: isPass,
				is_absent: isAbsent,
				fail_reason: failReason,
				internal_marks_id: internalMark?.id || null,
				marks_entry_id: externalMark?.id || null
			}

			results.push(resultRow)
		}

		console.log('[Final Marks] Processing complete:')
		console.log('  - Total exam registrations:', examRegistrations.length)
		console.log('  - Skipped (no course mapping):', skippedNoMapping)
		console.log('  - Skipped (no course):', skippedNoCourse)
		console.log('  - Skipped (missing marks):', summary.skipped_missing_marks)
		console.log('  - Results generated:', results.length)

		// 6. Save to database if requested
		let savedCount = 0
		if (save_to_db && results.length > 0) {
			for (const result of results) {
				try {
					// Calculate total_grade_points: credit * grade_points (0 if fail/absent)
					const totalGradePoints = result.is_pass
						? result.credits * result.grade_point
						: 0

					const insertData = {
						institutions_id,
						examination_session_id,
						exam_registration_id: result.exam_registration_id,
						course_offering_id: result.course_offering_id,
						program_id,
						course_id: result.course_id,
						student_id: result.student_id,
						internal_marks_id: result.internal_marks_id,
						marks_entry_id: result.marks_entry_id,
						internal_marks_obtained: result.internal_marks,
						internal_marks_maximum: result.internal_max,
						external_marks_obtained: result.external_marks,
						external_marks_maximum: result.external_max,
						total_marks_obtained: result.total_marks,
						total_marks_maximum: result.total_max,
						percentage: result.percentage,
						grace_marks: 0,
						letter_grade: result.grade,
						grade_points: result.grade_point,
						grade_description: result.grade_description,
						is_pass: result.is_pass,
						pass_status: result.pass_status,
						result_status: 'Pending',
						calculated_by: calculated_by || null,
						calculated_at: new Date().toISOString(),
						is_active: true,
						// New fields for NAAD/ABC export
						credit: result.credits,
						total_grade_points: totalGradePoints
					}

					const { error: insertError } = await supabase
						.from('final_marks')
						.upsert(insertData, {
							onConflict: 'student_id,course_id,examination_session_id'
						})

					if (insertError) {
						console.error('Error saving final mark:', insertError)
						errors.push({
							student_id: result.student_id,
							student_name: result.student_name,
							register_no: result.register_no,
							course_code: result.course_code,
							error: insertError.message
						})
					} else {
						savedCount++
					}
				} catch (err) {
					console.error('Error saving final mark:', err)
					errors.push({
						student_id: result.student_id,
						student_name: result.student_name,
						register_no: result.register_no,
						course_code: result.course_code,
						error: err instanceof Error ? err.message : 'Unknown error'
					})
				}
			}
		}

		const response: GenerateFinalMarksResponse = {
			success: true,
			total_students: [...new Set(results.map(r => r.student_id))].length,
			total_courses: course_ids.length,
			results,
			summary,
			saved_count: savedCount,
			errors: errors.length > 0 ? errors : undefined
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Final marks API POST error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

/**
 * DELETE /api/grading/final-marks
 * Delete final marks by ID
 */
export async function DELETE(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json({ error: 'ID is required' }, { status: 400 })
		}

		// Check if the record is locked or published
		const { data: existing, error: fetchError } = await supabase
			.from('final_marks')
			.select('is_locked, result_status')
			.eq('id', id)
			.single()

		if (fetchError) {
			return NextResponse.json({ error: 'Record not found' }, { status: 404 })
		}

		if (existing.is_locked) {
			return NextResponse.json({ error: 'Cannot delete locked record' }, { status: 400 })
		}

		if (existing.result_status === 'Published') {
			return NextResponse.json({ error: 'Cannot delete published result' }, { status: 400 })
		}

		// Soft delete
		const { error } = await supabase
			.from('final_marks')
			.update({ is_active: false })
			.eq('id', id)

		if (error) {
			console.error('Error deleting final mark:', error)
			return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
		}

		return NextResponse.json({ message: 'Record deleted successfully' })
	} catch (error) {
		console.error('Final marks DELETE error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
