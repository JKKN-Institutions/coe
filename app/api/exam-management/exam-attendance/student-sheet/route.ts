import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: Fetch student-wise attendance sheets
export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)

		const sessionCode = searchParams.get('session_code')
		const examDate = searchParams.get('exam_date') || null
		const session = searchParams.get('session') || null
		const programCode = searchParams.get('program_code') || null
		const courseCode = searchParams.get('course_code') || null

		// Validate required parameters
		if (!sessionCode) {
			return NextResponse.json(
				{ error: 'session_code is required' },
				{ status: 400 }
			)
		}

		console.log('Fetching student attendance sheet with params:', {
			sessionCode,
			examDate,
			session,
			programCode,
			courseCode
		})

		// Call the database function
		const { data, error } = await supabase.rpc('get_student_attendance_sheet', {
			p_session_code: sessionCode,
			p_exam_date: examDate,
			p_session: session,
			p_program_code: programCode,
			p_course_code: courseCode
		})

		if (error) {
			console.error('Error fetching student attendance sheet:', error)
			return NextResponse.json(
				{ error: 'Failed to fetch student attendance sheet', details: error.message },
				{ status: 500 }
			)
		}

		console.log('Student attendance sheet records found:', data?.length || 0)

		// Group data by exam_date and session (merge all courses in same date+session into one sheet)
		const groupedByDateSession: Record<string, any> = {}

		data?.forEach((record: any) => {
			const dateSessionKey = `${record.exam_date}_${record.session}`

			if (!groupedByDateSession[dateSessionKey]) {
				groupedByDateSession[dateSessionKey] = {
					exam_date: record.exam_date,
					session: record.session,
					session_name: record.session_name,
					institution_name: record.institution_name,
					institution_code: record.institution_code,
					regulation_code: record.regulation_code,
					courses: {}
				}
			}

			// Group by course within the date+session
			const courseKey = `${record.course_code}`

			if (!groupedByDateSession[dateSessionKey].courses[courseKey]) {
				groupedByDateSession[dateSessionKey].courses[courseKey] = {
					course_code: record.course_code,
					course_title: record.course_title,
					program_code: record.program_code,
					program_name: record.program_name,
					program_order: record.program_order || 999,
					semester: record.semester,
					students: []
				}
			}

			groupedByDateSession[dateSessionKey].courses[courseKey].students.push({
				register_number: record.register_number,
				student_name: record.student_name,
				attendance_status: record.attendance_status.toUpperCase(),
				program_code: record.program_code,
				program_name: record.program_name,
				semester: record.semester
			})
		})

		// Convert to array of sheets (one sheet per date+session with all courses)
		const sheets = Object.values(groupedByDateSession).map((dateSessionGroup: any) => {
			// Sort courses by program_order, then by program_code
			const sortedCourses = Object.values(dateSessionGroup.courses).sort((a: any, b: any) => {
				if (a.program_order !== b.program_order) {
					return a.program_order - b.program_order
				}
				return a.program_code.localeCompare(b.program_code)
			})

			return {
				metadata: {
					exam_date: dateSessionGroup.exam_date,
					session: dateSessionGroup.session,
					session_name: dateSessionGroup.session_name,
					institution_name: dateSessionGroup.institution_name,
					institution_code: dateSessionGroup.institution_code,
					regulation_code: dateSessionGroup.regulation_code
				},
				courses: sortedCourses
			}
		})

		console.log('Generated sheets:', sheets.length, 'date+session combinations')

		return NextResponse.json({ sheets })

	} catch (error) {
		console.error('Student attendance sheet API error:', error)
		const errorMessage = error instanceof Error ? error.message : 'Internal server error'
		return NextResponse.json(
			{ error: 'Failed to fetch student attendance sheet', details: errorMessage },
			{ status: 500 }
		)
	}
}
