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
		const courseOfferingId = searchParams.get('course_offering_id')
		const examDate = searchParams.get('exam_date')

		// 1. Fetch Institutions
		if (type === 'institutions') {
			const { data, error } = await supabase
				.from('institutions')
				.select('id, institution_code, institution_name')
				.eq('is_active', true)
				.order('institution_name', { ascending: true })

			if (error) {
				console.error('Error fetching institutions:', error)
				return NextResponse.json({ error: 'Failed to fetch institutions' }, { status: 500 })
			}

			return NextResponse.json(data || [])
		}

		// 2. Fetch Examination Sessions (filtered by institution)
		if (type === 'sessions' && institutionId) {
			const { data, error } = await supabase
				.from('examination_sessions')
				.select('id, session_name, session_code, session_type, start_date, end_date')
				.eq('institutions_id', institutionId)
				.eq('is_active', true)
				.order('start_date', { ascending: false })

			if (error) {
				console.error('Error fetching sessions:', error)
				return NextResponse.json({ error: 'Failed to fetch examination sessions' }, { status: 500 })
			}

			return NextResponse.json(data || [])
		}

		// 3. Fetch Course Offerings (filtered by institution and session)
		if (type === 'courses' && institutionId && sessionId) {
			// Get course offerings that have exam timetables for this session
			const { data, error } = await supabase
				.from('exam_timetables')
				.select(`
					course_offering_id,
					course_offerings!inner(
						id,
						courses!inner(
							id,
							course_code,
							course_title
						)
					)
				`)
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)

			if (error) {
				console.error('Error fetching courses:', error)
				return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
			}

			// Extract unique courses
			const uniqueCourses = new Map()
			data?.forEach((item: any) => {
				const course = item.course_offerings?.courses
				const offeringId = item.course_offerings?.id
				if (course && offeringId && !uniqueCourses.has(offeringId)) {
					uniqueCourses.set(offeringId, {
						course_offering_id: offeringId,
						course_code: course.course_code,
						course_title: course.course_title,
						course_id: course.id
					})
				}
			})

			const courses = Array.from(uniqueCourses.values()).sort((a: any, b: any) =>
				a.course_code.localeCompare(b.course_code)
			)

			return NextResponse.json(courses)
		}

		// 4. Fetch Exam Dates (filtered by institution, session, course, and current date)
		if (type === 'exam_dates' && institutionId && sessionId && courseOfferingId) {
			const today = new Date().toISOString().split('T')[0]

			const { data, error } = await supabase
				.from('exam_timetables')
				.select('id, exam_date, exam_time, session, duration_minutes')
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('course_offering_id', courseOfferingId)
				.eq('exam_date', today)
				.eq('is_published', true)
				.order('exam_time', { ascending: true })

			if (error) {
				console.error('Error fetching exam dates:', error)
				return NextResponse.json({ error: 'Failed to fetch exam dates' }, { status: 500 })
			}

			return NextResponse.json(data || [])
		}

		// 5. Fetch Session Types (FN/AN) for selected exam date
		if (type === 'session_types' && institutionId && sessionId && courseOfferingId && examDate) {
			const { data, error } = await supabase
				.from('exam_timetables')
				.select('id, session, exam_time')
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('course_offering_id', courseOfferingId)
				.eq('exam_date', examDate)
				.eq('is_published', true)

			if (error) {
				console.error('Error fetching session types:', error)
				return NextResponse.json({ error: 'Failed to fetch session types' }, { status: 500 })
			}

			return NextResponse.json(data || [])
		}

		return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
	} catch (e) {
		console.error('Cascading dropdown API error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
