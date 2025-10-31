import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: Fetch unique course codes from attendance table filtered by user's institution
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const userEmail = searchParams.get('user_email')

		if (!userEmail) {
			return NextResponse.json({ error: 'User email is required' }, { status: 400 })
		}

		const supabase = getSupabaseServer()

		// Step 1: Get user's institution_id from users table
		// Note: institution_id in users table stores the institution UUID directly
		const { data: userData, error: userError } = await supabase
			.from('users')
			.select('institution_id')
			.eq('email', userEmail)
			.single()

		if (userError || !userData) {
			console.error('Error fetching user institution:', userError)
			return NextResponse.json({
				error: 'User institution not found'
			}, { status: 404 })
		}

		if (!userData.institution_id) {
			return NextResponse.json({
				error: 'User does not have an institution assigned'
			}, { status: 400 })
		}

		const institutionId = userData.institution_id // This is the UUID

		// Step 2: Get unique course IDs from exam_attendance
		const { data: attendanceRecords, error: attendanceError } = await supabase
			.from('exam_attendance')
			.select('course_id')
			.eq('institutions_id', institutionId)

		if (attendanceError) {
			console.error('Error fetching attendance records:', attendanceError)
			return NextResponse.json({
				error: 'Failed to fetch attendance records',
				details: attendanceError.message
			}, { status: 500 })
		}

		// Step 3: Get unique course IDs
		const uniqueCourseIds = [...new Set(
			attendanceRecords?.map(record => record.course_id).filter(Boolean)
		)]

		if (uniqueCourseIds.length === 0) {
			return NextResponse.json([])
		}

		console.log('Unique course IDs found:', uniqueCourseIds.length)

		// Step 4: Fetch courses one by one to avoid join issues
		const coursesPromises = uniqueCourseIds.map(async (courseId) => {
			const { data, error } = await supabase
				.from('courses')
				.select('id, course_code, course_name')
				.eq('id', courseId)
				.single()

			if (error) {
				console.error(`Error fetching course ${courseId}:`, error)
				return null
			}
			return data
		})

		const coursesResults = await Promise.all(coursesPromises)
		const courses = coursesResults
			.filter(Boolean)
			.sort((a: any, b: any) => a.course_code.localeCompare(b.course_code))
			.map((course: any) => ({
				id: course.id,
				course_code: course.course_code,
				course_name: course.course_name
			}))

		return NextResponse.json(courses)

	} catch (error) {
		console.error('Error in attendance-correction/courses GET:', error)
		return NextResponse.json({
			error: 'Failed to fetch courses'
		}, { status: 500 })
	}
}
