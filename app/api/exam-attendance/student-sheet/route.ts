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

		// Group data by exam_date, session, course_code
		const groupedData: Record<string, any> = {}

		data?.forEach((record: any) => {
			const key = `${record.exam_date}_${record.session}_${record.course_code}`

			if (!groupedData[key]) {
				groupedData[key] = {
					metadata: {
						exam_date: record.exam_date,
						session: record.session,
						course_code: record.course_code,
						course_title: record.course_title,
						program_code: record.program_code,
						program_name: record.program_name,
						program_order: record.program_order || 999,
						semester: record.semester,
						regulation_code: record.regulation_code,
						institution_name: record.institution_name,
						institution_code: record.institution_code,
						session_name: record.session_name
					},
					students: []
				}
			}

			groupedData[key].students.push({
				register_number: record.register_number,
				student_name: record.student_name,
				attendance_status: record.attendance_status.toUpperCase(),
				program_code: record.program_code,
				program_name: record.program_name,
				semester: record.semester
			})
		})

		// Convert to array of sheets and sort by program_order
		const sheets = Object.values(groupedData).sort((a: any, b: any) => {
			// Sort by program_order first, then by program_code
			if (a.metadata.program_order !== b.metadata.program_order) {
				return a.metadata.program_order - b.metadata.program_order
			}
			return a.metadata.program_code.localeCompare(b.metadata.program_code)
		})

		console.log('Generated sheets:', sheets.length)

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
