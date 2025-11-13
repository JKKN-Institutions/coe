import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: Fetch unique course codes from exam_registrations via attendance table filtered by user's institution
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

		// Step 2: Fetch ALL attendance records in batches to get all unique course codes
		// Supabase has a default limit of 1000, so we need to fetch all records
		console.log('Fetching all attendance records (may take a moment for 100k+ records)...')

		let allAttendanceRecords: any[] = []
		let from = 0
		const batchSize = 1000
		let hasMore = true

		while (hasMore) {
			const { data, error } = await supabase
				.from('exam_attendance')
				.select(`
					institutions_id,
					exam_registrations!inner (
						course_code
					)
				`)
				.eq('institutions_id', institutionId)
				.range(from, from + batchSize - 1)

			if (error) {
				console.error('Error fetching attendance batch:', error)
				return NextResponse.json({
					error: 'Failed to fetch attendance records',
					details: error.message
				}, { status: 500 })
			}

			if (data && data.length > 0) {
				allAttendanceRecords = allAttendanceRecords.concat(data)
				from += batchSize
				console.log(`Fetched ${allAttendanceRecords.length} records so far...`)

				// If we got fewer records than batch size, we've reached the end
				if (data.length < batchSize) {
					hasMore = false
				}
			} else {
				hasMore = false
			}
		}

		console.log('Total attendance records fetched:', allAttendanceRecords.length)

		// Get unique course codes from ALL attendance records
		const uniqueCourseCodes = [...new Set(
			allAttendanceRecords
				.map((record: any) => record.exam_registrations?.course_code)
				.filter(Boolean)
		)]

		if (uniqueCourseCodes.length === 0) {
			return NextResponse.json([])
		}

		console.log('Unique course codes found:', uniqueCourseCodes.length)
		console.log('Sample course codes:', uniqueCourseCodes.slice(0, 20))
		console.log('Is 24UENS02 in list?:', uniqueCourseCodes.includes('24UENS02'))

		// Step 4: Fetch courses from courses table by course_code
		const coursesPromises = uniqueCourseCodes.map(async (courseCode) => {
			const { data, error } = await supabase
				.from('courses')
				.select('id, course_code, course_name')
				.eq('course_code', courseCode)
				.single()

			if (error) {
				console.error(`Error fetching course ${courseCode}:`, error)
				// If course doesn't exist in courses table, return the course_code with placeholder name
				return {
					id: courseCode,
					course_code: courseCode,
					course_name: courseCode // Use course_code as name if not found
				}
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
