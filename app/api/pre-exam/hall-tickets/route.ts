/**
 * Hall Ticket Generation API Route
 *
 * GET  /api/pre-exam/hall-tickets?institution_code=XXX&examination_session_id=YYY&program_id=ZZZ&semester_ids=1,2
 *
 * Fetches hall ticket data for students:
 * - Uses exam_registrations as the primary source (stu_register_no, student_name from MyJKKN imports)
 * - Joins with exam_timetables, course_offerings, course_mapping
 * - Returns data structured for PDF generation
 * - Groups subjects by student (keyed by stu_register_no)
 */

import { NextResponse, NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import type {
	HallTicketData,
	HallTicketStudent,
	HallTicketSubject,
	HallTicketApiResponse
} from '@/types/hall-ticket'

export async function GET(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)

		// Required parameters
		const institution_code = searchParams.get('institution_code')
		const examination_session_id = searchParams.get('examination_session_id')

		// Optional filters
		// Note: program_id (MyJKKN UUID) is not used - use program_code instead
		// Programs are from MyJKKN API, not a local table
		const program_code = searchParams.get('program_code') // Program code like "BCA", "MCA"
		const semester_ids = searchParams.get('semester_ids') // comma-separated
		const student_ids = searchParams.get('student_ids') // comma-separated

		// Validate required parameters
		if (!institution_code) {
			return NextResponse.json({
				success: false,
				error: 'Institution code is required'
			} as HallTicketApiResponse, { status: 400 })
		}

		if (!examination_session_id) {
			return NextResponse.json({
				success: false,
				error: 'Examination session ID is required'
			} as HallTicketApiResponse, { status: 400 })
		}

		// Get institution details - try case-insensitive match first
		let institution = null
		let instError = null

		console.log('[HallTickets] Looking up institution with code:', institution_code)

		// First try exact match - use * to get all available fields
		const { data: exactMatch, error: exactError } = await supabase
			.from('institutions')
			.select('*')
			.eq('institution_code', institution_code)
			.single()

		console.log('[HallTickets] Exact match result:', { found: !!exactMatch, error: exactError?.message, code: exactError?.code })

		if (exactMatch) {
			institution = exactMatch
		} else {
			// Try case-insensitive match using ilike
			const { data: ilikeMatch, error: ilikeError } = await supabase
				.from('institutions')
				.select('*')
				.ilike('institution_code', institution_code)
				.limit(1)
				.single()

			if (ilikeMatch) {
				institution = ilikeMatch
				console.log(`[HallTickets] Found institution with case-insensitive match: "${ilikeMatch.institution_code}" for input "${institution_code}"`)
			} else {
				instError = ilikeError || exactError
			}
		}

		if (!institution) {
			console.error('Institution lookup error:', {
				institution_code,
				error: instError?.message,
				code: instError?.code
			})
			return NextResponse.json({
				success: false,
				error: `Institution with code "${institution_code}" not found`
			} as HallTicketApiResponse, { status: 404 })
		}

		// Get examination session details
		const { data: examSession, error: sessionError } = await supabase
			.from('examination_sessions')
			.select('id, session_code, session_name')
			.eq('id', examination_session_id)
			.single()

		if (sessionError || !examSession) {
			console.error('Examination session lookup error:', {
				examination_session_id,
				error: sessionError?.message,
				code: sessionError?.code
			})
			return NextResponse.json({
				success: false,
				error: `Examination session not found (ID: ${examination_session_id})`
			} as HallTicketApiResponse, { status: 404 })
		}

		// Get PDF settings for institution (if available)
		const { data: pdfSettings } = await supabase
			.from('pdf_institution_settings')
			.select('*')
			.eq('institution_code', institution_code)
			.eq('active', true)
			.order('wef_date', { ascending: false })
			.limit(1)
			.single()

		// Build query for exam registrations with all related data
		// Note: Student data (stu_register_no, student_name) is stored directly in exam_registrations
		// from MyJKKN imports, so we don't join to the students table
		// Note: programs table doesn't exist locally - programs are from MyJKKN API
		// Note: exam_timetables FK goes FROM exam_timetables TO course_offerings,
		//       so we fetch timetables separately instead of embedding in course_offerings
		// Schema relationship:
		// exam_registrations → course_offerings (via course_offering_id)
		// course_offerings.course_id → course_mapping.id (FK to course_mapping, NOT courses)
		// course_mapping.course_id → courses.id
		// course_mapping has course_order for sorting
		// Actual schema relationships:
		// course_offerings.course_id → courses.id (direct FK via course_offerings_course_id_fkey1)
		// course_offerings.course_mapping_id → course_mapping.id (for course_order)
		// course_mapping.course_id → courses.id
		let registrationsQuery = supabase
			.from('exam_registrations')
			.select(`
				id,
				student_id,
				course_offering_id,
				stu_register_no,
				student_name,
				registration_status,
				program_code,
				course_offerings(
					id,
					course_id,
					course_mapping_id,
					program_code,
					semester,
					courses(id, course_code, course_name),
					course_mapping(id, course_order)
				)
			`)
			.eq('examination_session_id', examination_session_id)
			.eq('institutions_id', institution.id)
			.eq('registration_status', 'Approved')

		// Apply program filter using program_code
		if (program_code) {
			registrationsQuery = registrationsQuery.eq('program_code', program_code)
		}

		// Execute query
		const { data: registrations, error: regError } = await registrationsQuery

		if (regError) {
			console.error('Error fetching registrations:', regError)
			return NextResponse.json({
				success: false,
				error: 'Failed to fetch exam registrations'
			} as HallTicketApiResponse, { status: 500 })
		}

		// Collect all course_codes to fetch timetables by course_code
		// exam_timetables.course_id -> courses.id, so we need to match by course_code
		const courseCodes = new Set<string>()
		for (const reg of registrations || []) {
			const courseOffering = reg.course_offerings as any
			const courseCode = courseOffering?.courses?.course_code
			if (courseCode) {
				courseCodes.add(courseCode)
			}
		}

		// Fetch exam timetables by course_code (via courses join) for this exam session
		// exam_timetables has course_id -> courses.id, so we join to get course_code
		let timetablesByCourseCode = new Map<string, any>()
		if (courseCodes.size > 0) {
			const { data: timetables, error: ttError } = await supabase
				.from('exam_timetables')
				.select(`
					id,
					course_id,
					exam_date,
					session,
					exam_time,
					duration_minutes,
					is_published,
					courses(id, course_code)
				`)
				.eq('examination_session_id', examination_session_id)

			if (ttError) {
				console.error('Error fetching exam timetables:', ttError)
				// Continue without timetables - they will show "To Be Announced"
			} else {
				// Map timetables by course_code for quick lookup
				for (const tt of timetables || []) {
					const courseCode = (tt.courses as any)?.course_code
					if (courseCode && courseCodes.has(courseCode)) {
						timetablesByCourseCode.set(courseCode, tt)
					}
				}
			}
		}

		// Parse semester numbers if provided (expecting numbers like 1, 2, 3)
		const semesterNumbersList = semester_ids ? semester_ids.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) : []
		const studentIdsList = student_ids ? student_ids.split(',').map(s => s.trim()) : []

		// Group registrations by student (using stu_register_no as the key since student data is in exam_registrations)
		const studentMap = new Map<string, {
			stu_register_no: string,
			student_name: string,
			subjects: HallTicketSubject[],
			programName: string
		}>()

		for (const reg of registrations || []) {
			if (!reg.stu_register_no || !reg.course_offerings) continue

			const courseOffering = reg.course_offerings as any

			// Filter by semester number if specified (using semester from course_offerings)
			if (semesterNumbersList.length > 0) {
				const semesterNumber = courseOffering.semester
				if (semesterNumber && !semesterNumbersList.includes(semesterNumber)) {
					continue
				}
			}

			// Filter by student IDs if specified (using stu_register_no)
			if (studentIdsList.length > 0 && !studentIdsList.includes(reg.stu_register_no)) {
				continue
			}

			const studentKey = reg.stu_register_no

			if (!studentMap.has(studentKey)) {
				studentMap.set(studentKey, {
					stu_register_no: reg.stu_register_no,
					student_name: reg.student_name || '',
					subjects: [],
					programName: reg.program_code || 'N/A'
				})
			}

			// Direct access: course_offerings.courses (via course_id FK)
			// course_order from: course_offerings.course_mapping (via course_mapping_id FK)
			const course = courseOffering.courses
			const courseMapping = courseOffering.course_mapping
			const courseCode = course?.course_code

			// Get exam timetable by course_code (matches exam date correctly)
			const timetable = courseCode ? timetablesByCourseCode.get(courseCode) : null

			// Create subject entry with course_order for sorting
			const subject: HallTicketSubject = {
				serial_number: 0, // Will be assigned later
				subject_code: courseCode || 'N/A',
				subject_name: course?.course_name || 'To Be Announced',
				exam_date: timetable?.exam_date || 'To Be Announced',
				exam_time: timetable ? formatExamTime(timetable.session, timetable.exam_time) : 'To Be Announced',
				semester: `Semester ${courseOffering.semester || 1}`,
				course_order: courseMapping?.course_order || 999 // course_order is in course_mapping
			}

			studentMap.get(studentKey)!.subjects.push(subject)
		}

		// Fetch learner profiles from local database to get date_of_birth and student_photo_url
		// learners_profiles table is a fallback/mirror of MyJKKN /api-management/learners/profiles endpoint
		const registerNumbers = Array.from(studentMap.keys())
		const learnerProfileMap = new Map<string, { date_of_birth: string | null; student_photo_url: string | null }>()

		if (registerNumbers.length > 0) {
			console.log(`[HallTickets] Fetching learner profiles for ${registerNumbers.length} students...`)
			console.log(`[HallTickets] Register numbers to lookup:`, registerNumbers.slice(0, 5), '...')

			// Normalize register numbers to uppercase for consistent matching
			const normalizedRegNumbers = registerNumbers.map(rn => rn.toUpperCase())

			// Fetch from local learners_profiles table (mirrors MyJKKN data)
			// Register number is stored in register_number column
			// First try exact match with normalized (uppercase) register numbers
			const { data: learnerProfiles, error: lpError } = await supabase
				.from('learners_profiles')
				.select('register_number, date_of_birth, student_photo_url')
				.in('register_number', normalizedRegNumbers)

			if (lpError) {
				console.warn('[HallTickets] Could not fetch learner profiles from local DB:', lpError.message)
			} else if (learnerProfiles && learnerProfiles.length > 0) {
				console.log(`[HallTickets] Found ${learnerProfiles.length} learner profiles (exact match)`)
				for (const profile of learnerProfiles) {
					if (profile.register_number) {
						// Store with uppercase key for consistent lookup
						learnerProfileMap.set(profile.register_number.toUpperCase(), {
							date_of_birth: profile.date_of_birth,
							student_photo_url: profile.student_photo_url
						})
						// Log if DOB or photo is missing
						if (!profile.date_of_birth) {
							console.log(`[HallTickets] Missing DOB for ${profile.register_number}`)
						}
						if (!profile.student_photo_url) {
							console.log(`[HallTickets] Missing photo for ${profile.register_number}`)
						}
					}
				}
			} else {
				console.log('[HallTickets] No learner profiles found in local DB (exact match)')
			}

			// Check for missing profiles and try case-insensitive lookup
			const missingRegNumbers = registerNumbers.filter(rn => !learnerProfileMap.has(rn.toUpperCase()))
			if (missingRegNumbers.length > 0) {
				console.log(`[HallTickets] ${missingRegNumbers.length} students missing from learners_profiles:`, missingRegNumbers.slice(0, 5))

				// Try case-insensitive lookup for missing ones using ilike
				for (const regNum of missingRegNumbers) {
					const { data: profile } = await supabase
						.from('learners_profiles')
						.select('register_number, date_of_birth, student_photo_url')
						.ilike('register_number', regNum)
						.limit(1)
						.single()

					if (profile && profile.register_number) {
						console.log(`[HallTickets] Found case-insensitive match: "${profile.register_number}" for "${regNum}"`)
						// Map using uppercase key for consistent lookup
						learnerProfileMap.set(regNum.toUpperCase(), {
							date_of_birth: profile.date_of_birth,
							student_photo_url: profile.student_photo_url
						})
					}
				}
			}

			console.log(`[HallTickets] Total profiles mapped: ${learnerProfileMap.size} of ${registerNumbers.length}`)
		}

		// Convert map to array and sort
		const students: HallTicketStudent[] = []

		for (const [, value] of studentMap) {
			const { stu_register_no, student_name, subjects, programName } = value
			// Lookup using uppercase key for consistent matching
			const learnerProfile = learnerProfileMap.get(stu_register_no.toUpperCase())

			// Debug: Log profile lookup result
			if (learnerProfile) {
				console.log(`[HallTickets] Profile found for ${stu_register_no}: DOB=${learnerProfile.date_of_birth}, Photo=${learnerProfile.student_photo_url ? 'YES' : 'NO'}`)
			} else {
				console.log(`[HallTickets] No profile in map for ${stu_register_no}`)
			}

			// Sort subjects by semester (descending - higher semester first: 3, 2, 1)
			// then by course_order (ascending) within same semester
			subjects.sort((a, b) => {
				// Extract semester number from semester string (e.g., "Semester 3" -> 3)
				const getSemesterNum = (sem: string): number => {
					const match = sem.match(/(\d+)/)
					return match ? parseInt(match[1], 10) : 0
				}
				const semA = getSemesterNum(a.semester)
				const semB = getSemesterNum(b.semester)

				// Sort by semester descending (higher semester first)
				if (semB !== semA) {
					return semB - semA
				}

				// Within same semester, sort by course_order ascending
				const orderA = a.course_order ?? 999
				const orderB = b.course_order ?? 999
				if (orderA !== orderB) {
					return orderA - orderB
				}

				// Final fallback: sort by subject_code
				return a.subject_code.localeCompare(b.subject_code)
			})

			// Assign serial numbers after sorting
			subjects.forEach((s, i) => {
				s.serial_number = i + 1
			})

			// Format student data (student info comes from exam_registrations, enriched with learners_profiles)
			// Format date_of_birth to DD/MM/YYYY if available
			let formattedDob = ''
			if (learnerProfile?.date_of_birth) {
				try {
					const dobValue = learnerProfile.date_of_birth
					let dob: Date | null = null

					// Check if it's an Excel serial date (numeric string like "38339")
					if (/^\d+$/.test(dobValue)) {
						// Excel serial date: days since 1900-01-01 (with Excel's leap year bug)
						// Excel incorrectly considers 1900 as a leap year, so we subtract 2 days
						const excelEpoch = new Date(1899, 11, 30) // Dec 30, 1899
						const serialNumber = parseInt(dobValue, 10)
						dob = new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000)
					} else {
						// Try standard date parsing
						dob = new Date(dobValue)
					}

					if (dob && !isNaN(dob.getTime())) {
						formattedDob = `${String(dob.getDate()).padStart(2, '0')}-${String(dob.getMonth() + 1).padStart(2, '0')}-${dob.getFullYear()}`
					}
				} catch {
					formattedDob = learnerProfile.date_of_birth // Use as-is if parsing fails
				}
			}

			const hallTicketStudent: HallTicketStudent = {
				register_number: stu_register_no,
				student_name: student_name,
				date_of_birth: formattedDob,
				program: programName,
				emis: '', // Add EMIS if available in your schema
				student_photo_url: learnerProfile?.student_photo_url || undefined,
				subjects: subjects,
				semester_group: undefined // Not available without students table join
			}

			students.push(hallTicketStudent)
		}

		// Sort students by register number (ascending)
		students.sort((a, b) => a.register_number.localeCompare(b.register_number))

		// Check if no students found
		if (students.length === 0) {
			return NextResponse.json({
				success: false,
				error: 'No records available. No students found matching the criteria.',
				student_count: 0
			} as HallTicketApiResponse, { status: 404 })
		}

		// Build response data
		const hallTicketData: HallTicketData = {
			institution: {
				institution_name: institution.name,
				institution_code: institution.institution_code,
				accreditation_text: pdfSettings?.accreditation_text ||
					institution.accredited_by ||
					'(Accredited by NAAC, Approved by AICTE, Recognized by\nUGC Under Section 2(f) & 12(B), Affiliated to Periyar University)',
				address: pdfSettings?.address ||
					[institution.address_line1, institution.address_line2, institution.city, institution.state]
						.filter(Boolean)
						.join(', ') ||
					'Komarapalayam- 638 183, Namakkal District, Tamil Nadu.',
				logo_url: pdfSettings?.logo_url || institution.logo_url,
				secondary_logo_url: pdfSettings?.secondary_logo_url,
				primary_color: pdfSettings?.primary_color,
				secondary_color: pdfSettings?.secondary_color
			},
			session: {
				session_code: examSession.session_code,
				session_name: examSession.session_name
			},
			students: students
		}

		return NextResponse.json({
			success: true,
			data: hallTicketData,
			student_count: students.length
		} as HallTicketApiResponse)

	} catch (error) {
		console.error('Hall ticket API error:', error)
		return NextResponse.json({
			success: false,
			error: 'Internal server error'
		} as HallTicketApiResponse, { status: 500 })
	}
}

/**
 * Format exam time based on session (FN/AN)
 * Returns time in readable format: "10.00 A.M. to 01.00 P.M."
 */
function formatExamTime(session: string, examTime?: string): string {
	if (!session) return 'To Be Announced'

	const sessionUpper = session.toUpperCase()

	if (sessionUpper === 'FN' || sessionUpper.includes('FORENOON')) {
		return '10.00 A.M. to 01.00 P.M.'
	} else if (sessionUpper === 'AN' || sessionUpper.includes('AFTERNOON')) {
		return '02.00 P.M. to 05.00 P.M.'
	}

	return examTime || session
}
