import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
	const supabase = getSupabaseServer()
	const searchParams = request.nextUrl.searchParams

	const type = searchParams.get('type')
	const institutionId = searchParams.get('institution_id')
	const sessionId = searchParams.get('session_id')
	const programId = searchParams.get('program_id')
	const semester = searchParams.get('semester')

	try {
		// Dropdown: Get institutions
		if (type === 'institutions') {
			const { data, error } = await supabase
				.from('institutions')
				.select('id, institution_code, name')
				.eq('is_active', true)
				.order('name')

			if (error) throw error
			// Map to expected format
			const mapped = (data || []).map(inst => ({
				id: inst.id,
				institution_code: inst.institution_code,
				institution_name: inst.name
			}))
			return NextResponse.json(mapped)
		}

		// Dropdown: Get examination sessions for institution
		if (type === 'sessions') {
			if (!institutionId) {
				return NextResponse.json({ error: 'institution_id is required' }, { status: 400 })
			}

			const { data, error } = await supabase
				.from('examination_sessions')
				.select('id, session_name, session_code, semester_type, exam_start_date, exam_end_date')
				.eq('institutions_id', institutionId)
				.order('exam_start_date', { ascending: false })

			if (error) throw error
			// Map to expected format
			const mapped = (data || []).map(session => ({
				id: session.id,
				session_name: session.session_name,
				session_code: session.session_code,
				session_type: session.semester_type,
				start_date: session.exam_start_date,
				end_date: session.exam_end_date
			}))
			return NextResponse.json(mapped)
		}

		// Dropdown: Get programs from MyJKKN API
		// Programs are fetched from MyJKKN API using myjkkn_institution_ids
		if (type === 'programs') {
			if (!institutionId || !sessionId) {
				return NextResponse.json({ error: 'institution_id and session_id are required' }, { status: 400 })
			}

			// Get the institution's myjkkn_institution_ids
			const { data: institution, error: instError } = await supabase
				.from('institutions')
				.select('myjkkn_institution_ids')
				.eq('id', institutionId)
				.single()

			if (instError) throw instError

			const myjkknIds = institution?.myjkkn_institution_ids || []
			console.log('Fetching programs for myjkkn_institution_ids:', myjkknIds)

			if (myjkknIds.length === 0) {
				console.log('No myjkkn_institution_ids found for institution:', institutionId)
				return NextResponse.json([])
			}

			// Fetch programs from internal MyJKKN API route for each institution ID
			const allPrograms: any[] = []
			const seenCodes = new Set<string>()
			const baseUrl = request.nextUrl.origin

			for (const myjkknInstId of myjkknIds) {
				try {
					const myjkknUrl = `${baseUrl}/api/myjkkn/programs?institution_id=${myjkknInstId}&is_active=true&limit=1000`
					console.log('Fetching from internal MyJKKN route:', myjkknUrl)

					const res = await fetch(myjkknUrl)

					if (res.ok) {
						const response = await res.json()
						const data = response.data || response || []

						console.log('MyJKKN programs response for', myjkknInstId, ':', Array.isArray(data) ? data.length : 0, 'programs')

						// Client-side filter by institution_id and deduplicate by program_code
						if (Array.isArray(data)) {
							for (const p of data) {
								// MyJKKN uses program_id as CODE field (e.g., "BCA"), NOT UUID
								const programCode = p?.program_id || p?.program_code
								// Filter by institution_id since MyJKKN may not filter server-side
								if (programCode && p.is_active !== false && p.institution_id === myjkknInstId && !seenCodes.has(programCode)) {
									seenCodes.add(programCode)
									allPrograms.push({
										id: p.id, // UUID from MyJKKN
										program_code: programCode,
										program_name: p.program_name || p.name || programCode,
										display_name: p.program_name || p.name || programCode
									})
								}
							}
						}
					} else {
						console.error('MyJKKN API error:', res.status, res.statusText)
					}
				} catch (fetchError) {
					console.error('Error fetching from MyJKKN for institution', myjkknInstId, ':', fetchError)
				}
			}

			// Sort by program_code
			allPrograms.sort((a, b) => (a.program_code || '').localeCompare(b.program_code || ''))

			console.log('Total unique programs from MyJKKN:', allPrograms.length)
			return NextResponse.json(allPrograms)
		}

		// Dropdown: Get semesters for a program in a session
		// Note: programId can be either MyJKKN UUID or program_code - we filter using exact match first, then ilike
		if (type === 'semesters') {
			if (!institutionId || !sessionId || !programId) {
				return NextResponse.json({ error: 'institution_id, session_id, and program_id are required' }, { status: 400 })
			}

			console.log('Fetching semesters for:', { institutionId, sessionId, programId })

			let semesterSet = new Set<number>()

			// Strategy 1: Try course_offerings with EXACT match on program_code first
			const { data: coExactData, error: coExactError } = await supabase
				.from('course_offerings')
				.select('semester, program_code')
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('program_code', programId)
				.eq('is_active', true)

			if (!coExactError && coExactData && coExactData.length > 0) {
				console.log('Found semesters from course_offerings (exact match):', coExactData.length)
				coExactData.forEach((item: any) => {
					if (item.semester && typeof item.semester === 'number') {
						semesterSet.add(item.semester)
					}
				})
			}

			// Strategy 2: Try course_offerings with ilike pattern if exact match failed
			if (semesterSet.size === 0) {
				console.log('No exact match, trying ilike pattern on course_offerings...')
				const { data: coIlikeData, error: coIlikeError } = await supabase
					.from('course_offerings')
					.select('semester, program_code')
					.eq('institutions_id', institutionId)
					.eq('examination_session_id', sessionId)
					.ilike('program_code', `%${programId}%`)
					.eq('is_active', true)

				if (!coIlikeError && coIlikeData && coIlikeData.length > 0) {
					console.log('Found semesters from course_offerings (ilike):', coIlikeData.length)
					coIlikeData.forEach((item: any) => {
						if (item.semester && typeof item.semester === 'number') {
							semesterSet.add(item.semester)
						}
					})
				}
			}

			// Strategy 3: Try final_marks with exact match on program_code
			if (semesterSet.size === 0) {
				console.log('No semesters from course_offerings, trying final_marks (exact)...')
				const { data: fmExactData, error: fmExactError } = await supabase
					.from('final_marks')
					.select(`
						id,
						program_code,
						course_offerings:course_offering_id (
							semester
						)
					`)
					.eq('institutions_id', institutionId)
					.eq('examination_session_id', sessionId)
					.eq('program_code', programId)
					.eq('is_active', true)

				if (!fmExactError && fmExactData && fmExactData.length > 0) {
					console.log('Found semesters from final_marks (exact):', fmExactData.length)
					fmExactData.forEach((item: any) => {
						const semester = item.course_offerings?.semester
						if (semester && typeof semester === 'number') {
							semesterSet.add(semester)
						}
					})
				}
			}

			// Strategy 4: Try final_marks with ilike pattern
			if (semesterSet.size === 0) {
				console.log('No semesters from final_marks exact, trying ilike...')
				const { data: fmIlikeData, error: fmIlikeError } = await supabase
					.from('final_marks')
					.select(`
						id,
						program_code,
						course_offerings:course_offering_id (
							semester
						)
					`)
					.eq('institutions_id', institutionId)
					.eq('examination_session_id', sessionId)
					.ilike('program_code', `%${programId}%`)
					.eq('is_active', true)

				if (!fmIlikeError && fmIlikeData && fmIlikeData.length > 0) {
					console.log('Found semesters from final_marks (ilike):', fmIlikeData.length)
					fmIlikeData.forEach((item: any) => {
						const semester = item.course_offerings?.semester
						if (semester && typeof semester === 'number') {
							semesterSet.add(semester)
						}
					})
				}
			}

			// Strategy 5: Try semester_results with exact match
			if (semesterSet.size === 0) {
				console.log('No semesters from final_marks, trying semester_results (exact)...')
				const { data: srExactData, error: srExactError } = await supabase
					.from('semester_results')
					.select('semester, program_code')
					.eq('institutions_id', institutionId)
					.eq('examination_session_id', sessionId)
					.eq('program_code', programId)
					.eq('is_active', true)

				if (!srExactError && srExactData && srExactData.length > 0) {
					console.log('Found semesters from semester_results (exact):', srExactData.length)
					srExactData.forEach((item: any) => {
						if (item.semester && typeof item.semester === 'number') {
							semesterSet.add(item.semester)
						}
					})
				}
			}

			// Strategy 6: Try semester_results with ilike
			if (semesterSet.size === 0) {
				console.log('No semesters from semester_results exact, trying ilike...')
				const { data: srIlikeData, error: srIlikeError } = await supabase
					.from('semester_results')
					.select('semester, program_code')
					.eq('institutions_id', institutionId)
					.eq('examination_session_id', sessionId)
					.ilike('program_code', `%${programId}%`)
					.eq('is_active', true)

				if (!srIlikeError && srIlikeData && srIlikeData.length > 0) {
					console.log('Found semesters from semester_results (ilike):', srIlikeData.length)
					srIlikeData.forEach((item: any) => {
						if (item.semester && typeof item.semester === 'number') {
							semesterSet.add(item.semester)
						}
					})
				}
			}

			// Strategy 7: If still no semesters, try course_offerings without session filter
			if (semesterSet.size === 0) {
				console.log('No semesters found, trying course_offerings without session filter...')
				const { data: allCoData, error: allCoError } = await supabase
					.from('course_offerings')
					.select('semester, program_code')
					.eq('institutions_id', institutionId)
					.eq('program_code', programId)
					.eq('is_active', true)

				if (!allCoError && allCoData && allCoData.length > 0) {
					allCoData.forEach((item: any) => {
						if (item.semester && typeof item.semester === 'number') {
							semesterSet.add(item.semester)
						}
					})
					console.log('Semesters from course_offerings (no session filter):', Array.from(semesterSet))
				}
			}

			console.log('Unique semesters found:', Array.from(semesterSet))

			const uniqueSemesters = Array.from(semesterSet)
				.sort((a, b) => a - b)
				.map(sem => ({ semester: sem, label: `Semester ${sem}` }))

			return NextResponse.json(uniqueSemesters)
		}

		// Main Report: Get galley report data
		if (!institutionId || !sessionId || !programId || !semester) {
			return NextResponse.json({
				error: 'institution_id, session_id, program_id, and semester are required for report generation'
			}, { status: 400 })
		}

		// DEBUG: Check if final_marks has ANY data at all for this institution
		const { data: debugAny, error: debugAnyError } = await supabase
			.from('final_marks')
			.select('id, program_code, examination_session_id, institutions_id')
			.eq('institutions_id', institutionId)
			.eq('is_active', true)
			.limit(5)

		console.log('=== GALLEY REPORT DEBUG ===')
		console.log('Request params:', { institutionId, sessionId, programId, semester })

		if (debugAnyError) {
			console.log('DEBUG: Error checking final_marks:', debugAnyError.message)
		} else if (!debugAny || debugAny.length === 0) {
			console.log('DEBUG: NO DATA in final_marks for institution:', institutionId)
			console.log('DEBUG: You need to calculate/import final marks first!')
		} else {
			console.log('DEBUG: Found', debugAny.length, 'records in final_marks for this institution')
			const uniqueSessions = [...new Set(debugAny.map(d => d.examination_session_id))]
			const uniquePrograms = [...new Set(debugAny.map(d => d.program_code))]
			console.log('DEBUG: Available examination_session_ids:', uniqueSessions)
			console.log('DEBUG: Available program_codes:', uniquePrograms)
			console.log('DEBUG: Expected sessionId:', sessionId)
			console.log('DEBUG: Expected programId:', programId)

			// Check if the session matches
			if (!uniqueSessions.includes(sessionId)) {
				console.log('DEBUG: WARNING - sessionId NOT FOUND in final_marks!')
			}
		}
		console.log('=== END DEBUG ===')

		// Fetch institution details (only basic fields needed for header)
		const { data: institutionRaw, error: instError } = await supabase
			.from('institutions')
			.select('id, institution_code, name')
			.eq('id', institutionId)
			.single()

		if (instError) throw instError

		// Map to expected format
		const institution = institutionRaw ? {
			id: institutionRaw.id,
			institution_code: institutionRaw.institution_code,
			institution_name: institutionRaw.name
		} : null

		// Fetch session details
		const { data: sessionRaw, error: sessError } = await supabase
			.from('examination_sessions')
			.select('id, session_name, session_code, semester_type, exam_start_date, exam_end_date')
			.eq('id', sessionId)
			.single()

		if (sessError) throw sessError

		// Map to expected format
		const session = sessionRaw ? {
			id: sessionRaw.id,
			session_name: sessionRaw.session_name,
			session_code: sessionRaw.session_code,
			session_type: sessionRaw.semester_type,
			start_date: sessionRaw.exam_start_date,
			end_date: sessionRaw.exam_end_date
		} : null

		// Fetch program details from MyJKKN API using program_code
		// Get myjkkn_institution_ids from institution
		const { data: instForProgram, error: instForProgramError } = await supabase
			.from('institutions')
			.select('myjkkn_institution_ids')
			.eq('id', institutionId)
			.single()

		const myjkknIds = instForProgram?.myjkkn_institution_ids || []
		const baseUrl = request.nextUrl.origin

		// Fetch program name from MyJKKN API
		let programName = programId // Default to program_code if not found
		let programDegree = null

		for (const myjkknInstId of myjkknIds) {
			try {
				const programsRes = await fetch(`${baseUrl}/api/myjkkn/programs?institution_id=${myjkknInstId}&is_active=true&limit=1000`)
				if (programsRes.ok) {
					const programsResponse = await programsRes.json()
					const programsData = programsResponse.data || programsResponse || []
					if (Array.isArray(programsData)) {
						// Find program by program_code (MyJKKN uses program_id as CODE)
						const matchedProgram = programsData.find((p: any) =>
							(p.program_id === programId || p.program_code === programId) && p.institution_id === myjkknInstId
						)
						if (matchedProgram) {
							programName = matchedProgram.program_name || matchedProgram.name || programId
							break
						}
					}
				}
			} catch (e) {
				console.error('Error fetching program from MyJKKN:', e)
			}
		}

		// Construct program object
		const program = {
			id: programId,
			program_code: programId,
			program_name: programName,
			display_name: programName,
			degrees: programDegree
		}

		// Fetch final marks with direct query and joins
		// Note: We use exam_registrations for student info since users table FK is not in schema cache
		// Try exact match first on program_code, then ilike for %value% pattern
		const finalMarksSelect = `
			id,
			internal_marks_obtained,
			internal_marks_maximum,
			external_marks_obtained,
			external_marks_maximum,
			total_marks_obtained,
			total_marks_maximum,
			percentage,
			letter_grade,
			grade_points,
			is_pass,
			pass_status,
			result_status,
			student_id,
			course_id,
			course_offering_id,
			exam_registrations:exam_registration_id (
				id,
				stu_register_no,
				student_name,
				is_regular
			),
			courses:course_id (
				id,
				course_code,
				course_name,
				credit
			),
			course_offerings:course_offering_id (
				semester,
				course_id
			)
		`

		// Try exact match first
		let finalMarksRaw = null
		const { data: fmExact, error: fmExactError } = await supabase
			.from('final_marks')
			.select(finalMarksSelect)
			.eq('institutions_id', institutionId)
			.eq('examination_session_id', sessionId)
			.eq('program_code', programId)
			.eq('is_active', true)

		console.log('Searching final_marks with:', { institutionId, sessionId, programId })

		// DEBUG: Check what program_codes exist for this institution and session
		const { data: debugData, error: debugError } = await supabase
			.from('final_marks')
			.select('program_code, institutions_id, examination_session_id')
			.eq('institutions_id', institutionId)
			.eq('examination_session_id', sessionId)
			.eq('is_active', true)
			.limit(20)

		if (debugError) {
			console.log('DEBUG query error:', debugError)
		} else {
			const uniquePrograms = [...new Set((debugData || []).map((d: any) => d.program_code))]
			console.log('DEBUG: Available program_codes in final_marks for this institution/session:', uniquePrograms)
			console.log('DEBUG: Looking for programId:', programId, '| Type:', typeof programId)
		}

		// DEBUG: Check if any data exists for this institution (without session filter)
		if (!debugData || debugData.length === 0) {
			const { data: debugNoSession, error: debugNoSessionError } = await supabase
				.from('final_marks')
				.select('program_code, examination_session_id, institutions_id')
				.eq('institutions_id', institutionId)
				.eq('is_active', true)
				.limit(20)

			if (!debugNoSessionError && debugNoSession) {
				const uniqueSessions = [...new Set((debugNoSession || []).map((d: any) => d.examination_session_id))]
				const uniqueProgsNoSession = [...new Set((debugNoSession || []).map((d: any) => d.program_code))]
				console.log('DEBUG (no session filter): Found', debugNoSession.length, 'records')
				console.log('DEBUG: Available sessions:', uniqueSessions)
				console.log('DEBUG: Available program_codes:', uniqueProgsNoSession)
				console.log('DEBUG: Expected sessionId:', sessionId)
			}
		}

		if (!fmExactError && fmExact && fmExact.length > 0) {
			finalMarksRaw = fmExact
			console.log('Found final_marks with exact program_code match:', fmExact.length)
		} else {
			console.log('Exact match failed, error:', fmExactError, 'data length:', fmExact?.length || 0)
			// Fallback to ilike pattern
			const { data: fmIlike, error: fmIlikeError } = await supabase
				.from('final_marks')
				.select(finalMarksSelect)
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.ilike('program_code', `%${programId}%`)
				.eq('is_active', true)

			if (fmIlikeError) throw fmIlikeError
			finalMarksRaw = fmIlike
			console.log('Found final_marks with ilike program_code match:', fmIlike?.length || 0)
		}

		// Get unique course IDs from final_marks (these reference courses.id)
		const courseIds = [...new Set(
			(finalMarksRaw || [])
				.map((m: any) => m.course_id)
				.filter(Boolean)
		)]

		console.log('Course IDs from final_marks:', courseIds)

		// Fetch course_order from course_mapping table using course_id, program_code, and semester
		// course_mapping.course_id references courses.id
		let courseMappingMap = new Map<string, number>()
		if (courseIds.length > 0) {
			// Build semester_code - could be "1", "SEM1", etc.
			const semesterCodes = [semester, `SEM${semester}`, `Sem${semester}`, `sem${semester}`]

			const { data: courseMappings, error: cmError } = await supabase
				.from('course_mapping')
				.select('id, course_id, course_order, program_code, semester_code, courses:course_id(course_code)')
				.in('course_id', courseIds)
				.eq('program_code', programId)
				.eq('is_active', true)

			if (!cmError && courseMappings) {
				console.log('Course mapping data with course_order:', courseMappings.map((cm: any) => ({
					course_id: cm.course_id,
					course_code: cm.courses?.course_code,
					course_order: cm.course_order,
					program_code: cm.program_code,
					semester_code: cm.semester_code
				})))

				// Map by course_id (courses.id) -> course_order
				courseMappings.forEach((cm: any) => {
					// Use ?? to handle null/undefined, preserve 0 as valid order
					courseMappingMap.set(cm.course_id, cm.course_order ?? 999)
				})

				console.log('courseMappingMap entries:', Array.from(courseMappingMap.entries()))
			} else if (cmError) {
				console.error('Error fetching course_mapping:', cmError)
			}
		}

		// Filter by semester (from course_offerings) and transform data
		// UPDATED: Include ALL courses from current examination session (no semester/pass filtering)
		const semesterNum = parseInt(semester)

		console.log('Filtering by semester:', semesterNum)
		console.log('finalMarksRaw count:', finalMarksRaw?.length || 0)
		console.log('Sample finalMarksRaw course_offerings:', finalMarksRaw?.slice(0, 3).map((m: any) => ({
			course_offerings_semester: m.course_offerings?.semester,
			course_offerings_course_id: m.course_offerings?.course_id,
			course_code: m.courses?.course_code,
			is_pass: m.is_pass
		})))

		const filteredMarksRaw = (finalMarksRaw || [])
			.filter((mark: any) => {
				const courseSemester = mark.course_offerings?.semester

				// CRITICAL FIX: Handle undefined courseSemester (missing course_offerings data)
				if (courseSemester === undefined || courseSemester === null) {
					console.warn('Missing course_offerings.semester for course:', mark.courses?.course_code, 'student:', mark.exam_registrations?.stu_register_no)
					return false  // Skip courses with missing semester data
				}

			// UPDATED LOGIC: Include ALL courses from current examination session
			// No need to filter by semester or pass/fail status since we already filtered by session
			// This includes:
			// - Current semester courses (e.g., Sem 2 for students in Sem 2)
			// - Arrear courses from previous semesters (both passed and failed)
			// - All courses are from the same examination_session_id
			return true
			})

		console.log('✅ All courses from current examination session:', filteredMarksRaw.length)

		// Count by semester
		const currentSemesterCount = filteredMarksRaw.filter((m: any) => m.course_offerings?.semester === semesterNum).length
		const previousSemesterCount = filteredMarksRaw.filter((m: any) => m.course_offerings?.semester < semesterNum).length
		console.log(`  Current semester (${semesterNum}): ${currentSemesterCount}`)
		console.log(`  Previous semesters (arrears/passed): ${previousSemesterCount}`)

		const filteredMarks = filteredMarksRaw.map((mark: any) => {
				// Get student name from exam_registrations
				const studentName = mark.exam_registrations?.student_name || ''
				const nameParts = studentName.split(' ')

				// Get course_order from course_mapping using course_id (courses.id)
				const courseId = mark.course_id
				const courseOrder = courseId ? (courseMappingMap.get(courseId) ?? 999) : 999

				// Get course semester from course_offerings
				const courseSemester = mark.course_offerings?.semester || 0

				// Get is_regular from exam_registrations (TRUE = current semester, FALSE = arrear)
				// CRITICAL FIX: Don't default to true - use the actual value or determine based on semester
				let isRegular = mark.exam_registrations?.is_regular
				if (isRegular === undefined || isRegular === null) {
					// Fallback: If is_regular is not set, determine based on course semester
					// If course semester matches selected semester, it's likely regular
					isRegular = (courseSemester === semesterNum)
				}

				return {
					id: mark.id,
					internal_marks_obtained: mark.internal_marks_obtained,
					internal_marks_maximum: mark.internal_marks_maximum,
					external_marks_obtained: mark.external_marks_obtained,
					external_marks_maximum: mark.external_marks_maximum,
					total_marks_obtained: mark.total_marks_obtained,
					total_marks_maximum: mark.total_marks_maximum,
					percentage: mark.percentage,
					letter_grade: mark.letter_grade,
					grade_points: mark.grade_points,
					is_pass: mark.is_pass,
					pass_status: mark.pass_status,
					result_status: mark.result_status,
					is_regular: isRegular,  // ADDED: Track if course is current semester (TRUE) or arrear (FALSE)
					students: {
						id: mark.student_id,
						first_name: nameParts[0] || '',
						last_name: nameParts.slice(1).join(' ') || '',
						register_number: mark.exam_registrations?.stu_register_no || '',
						roll_number: mark.exam_registrations?.stu_register_no || ''
					},
					courses: {
						id: mark.courses?.id || mark.course_id,
						course_code: mark.courses?.course_code || '',
						course_name: mark.courses?.course_name || '',
						display_code: mark.courses?.course_code || '',
						credit: mark.courses?.credit || 0,
						internal_max_mark: mark.internal_marks_maximum,
						external_max_mark: mark.external_marks_maximum,
						total_max_mark: mark.total_marks_maximum,
						course_category: null,
						course_type: null,
						course_order: courseOrder,
						semester: courseSemester  // ADDED: Include semester for sorting and display
					}
				}
			})

		// Fetch semester results for the students (no need for students join - we get it from final_marks)
		// Try exact match first on program_code, then ilike for %value% pattern
		const semesterResultsSelect = `
			id,
			student_id,
			semester,
			sgpa,
			cgpa,
			percentage,
			total_credits_registered,
			total_credits_earned,
			result_status,
			result_class,
			is_distinction,
			is_first_class,
			total_backlogs
		`

		let semesterResults = null

		// Try exact match first
		const { data: srExact, error: srExactError } = await supabase
			.from('semester_results')
			.select(semesterResultsSelect)
			.eq('institutions_id', institutionId)
			.eq('examination_session_id', sessionId)
			.eq('program_code', programId)
			.eq('semester', parseInt(semester))
			.eq('is_active', true)

		if (!srExactError && srExact && srExact.length > 0) {
			semesterResults = srExact
			console.log('Found semester_results with exact program_code match:', srExact.length)
		} else {
			// Fallback to ilike pattern
			const { data: srIlike, error: srIlikeError } = await supabase
				.from('semester_results')
				.select(semesterResultsSelect)
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.ilike('program_code', `%${programId}%`)
				.eq('semester', parseInt(semester))
				.eq('is_active', true)

			if (srIlikeError) console.error('Error fetching semester_results:', srIlikeError)
			semesterResults = srIlike
			console.log('Found semester_results with ilike program_code match:', srIlike?.length || 0)
		}

		// Group marks by student
		const studentMarksMap = new Map()
		filteredMarks.forEach((mark: any) => {
			const studentId = mark.students?.id
			if (!studentId) return

			if (!studentMarksMap.has(studentId)) {
				studentMarksMap.set(studentId, {
					student: mark.students,
					courses: []
				})
			}
			studentMarksMap.get(studentId).courses.push({
				course: mark.courses,
				internal_marks: mark.internal_marks_obtained,
				internal_max: mark.internal_marks_maximum,
				external_marks: mark.external_marks_obtained,
				external_max: mark.external_marks_maximum,
				total_marks: mark.total_marks_obtained,
				total_max: mark.total_marks_maximum,
				percentage: mark.percentage,
				letter_grade: mark.letter_grade,
				grade_points: mark.grade_points,
				is_pass: mark.is_pass,
				pass_status: mark.pass_status,
				result_status: mark.result_status,
				is_regular: mark.is_regular  // ADDED: Track if course is current semester or arrear
			})
		})

		// Merge with semester results
		const students = Array.from(studentMarksMap.values()).map((studentData: any) => {
			const semResult = semesterResults?.find((sr: any) => sr.student_id === studentData.student.id)

			// Sort courses by: 1) semester (DESCENDING), 2) course_order (ASCENDING), 3) course_code
			// This shows current semester first, then arrears in reverse order (6→5→4→3→2→1)
			const sortedCourses = [...studentData.courses].sort((a: any, b: any) => {
				// Primary sort: by semester (DESCENDING: Sem 6, Sem 5, Sem 4, ...)
				const semA = a.course?.semester ?? -1
				const semB = b.course?.semester ?? -1
				if (semA !== semB) return semB - semA  // DESCENDING

				// Secondary sort: by course_order from course_mapping (ASCENDING)
				const orderA = a.course?.course_order ?? 999
				const orderB = b.course?.course_order ?? 999
				if (orderA !== orderB) return orderA - orderB

				// Tertiary sort: by course_code if course_order is the same
				return (a.course?.course_code || '').localeCompare(b.course?.course_code || '')
			})

			// Determine student's current semester (highest semester where is_regular=TRUE)
			const regularCourses = studentData.courses.filter((c: any) => c.is_regular === true)
			const currentSemester = regularCourses.length > 0
				? Math.max(...regularCourses.map((c: any) => c.course?.semester || 0))
				: 0

			// DIAGNOSTIC: Log student course details
			console.log(`Student ${studentData.student.register_number}: total courses=${studentData.courses.length}, regular courses=${regularCourses.length}, determined current semester=${currentSemester}`)
			if (regularCourses.length === 0) {
				console.warn(`⚠️ Student ${studentData.student.register_number} has NO regular courses (all arrears or is_regular not set)`)
			}

			return {
				...studentData,
				courses: sortedCourses,
				current_semester: currentSemester,  // Track student's current semester
				semester_result: semResult ? {
					sgpa: semResult.sgpa,
					cgpa: semResult.cgpa,
					percentage: semResult.percentage,
					total_credits_registered: semResult.total_credits_registered,
					total_credits_earned: semResult.total_credits_earned,
					result_status: semResult.result_status,
					result_class: semResult.result_class,
					is_distinction: semResult.is_distinction,
					is_first_class: semResult.is_first_class,
					total_backlogs: semResult.total_backlogs
				} : null
			}
		})
		.filter((student: any) => {
			// CRITICAL: Only include students currently studying in the selected semester
			// This ensures Semester 4 students don't appear in Semester 6 report
			const included = student.current_semester === semesterNum
			if (!included) {
				console.log(`Filtered out student ${student.student.register_number}: current_semester=${student.current_semester}, selected semester=${semesterNum}`)
			}
			return included
		})
		.sort((a, b) => {
			// Sort by register number
			const regA = a.student.register_number || ''
			const regB = b.student.register_number || ''
			return regA.localeCompare(regB)
		})

		// DIAGNOSTIC: Log final student count
		console.log(`✅ Total students included in semester ${semesterNum} report: ${students.length}`)
		console.log('Included students:', students.map((s: any) => `${s.student.register_number} (${s.courses.length} courses)`).join(', '))

		// Get unique courses for the course-wise analysis
		const coursesMap = new Map()
		filteredMarks.forEach((mark: any) => {
			if (!mark.courses) return
			const courseId = mark.courses.id

			if (!coursesMap.has(courseId)) {
				coursesMap.set(courseId, {
					course: mark.courses,
					registered: 0,
					appeared: 0,
					absent: 0,
					passed: 0,
					failed: 0,
					reappear: 0,
					total_internal: 0,
					total_external: 0,
					total_marks: 0,
					grades: {} as Record<string, number>
				})
			}

			const courseData = coursesMap.get(courseId)
			courseData.registered++

			// Check for absent: pass_status = 'Absent' OR letter_grade = 'AAA' OR external marks is null/0 with no appearance
			const isAbsent = mark.pass_status === 'Absent' ||
				mark.pass_status === 'AAA' ||
				mark.letter_grade === 'AAA' ||
				(mark.external_marks_obtained === null && mark.internal_marks_obtained !== null)

			if (isAbsent) {
				courseData.absent++
			} else {
				courseData.appeared++
				courseData.total_internal += mark.internal_marks_obtained || 0
				courseData.total_external += mark.external_marks_obtained || 0
				courseData.total_marks += mark.total_marks_obtained || 0

				if (mark.is_pass) {
					courseData.passed++
				} else if (mark.pass_status === 'Reappear' || mark.pass_status === 'RA' || mark.letter_grade === 'U') {
					// Failed students who need to reappear
					courseData.reappear++
				} else {
					courseData.failed++
				}
			}

			// Track grade distribution
			if (mark.letter_grade) {
				courseData.grades[mark.letter_grade] = (courseData.grades[mark.letter_grade] || 0) + 1
			}
		})

		const courseAnalysis = Array.from(coursesMap.values()).map((courseData: any) => ({
			...courseData,
			pass_percentage: courseData.appeared > 0
				? ((courseData.passed / courseData.appeared) * 100).toFixed(2)
				: '0.00'
		})).sort((a, b) => {
			// Sort by: 1) semester (DESCENDING), 2) course_order (ASCENDING), 3) course_code
			// Primary sort: by semester (DESCENDING: Sem 6, Sem 5, Sem 4, ...)
			const semA = a.course.semester ?? -1
			const semB = b.course.semester ?? -1
			if (semA !== semB) return semB - semA  // DESCENDING

			// Secondary sort: by course_order from course_mapping (ASCENDING), fallback to 999 if not set
			const orderA = a.course.course_order ?? 999
			const orderB = b.course.course_order ?? 999
			if (orderA !== orderB) return orderA - orderB

			// Tertiary sort: by course_code if course_order is the same
			return (a.course.course_code || '').localeCompare(b.course.course_code || '')
		})

		// Log final course order for debugging
		console.log('Course analysis sorted by course_order:', courseAnalysis.map((ca: any) => ({
			course_code: ca.course.course_code,
			course_order: ca.course.course_order
		})))

		// Calculate overall statistics
		const totalStudents = students.length
		const totalPassed = students.filter((s: any) =>
			s.semester_result?.result_status === 'Pass'
		).length
		const totalFailed = students.filter((s: any) =>
			s.semester_result?.result_status === 'Fail'
		).length
		const totalWithBacklogs = students.filter((s: any) =>
			(s.semester_result?.total_backlogs || 0) > 0
		).length

		// Grade distribution across all courses
		const overallGrades: Record<string, number> = {}
		filteredMarks.forEach((mark: any) => {
			if (mark.letter_grade) {
				overallGrades[mark.letter_grade] = (overallGrades[mark.letter_grade] || 0) + 1
			}
		})

		// Calculate top performers
		const topPerformers = students
			.filter((s: any) => s.semester_result?.cgpa)
			.sort((a: any, b: any) => (b.semester_result?.cgpa || 0) - (a.semester_result?.cgpa || 0))
			.slice(0, 10)

		// Calculate highest marks
		const studentTotalMarks = students.map((s: any) => ({
			student: s.student,
			total_marks: s.courses.reduce((sum: number, c: any) => sum + (c.total_marks || 0), 0),
			total_max: s.courses.reduce((sum: number, c: any) => sum + (c.total_max || 0), 0)
		})).sort((a, b) => b.total_marks - a.total_marks)

		const highestScorer = studentTotalMarks[0] || null

		// Fetch batch from MyJKKN: first get batch_id from learner profile, then fetch batch by ID directly
		let batchName = ''
		if (students.length > 0) {
			const firstStudentRegNo = students[0]?.student?.register_number
			console.log('[Galley Report] Looking up batch for student:', firstStudentRegNo)
			if (firstStudentRegNo) {
				try {
					// Step 1: Get learner profile to get batch_id
					const learnerRes = await fetch(`${baseUrl}/api/myjkkn/learner-profiles?search=${encodeURIComponent(firstStudentRegNo)}&limit=10`)
					if (learnerRes.ok) {
						const learnerResponse = await learnerRes.json()
						const learners = learnerResponse.data || learnerResponse || []
						console.log('[Galley Report] MyJKKN learner profiles found:', Array.isArray(learners) ? learners.length : 0)

						if (Array.isArray(learners) && learners.length > 0) {
							// Find exact match by register_number
							const matchedLearner = learners.find((l: any) =>
								l.register_number === firstStudentRegNo || l.roll_number === firstStudentRegNo
							) || learners[0]

							const batchId = matchedLearner.batch_id
							console.log('[Galley Report] Matched learner batch_id:', batchId)

							// Step 2: Fetch batch directly by ID from MyJKKN batches API
							if (batchId) {
								try {
									const batchByIdRes = await fetch(`${baseUrl}/api/myjkkn/batches/${batchId}`)
									if (batchByIdRes.ok) {
										const batchData = await batchByIdRes.json()
										batchName = batchData.batch_name || ''
										console.log('[Galley Report] Fetched batch directly by ID:', {
											id: batchData.id,
											batch_name: batchData.batch_name,
											batch_code: batchData.batch_code
										})
									} else {
										console.log('[Galley Report] Batch by ID API failed, status:', batchByIdRes.status)
										// Fallback to enriched batch_name
										batchName = matchedLearner.batch_name || ''
									}
								} catch (batchError) {
									console.error('[Galley Report] Error fetching batch by ID:', batchError)
									// Fallback to enriched batch_name
									batchName = matchedLearner.batch_name || ''
								}
							} else {
								// No batch_id, use enriched batch_name if available
								batchName = matchedLearner.batch_name || ''
							}
						}
					} else {
						console.log('[Galley Report] MyJKKN learner-profiles API failed:', learnerRes.status)
					}
				} catch (e) {
					console.error('[Galley Report] Error fetching batch from MyJKKN:', e)
				}
			}
		}

		// Fallback to calculated batch if not found
		if (!batchName && session?.start_date) {
			const startYear = new Date(session.start_date).getFullYear()
			batchName = `${startYear}-${startYear + 3}`
		}

		const response = {
			institution,
			session,
			program,
			semester: parseInt(semester),
			batch: batchName,
			students,
			courseAnalysis,
			statistics: {
				total_students: totalStudents,
				total_passed: totalPassed,
				total_failed: totalFailed,
				total_with_backlogs: totalWithBacklogs,
				pass_percentage: totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(2) : '0.00',
				grade_distribution: overallGrades,
				top_performers: topPerformers.map((s: any) => ({
					register_number: s.student.register_number,
					name: `${s.student.first_name} ${s.student.last_name || ''}`.trim(),
					cgpa: s.semester_result?.cgpa,
					sgpa: s.semester_result?.sgpa
				})),
				highest_scorer: highestScorer ? {
					register_number: highestScorer.student.register_number,
					name: `${highestScorer.student.first_name} ${highestScorer.student.last_name || ''}`.trim(),
					total_marks: highestScorer.total_marks,
					total_max: highestScorer.total_max
				} : null
			}
		}

		return NextResponse.json(response)

	} catch (error) {
		console.error('Galley Report API Error:', error)
		return NextResponse.json({
			error: error instanceof Error ? error.message : 'Failed to fetch galley report data'
		}, { status: 500 })
	}
}
