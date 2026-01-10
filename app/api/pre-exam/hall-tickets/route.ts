/**
 * Hall Ticket Generation API Route
 *
 * GET  /api/pre-exam/hall-tickets?institution_code=XXX&examination_session_id=YYY&program_id=ZZZ&semester_ids=1,2
 *
 * Fetches hall ticket data for students:
 * - Joins students, exam_registrations, exam_timetables, course_offerings, course_mapping
 * - Returns data structured for PDF generation
 * - Groups subjects by student
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
		const program_id = searchParams.get('program_id')
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
		// Note: We fetch student and semester info (with semester_group for year-wise grouping)
		// Also include course_order for sorting subjects within each semester
		let registrationsQuery = supabase
			.from('exam_registrations')
			.select(`
				id,
				student_id,
				course_offering_id,
				stu_register_no,
				student_name,
				registration_status,
				students!inner(
					id,
					first_name,
					last_name,
					date_of_birth,
					roll_number,
					student_photo_url,
					program_id,
					semester_id,
					semesters(id, semester_code, semester_name, display_order, semester_group, semester_type)
				),
				course_offerings(
					id,
					course_id,
					program_id,
					semester,
					course_order,
					course_mapping:course_id(id, course_code, course_title),
					programs(id, program_code, program_name),
					exam_timetables(
						id,
						exam_date,
						session,
						exam_time,
						duration_minutes,
						is_published
					)
				)
			`)
			.eq('examination_session_id', examination_session_id)
			.eq('institutions_id', institution.id)
			.eq('registration_status', 'Approved')

		// Apply program filter on students table
		if (program_id) {
			registrationsQuery = registrationsQuery.eq('students.program_id', program_id)
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

		// Parse semester numbers if provided (expecting numbers like 1, 2, 3)
		const semesterNumbersList = semester_ids ? semester_ids.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) : []
		const studentIdsList = student_ids ? student_ids.split(',').map(s => s.trim()) : []

		// Group registrations by student
		const studentMap = new Map<string, {
			student: any,
			subjects: HallTicketSubject[],
			programName: string
		}>()

		for (const reg of registrations || []) {
			if (!reg.students || !reg.course_offerings) continue

			const student = reg.students
			const courseOffering = reg.course_offerings

			// Filter by semester number if specified (using display_order from semesters table)
			if (semesterNumbersList.length > 0) {
				const studentSemesterNumber = student.semesters?.display_order
				if (studentSemesterNumber && !semesterNumbersList.includes(studentSemesterNumber)) {
					continue
				}
			}

			// Filter by student IDs if specified
			if (studentIdsList.length > 0 && !studentIdsList.includes(student.id)) {
				continue
			}

			const studentKey = student.id

			if (!studentMap.has(studentKey)) {
				studentMap.set(studentKey, {
					student: student,
					subjects: [],
					programName: courseOffering.programs?.program_name || 'N/A'
				})
			}

			// Get exam timetable for this course offering
			const timetables = courseOffering.exam_timetables || []
			const courseMapping = courseOffering.course_mapping

			// Find the timetable entry (there should be one per course)
			const timetable = timetables.length > 0 ? timetables[0] : null

			// Create subject entry with course_order for sorting
			const subject: HallTicketSubject = {
				serial_number: 0, // Will be assigned later
				subject_code: courseMapping?.course_code || 'N/A',
				subject_name: courseMapping?.course_title || 'To Be Announced',
				exam_date: timetable?.exam_date || 'To Be Announced',
				exam_time: timetable ? formatExamTime(timetable.session, timetable.exam_time) : 'To Be Announced',
				semester: student.semesters?.semester_name || (student.semesters?.display_order ? `Semester ${student.semesters.display_order}` : `Semester ${courseOffering.semester}`),
				course_order: courseOffering.course_order || 999 // Include course_order for sorting
			}

			studentMap.get(studentKey)!.subjects.push(subject)
		}

		// Convert map to array and sort
		const students: HallTicketStudent[] = []

		for (const [, value] of studentMap) {
			const { student, subjects, programName } = value

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

			// Format student data with semester_group for year-wise PDF grouping
			const hallTicketStudent: HallTicketStudent = {
				register_number: student.roll_number || 'N/A',
				student_name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
				date_of_birth: formatDate(student.date_of_birth),
				program: programName,
				emis: '', // Add EMIS if available in your schema
				student_photo_url: student.student_photo_url || undefined,
				subjects: subjects,
				semester_group: student.semesters?.semester_group || student.semesters?.semester_type // For year-wise grouping
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
 */
function formatExamTime(session: string, examTime?: string): string {
	if (!session) return 'To Be Announced'

	const sessionUpper = session.toUpperCase()

	if (sessionUpper === 'FN' || sessionUpper.includes('FORENOON')) {
		return examTime || '10:00 to 13:00FN'
	} else if (sessionUpper === 'AN' || sessionUpper.includes('AFTERNOON')) {
		return examTime || '14:00 to 17:00AN'
	}

	return examTime || session
}

/**
 * Format date to DD-MMM-YYYY format
 */
function formatDate(dateStr: string | null): string {
	if (!dateStr) return 'N/A'

	try {
		const date = new Date(dateStr)
		if (isNaN(date.getTime())) return dateStr

		const day = date.getDate().toString().padStart(2, '0')
		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
		const month = months[date.getMonth()]
		const year = date.getFullYear()

		return `${day}-${month}-${year}`
	} catch {
		return dateStr
	}
}
