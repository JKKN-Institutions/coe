import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createHash } from 'crypto'

export async function GET(request: Request) {
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

				return NextResponse.json(data)
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
					.order('session_name')

				if (error) {
					console.error('Error fetching sessions:', error)
					return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 400 })
				}

				return NextResponse.json(data)
			}

			case 'programs': {
				const institutionId = searchParams.get('institutionId')

				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				const { data, error } = await supabase
					.from('programs')
					.select('id, program_code, program_name')
					.eq('institutions_id', institutionId)
					.eq('is_active', true)
					.order('program_name')

				if (error) {
					console.error('Error fetching programs:', error)
					return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 400 })
				}

				return NextResponse.json(data)
			}

			case 'courses': {
				const institutionId = searchParams.get('institutionId')

				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				const { data, error } = await supabase
					.from('courses')
					.select('id, course_code, course_name, internal_max_mark')
					.eq('institutions_id', institutionId)
					.order('course_code')

				if (error) {
					console.error('Error fetching courses:', error)
					return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 400 })
				}

				return NextResponse.json(data)
			}

			case 'internal-types': {
				// Return available internal mark types
				const types = [
					{ value: 'assignment', label: 'Assignment' },
					{ value: 'quiz', label: 'Quiz' },
					{ value: 'mid_term', label: 'Mid Term' },
					{ value: 'presentation', label: 'Presentation' },
					{ value: 'attendance', label: 'Attendance' },
					{ value: 'lab', label: 'Lab' },
					{ value: 'project', label: 'Project' },
					{ value: 'seminar', label: 'Seminar' },
					{ value: 'viva', label: 'Viva' },
					{ value: 'test_1', label: 'Test 1' },
					{ value: 'test_2', label: 'Test 2' },
					{ value: 'test_3', label: 'Test 3' },
					{ value: 'other', label: 'Other' }
				]
				return NextResponse.json(types)
			}

			case 'marks': {
				const institutionId = searchParams.get('institutionId')
				const sessionId = searchParams.get('sessionId')
				const programId = searchParams.get('programId')
				const courseId = searchParams.get('courseId')

				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				// Paginate to bypass Supabase 1000 row limit - fetch up to 1,000,000 records
				let allMarks: any[] = []
				const pageSize = 1000
				let page = 0
				let hasMore = true

				while (hasMore) {
					let query = supabase
						.from('internal_marks')
						.select(`
							id,
							institutions_id,
							examination_session_id,
							program_id,
							course_id,
							student_id,
							assignment_marks,
							quiz_marks,
							mid_term_marks,
							presentation_marks,
							attendance_marks,
							lab_marks,
							project_marks,
							seminar_marks,
							viva_marks,
							other_marks,
							test_1_mark,
							test_2_mark,
							test_3_mark,
							total_internal_marks,
							max_internal_marks,
							internal_percentage,
							marks_status,
							remarks,
							is_active,
							created_at,
							exam_registrations:exam_registration_id (
								id,
								stu_register_no,
								student_name
							),
							courses:course_id (
								id,
								course_code,
								course_name
							),
							programs:program_id (
								id,
								program_code,
								program_name
							),
							examination_sessions:examination_session_id (
								id,
								session_name,
								session_code
							)
						`)
						.eq('institutions_id', institutionId)
						.eq('is_active', true)
						.order('created_at', { ascending: false })
						.range(page * pageSize, (page + 1) * pageSize - 1)

					if (sessionId) {
						query = query.eq('examination_session_id', sessionId)
					}
					if (programId) {
						query = query.eq('program_id', programId)
					}
					if (courseId) {
						query = query.eq('course_id', courseId)
					}

					const { data, error } = await query

					if (error) {
						console.error('Error fetching internal marks page:', page, error)
						return NextResponse.json({ error: 'Failed to fetch internal marks' }, { status: 400 })
					}

					if (data && data.length > 0) {
						allMarks = allMarks.concat(data)
						page++
						// Continue if we got a full page AND haven't exceeded 1,000,000 records
						hasMore = data.length === pageSize && allMarks.length < 1000000
					} else {
						hasMore = false
					}
				}

				// Transform data for display
				const transformedData = allMarks.map(mark => {
					const examReg = mark.exam_registrations as any

					// Get student info from exam_registration (student_id is from MyJKKN API, not a local table)
					const studentName = examReg?.student_name || 'Unknown'

					return {
						...mark,
						student_name: studentName,
						register_no: examReg?.stu_register_no || 'N/A',
						course_code: (mark.courses as any)?.course_code || '',
						course_name: (mark.courses as any)?.course_name || '',
						program_name: (mark.programs as any)?.program_name || '',
						session_name: (mark.examination_sessions as any)?.session_name || ''
					}
				})

				return NextResponse.json(transformedData)
			}

			case 'students': {
				const institutionId = searchParams.get('institutionId')
				const programId = searchParams.get('programId')

				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				// Get students from users table with student role
				let query = supabase
					.from('users')
					.select(`
						id,
						full_name,
						email,
						user_roles!inner (
							roles!inner (
								role_name
							)
						)
					`)
					.eq('is_active', true)

				const { data, error } = await query

				if (error) {
					console.error('Error fetching students:', error)
					return NextResponse.json({ error: 'Failed to fetch students' }, { status: 400 })
				}

				// Filter for students only
				const students = data?.filter((user: any) =>
					user.user_roles?.some((ur: any) =>
						ur.roles?.role_name?.toLowerCase() === 'student'
					)
				).map((user: any) => ({
					id: user.id,
					full_name: user.full_name,
					register_no: user.email?.split('@')[0] || 'N/A',
					email: user.email
				}))

				return NextResponse.json(students || [])
			}

			default:
				return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
		}
	} catch (error) {
		console.error('Internal marks API error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export async function POST(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const body = await request.json()
		const { action } = body

		if (action === 'bulk-upload') {
			return handleBulkUpload(supabase, body)
		} else if (action === 'bulk-delete') {
			return handleBulkDelete(supabase, body)
		} else {
			// Single mark insert
			return handleSingleInsert(supabase, body)
		}
	} catch (error) {
		console.error('Internal marks POST error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

async function handleSingleInsert(supabase: any, body: any) {
	const {
		institutions_id,
		examination_session_id,
		program_id,
		course_id,
		student_id,
		internal_type,
		marks
	} = body

	// Validate required fields
	if (!institutions_id || !student_id || !course_id || !internal_type || marks === undefined) {
		return NextResponse.json({
			error: 'Missing required fields: institutions_id, student_id, course_id, internal_type, and marks are required'
		}, { status: 400 })
	}

	// Get course max marks
	const { data: course } = await supabase
		.from('courses')
		.select('internal_max_mark')
		.eq('id', course_id)
		.single()

	const maxMark = course?.internal_max_mark || 100

	// Validate marks
	if (marks < 0 || marks > maxMark) {
		return NextResponse.json({
			error: `Marks must be between 0 and ${maxMark}`
		}, { status: 400 })
	}

	// Build the marks object based on internal_type
	const marksData: any = {
		institutions_id,
		examination_session_id,
		program_id,
		course_id,
		student_id,
		marks_status: 'Draft',
		is_active: true
	}

	// Set the specific mark type
	const markFieldMap: Record<string, string> = {
		'assignment': 'assignment_marks',
		'quiz': 'quiz_marks',
		'mid_term': 'mid_term_marks',
		'presentation': 'presentation_marks',
		'attendance': 'attendance_marks',
		'lab': 'lab_marks',
		'project': 'project_marks',
		'seminar': 'seminar_marks',
		'viva': 'viva_marks',
		'test_1': 'test_1_mark',
		'test_2': 'test_2_mark',
		'test_3': 'test_3_mark',
		'other': 'other_marks'
	}

	const markField = markFieldMap[internal_type]
	if (markField) {
		marksData[markField] = marks
	}

	// Check if record already exists
	const { data: existing } = await supabase
		.from('internal_marks')
		.select('id')
		.eq('institutions_id', institutions_id)
		.eq('student_id', student_id)
		.eq('course_id', course_id)
		.eq('examination_session_id', examination_session_id || '')
		.single()

	if (existing) {
		// Update existing record
		const { data, error } = await supabase
			.from('internal_marks')
			.update({ [markField]: marks })
			.eq('id', existing.id)
			.select()
			.single()

		if (error) {
			console.error('Error updating internal mark:', error)
			return NextResponse.json({ error: error.message }, { status: 400 })
		}

		return NextResponse.json(data)
	} else {
		// Insert new record
		const { data, error } = await supabase
			.from('internal_marks')
			.insert(marksData)
			.select()
			.single()

		if (error) {
			console.error('Error inserting internal mark:', error)
			if (error.code === '23505') {
				return NextResponse.json({ error: 'Record already exists for this student and course' }, { status: 400 })
			}
			return NextResponse.json({ error: error.message }, { status: 400 })
		}

		return NextResponse.json(data)
	}
}

async function handleBulkUpload(supabase: any, body: any) {
	const {
		institutions_id,
		examination_session_id,
		program_id,
		course_id,
		course_offering_id,
		marks_data,
		file_name,
		file_size,
		file_type,
		user_id,
		user_email
	} = body

	// Validate required fields
	if (!institutions_id || !marks_data || !Array.isArray(marks_data) || marks_data.length === 0) {
		return NextResponse.json({
			error: 'Missing required fields: institutions_id and marks_data array are required'
		}, { status: 400 })
	}

	// Look up local user - try by user_id first, then by email (optional - for tracking purposes)
	let uploaded_by: string | null = null

	if (user_id) {
		// First try to find user by ID (most reliable)
		const { data, error } = await supabase
			.from('users')
			.select('id')
			.eq('id', user_id)
			.maybeSingle()

		if (!error && data) {
			uploaded_by = data.id
		}
	}

	// Fallback to email lookup if ID lookup failed
	if (!uploaded_by && user_email) {
		const { data, error } = await supabase
			.from('users')
			.select('id')
			.eq('email', user_email)
			.maybeSingle()

		if (!error && data) {
			uploaded_by = data.id
		}
	}

	// Log if user not found (but don't block the upload)
	if (!uploaded_by) {
		console.warn('User not found in local users table (proceeding without tracking):', { user_id, user_email })
	}

	// Debug: Log the institutions_id being used
	console.log('=== DEBUG: Bulk Upload Request ===')
	console.log('institutions_id from request:', institutions_id)
	console.log('Expected institutions_id for JKKN Arts:', '5aae1d9d-f4c3-4fa9-8806-d45c71ae35e4')
	console.log('Match:', institutions_id === '5aae1d9d-f4c3-4fa9-8806-d45c71ae35e4')

	// Generate file hash
	const fileContent = JSON.stringify(marks_data)
	const file_hash = createHash('sha256').update(fileContent).digest('hex')

	// Try to create batch record if all required fields are available
	let batch: any = null
	let batchCreated = false

	if (examination_session_id && course_offering_id && program_id && course_id) {
		const { data: batchData, error: batchError } = await supabase
			.from('marks_upload_batches')
			.insert({
				institutions_id,
				examination_session_id,
				course_offering_id,
				program_id,
				course_id,
				upload_type: 'Marks',
				total_records: marks_data.length,
				successful_records: 0,
				failed_records: 0,
				skipped_records: 0,
				file_name: file_name || 'bulk_upload.xlsx',
				file_size: file_size || fileContent.length,
				file_type: file_type || 'XLSX',
				file_hash,
				upload_status: 'Pending',
				uploaded_by,
				upload_metadata: {
					source: 'bulk_internal_marks_upload',
					internal_type_breakdown: {}
				},
				is_active: true
			})
			.select()
			.single()

		if (batchError) {
			console.error('Error creating batch:', batchError)
			// Don't fail the upload, just skip batch tracking
			if (batchError.code === '23505') {
				return NextResponse.json({ error: 'This file has already been uploaded' }, { status: 400 })
			}
		} else {
			batch = batchData
			batchCreated = true
		}
	}

	// Process marks - this will trigger the status change to Processing
	const results = {
		successful: 0,
		failed: 0,
		skipped: 0,
		errors: [] as any[],
		validation_errors: [] as any[]
	}

	// Get exam registrations with student and course info for validation
	// This links register numbers to students and courses via course_offerings
	// We need to fetch ALL exam registrations for this institution to allow matching across sessions
	// Paginate to bypass Supabase 1000 row limit
	let examRegistrations: any[] = []
	let examRegError = null
	const pageSize = 1000
	let page = 0
	let hasMore = true

	while (hasMore) {
		const { data, error } = await supabase
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
					courses!inner (
						id,
						course_code,
						internal_max_mark
					)
				)
			`)
			.eq('institutions_id', institutions_id)
			.range(page * pageSize, (page + 1) * pageSize - 1)

		if (error) {
			examRegError = error
			console.error('Error fetching exam registrations page:', page, error)
			break
		}

		if (data && data.length > 0) {
			examRegistrations = examRegistrations.concat(data)
			page++
			hasMore = data.length === pageSize
		} else {
			hasMore = false
		}
	}

	if (examRegError) {
		console.error('Error fetching exam registrations:', examRegError)
	}

	// Debug: Log exam registrations found
	console.log('=== DEBUG: Exam Registrations ===')
	console.log('Total exam registrations fetched:', examRegistrations?.length || 0)
	if (examRegistrations && examRegistrations.length > 0) {
		console.log('Sample registration:', JSON.stringify(examRegistrations[0], null, 2))
		console.log('Register numbers found (first 10):', examRegistrations.slice(0, 10).map((er: any) => er.stu_register_no))

		// Check specifically for JUGENG students
		const engStudents = examRegistrations.filter((er: any) =>
			er.stu_register_no?.toUpperCase()?.includes('JUGENG')
		)
		console.log('Total JUGENG (English) students found:', engStudents.length)
		if (engStudents.length > 0) {
			console.log('JUGENG students:', engStudents.slice(0, 20).map((er: any) => er.stu_register_no))
		}
	}

	// Also get courses directly for validation (in case course is not in exam_registrations)
	const { data: courses } = await supabase
		.from('courses')
		.select('id, course_code, internal_max_mark')
		.eq('institutions_id', institutions_id)

	// Build maps for fast lookup
	// Map: register_no + course_code -> exam_registration info
	const examRegMap = new Map<string, {
		exam_registration_id: string
		student_id: string
		student_name: string
		course_id: string
		course_code: string
		course_offering_id: string
		program_id: string
		examination_session_id: string
		internal_max_mark: number
	}>()

	examRegistrations?.forEach((er: any) => {
		const regNo = er.stu_register_no?.toLowerCase()?.trim()
		const courseCode = er.course_offerings?.courses?.course_code?.toLowerCase()?.trim()
		if (regNo && courseCode) {
			const key = `${regNo}|${courseCode}`
			examRegMap.set(key, {
				exam_registration_id: er.id,
				student_id: er.student_id,
				student_name: er.student_name,
				course_id: er.course_offerings.courses.id,
				course_code: er.course_offerings.courses.course_code,
				course_offering_id: er.course_offerings.id,
				program_id: er.course_offerings.program_id,
				examination_session_id: er.examination_session_id,
				internal_max_mark: er.course_offerings.courses.internal_max_mark || 100
			})
		}
	})

	// Also create a simple course map for validation messages
	const courseMap = new Map<string, { id: string; course_code: string; internal_max_mark: number }>(
		courses?.map((c: any) => [c.course_code?.toLowerCase(), c]) || []
	)

	// Create a set of valid register numbers for better error messages
	const validRegisterNos = new Set<string>(
		examRegistrations?.map((er: any) => er.stu_register_no?.toLowerCase()?.trim()).filter(Boolean) || []
	)

	// Debug: Log the lookup maps
	console.log('=== DEBUG: Lookup Maps ===')
	console.log('examRegMap keys (first 10):', Array.from(examRegMap.keys()).slice(0, 10))
	console.log('validRegisterNos (first 10):', Array.from(validRegisterNos).slice(0, 10))
	console.log('courseMap keys:', Array.from(courseMap.keys()))

	// Process each row
	for (let i = 0; i < marks_data.length; i++) {
		const row = marks_data[i]
		const rowNumber = i + 2 // +2 for Excel header row
		const rowErrors: string[] = []

		// Look up exam registration by register_no + course_code combination
		const registerNo = String(row.register_no || '').toLowerCase().trim()
		const courseCode = String(row.course_code || '').toLowerCase().trim()
		const lookupKey = `${registerNo}|${courseCode}`
		const examReg = examRegMap.get(lookupKey)

		// Debug: Log the first few lookups
		if (i < 3) {
			console.log(`=== DEBUG: Row ${i + 1} Lookup ===`)
			console.log('Looking for:', { registerNo, courseCode, lookupKey })
			console.log('Found:', examReg ? 'YES' : 'NO')
			console.log('validRegisterNos.has(registerNo):', validRegisterNos.has(registerNo))
			console.log('courseMap.has(courseCode):', courseMap.has(courseCode))
		}

		// Provide specific error messages and skip if no exam registration
		if (!examReg) {
			// Check if register number exists at all
			if (!validRegisterNos.has(registerNo)) {
				rowErrors.push(`Student with register number "${row.register_no}" not found in exam registrations`)
			} else if (!courseMap.has(courseCode)) {
				rowErrors.push(`Course with code "${row.course_code}" not found`)
			} else {
				rowErrors.push(`No exam registration found for student "${row.register_no}" in course "${row.course_code}"`)
			}
			results.failed++
			results.validation_errors.push({
				row: rowNumber,
				register_no: row.register_no || 'N/A',
				course_code: row.course_code || 'N/A',
				errors: rowErrors
			})
			continue
		}

		// Parse all marks values (now integers instead of decimals)
		const parseMarks = (value: any): number | null => {
			if (value === '' || value === null || value === undefined) return null
			const num = parseInt(String(value), 10)
			return isNaN(num) ? null : num
		}

		const assignmentMarks = parseMarks(row.assignment_marks)
		const quizMarks = parseMarks(row.quiz_marks)
		const midTermMarks = parseMarks(row.mid_term_marks)
		const presentationMarks = parseMarks(row.presentation_marks)
		const attendanceMarks = parseMarks(row.attendance_marks)
		const labMarks = parseMarks(row.lab_marks)
		const projectMarks = parseMarks(row.project_marks)
		const seminarMarks = parseMarks(row.seminar_marks)
		const vivaMarks = parseMarks(row.viva_marks)
		const otherMarks = parseMarks(row.other_marks)
		const test1Mark = parseMarks(row.test_1_mark)
		const test2Mark = parseMarks(row.test_2_mark)
		const test3Mark = parseMarks(row.test_3_mark)
		const maxInternalMarks = parseMarks(row.max_internal_marks) || 100
		const remarks = String(row.remarks || '').trim()

		// Check if at least one marks type is provided
		const hasAnyMarks = assignmentMarks !== null || quizMarks !== null || midTermMarks !== null ||
			presentationMarks !== null || attendanceMarks !== null || labMarks !== null ||
			projectMarks !== null || seminarMarks !== null || vivaMarks !== null || otherMarks !== null ||
			test1Mark !== null || test2Mark !== null || test3Mark !== null

		if (!hasAnyMarks) {
			rowErrors.push('At least one marks type must be provided')
		}

		// Validate each marks range (0-100)
		const validateMarksRange = (name: string, value: number | null) => {
			if (value !== null) {
				if (value < 0) rowErrors.push(`${name} cannot be negative`)
				if (value > 100) rowErrors.push(`${name} cannot exceed 100`)
			}
		}

		validateMarksRange('Assignment Marks', assignmentMarks)
		validateMarksRange('Quiz Marks', quizMarks)
		validateMarksRange('Mid Term Marks', midTermMarks)
		validateMarksRange('Presentation Marks', presentationMarks)
		validateMarksRange('Attendance Marks', attendanceMarks)
		validateMarksRange('Lab Marks', labMarks)
		validateMarksRange('Project Marks', projectMarks)
		validateMarksRange('Seminar Marks', seminarMarks)
		validateMarksRange('Viva Marks', vivaMarks)
		validateMarksRange('Test 1 Mark', test1Mark)
		validateMarksRange('Test 2 Mark', test2Mark)
		validateMarksRange('Test 3 Mark', test3Mark)
		validateMarksRange('Other Marks', otherMarks)

		if (rowErrors.length > 0) {
			results.failed++
			results.validation_errors.push({
				row: rowNumber,
				register_no: row.register_no || 'N/A',
				course_code: row.course_code || 'N/A',
				errors: rowErrors
			})
			continue
		}

		try {
			// Check if record exists
			const { data: existing } = await supabase
				.from('internal_marks')
				.select('id')
				.eq('institutions_id', institutions_id)
				.eq('student_id', examReg.student_id)
				.eq('course_id', examReg.course_id)
				.maybeSingle()

			// Build marks data object with exam registration info
			const marksDataObj: any = {
				assignment_marks: assignmentMarks,
				quiz_marks: quizMarks,
				mid_term_marks: midTermMarks,
				presentation_marks: presentationMarks,
				attendance_marks: attendanceMarks,
				lab_marks: labMarks,
				project_marks: projectMarks,
				seminar_marks: seminarMarks,
				viva_marks: vivaMarks,
				other_marks: otherMarks,
				test_1_mark: test1Mark,
				test_2_mark: test2Mark,
				test_3_mark: test3Mark,
				max_internal_marks: maxInternalMarks || examReg.internal_max_mark,
				remarks: remarks || null,
				examination_session_id: examReg.examination_session_id,
				program_id: examReg.program_id,
				course_offering_id: examReg.course_offering_id,
				exam_registration_id: examReg.exam_registration_id,
				faculty_id: uploaded_by,
				submission_date: new Date().toISOString().split('T')[0],
				total_internal_marks: (assignmentMarks || 0) + (quizMarks || 0) + (midTermMarks || 0) +
					(presentationMarks || 0) + (attendanceMarks || 0) + (labMarks || 0) +
					(projectMarks || 0) + (seminarMarks || 0) + (vivaMarks || 0) + (otherMarks || 0) +
					(test1Mark || 0) + (test2Mark || 0) + (test3Mark || 0)
			}

			if (existing) {
				// Update existing
				const { data: updatedData, error: updateError } = await supabase
					.from('internal_marks')
					.update(marksDataObj)
					.eq('id', existing.id)
					.select('id')
					.single()

				if (updateError) {
					console.error('Update error for row', rowNumber, ':', updateError)
					throw updateError
				}
				console.log('Updated record:', existing.id, 'for student:', examReg.student_id)
				results.successful++
			} else {
				// Insert new
				const insertData: any = {
					institutions_id,
					course_id: examReg.course_id,
					student_id: examReg.student_id,
					marks_status: 'Draft',
					is_active: true,
					...marksDataObj
				}

				const { data: insertedData, error: insertError } = await supabase
					.from('internal_marks')
					.insert(insertData)
					.select('id')
					.single()

				if (insertError) {
					console.error('Insert error for row', rowNumber, ':', insertError)
					throw insertError
				}
				console.log('Inserted new record:', insertedData?.id, 'for student:', examReg.student_id)
				results.successful++
			}
		} catch (error: any) {
			results.failed++
			// Provide more specific error messages for foreign key violations
			let errorMessage = error.message || 'Database error'
			if (error.code === '23503') {
				if (error.message?.includes('student_id')) {
					errorMessage = `Student record not found in students table. The student may have been deleted or not properly registered.`
				} else if (error.message?.includes('course_id')) {
					errorMessage = `Course not found in courses table.`
				} else if (error.message?.includes('faculty_id')) {
					errorMessage = `Invalid faculty/user ID.`
				} else {
					errorMessage = `Foreign key constraint violation: ${error.detail || error.message}`
				}
			}
			results.errors.push({
				row: rowNumber,
				register_no: row.register_no,
				course_code: row.course_code,
				error: errorMessage
			})
		}
	}

	// Determine final status
	let finalStatus = 'Completed'
	if (results.failed === marks_data.length) {
		finalStatus = 'Failed'
	} else if (results.failed > 0) {
		finalStatus = 'Partial'
	}

	// Update batch record with results if batch was created
	if (batchCreated && batch) {
		const { error: updateBatchError } = await supabase
			.from('marks_upload_batches')
			.update({
				successful_records: results.successful,
				failed_records: results.failed,
				skipped_records: results.skipped,
				upload_status: finalStatus,
				error_details: results.errors.length > 0 ? results.errors : null,
				validation_errors: results.validation_errors.length > 0 ? results.validation_errors : null,
				processing_notes: `Processed ${marks_data.length} records: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`
			})
			.eq('id', batch.id)

		if (updateBatchError) {
			console.error('Error updating batch:', updateBatchError)
		}
	}

	return NextResponse.json({
		batch_id: batch?.id || null,
		batch_number: batch?.batch_number || 'N/A',
		status: finalStatus,
		total: marks_data.length,
		successful: results.successful,
		failed: results.failed,
		skipped: results.skipped,
		errors: results.errors,
		validation_errors: results.validation_errors
	})
}

async function handleBulkDelete(supabase: any, body: any) {
	const { ids } = body

	if (!ids || !Array.isArray(ids) || ids.length === 0) {
		return NextResponse.json({ error: 'No IDs provided for deletion' }, { status: 400 })
	}

	// Soft delete by setting is_active to false
	const { data, error } = await supabase
		.from('internal_marks')
		.update({ is_active: false })
		.in('id', ids)
		.select()

	if (error) {
		console.error('Error deleting internal marks:', error)
		return NextResponse.json({ error: 'Failed to delete records' }, { status: 500 })
	}

	return NextResponse.json({
		deleted: data?.length || 0,
		message: `Successfully deleted ${data?.length || 0} record(s)`
	})
}

export async function DELETE(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json({ error: 'ID is required' }, { status: 400 })
		}

		// Soft delete
		const { error } = await supabase
			.from('internal_marks')
			.update({ is_active: false })
			.eq('id', id)

		if (error) {
			console.error('Error deleting internal mark:', error)
			return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
		}

		return NextResponse.json({ message: 'Record deleted successfully' })
	} catch (error) {
		console.error('Internal marks DELETE error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
