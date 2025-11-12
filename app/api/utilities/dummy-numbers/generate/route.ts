import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array]
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
	}
	return shuffled
}

// Helper function to generate dummy number from format
function generateDummyNumber(format: string, index: number, startFrom: number): string {
	const number = startFrom + index
	// Replace {N} with the number, padding with zeros if needed
	// Format examples: "DN{N:4}" -> "DN0001", "DUMMY-{N:5}" -> "DUMMY-00001"
	const match = format.match(/\{N:?(\d+)?\}/)
	if (match) {
		const padding = match[1] ? parseInt(match[1]) : 0
		const paddedNumber = String(number).padStart(padding, '0')
		return format.replace(/\{N:?\d*\}/, paddedNumber)
	}
	// If no format pattern, just append the number
	return `${format}${number}`
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const supabase = getSupabaseServer()

		// Validate required fields
		const {
			institutions_id,
			examination_session_id,
			source_mode, // 'attendance' or 'registration'
			generation_mode, // 'sequence' or 'shuffle'
			dummy_number_format, // e.g., "DN{N:4}" or "DUMMY-{N:5}"
			start_from, // Starting number, e.g., 1, 100, 1000
			generated_by, // User ID
			board_code, // Optional filter
			course_code, // Optional filter
			program_code // Optional filter
		} = body

		if (!institutions_id) {
			return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
		}
		if (!examination_session_id) {
			return NextResponse.json({ error: 'Examination session ID is required' }, { status: 400 })
		}
		if (!source_mode || !['attendance', 'registration'].includes(source_mode)) {
			return NextResponse.json({ error: 'Invalid source mode. Must be "attendance" or "registration"' }, { status: 400 })
		}
		if (!generation_mode || !['sequence', 'shuffle'].includes(generation_mode)) {
			return NextResponse.json({ error: 'Invalid generation mode. Must be "sequence" or "shuffle"' }, { status: 400 })
		}
		if (!dummy_number_format) {
			return NextResponse.json({ error: 'Dummy number format is required' }, { status: 400 })
		}

		const startNumber = start_from || 1

		console.log('🎲 Generating dummy numbers:', {
			institutions_id,
			examination_session_id,
			source_mode,
			generation_mode,
			dummy_number_format,
			start_from: startNumber,
			filters: { board_code, course_code, program_code }
		})

		// Step 1: Fetch students based on source mode with filters
		let studentsData: any[] = []

		if (source_mode === 'attendance') {
			// Fetch from exam_attendance (Present students only, Theory papers only)
			// Support up to 100,000 records with efficient pagination
			const allData: any[] = []
			let offset = 0
			const limit = 50000 // Increased batch size for better performance
			const maxRecords = 100000 // Safety limit
			let hasMore = true

			while (hasMore && allData.length < maxRecords) {
				let query = supabase
					.from('exam_attendance')
					.select(`
						id,
						exam_registration_id,
						exam_timetable_id,
						student_id,
						attendance_status,
						exam_registration:exam_registrations (
							id,
							stu_register_no,
							is_regular,
							course_offering:course_offerings (
								course_code,
								course:courses (
									course_code,
									course_name,
									course_type,
									course_category,
									board_code,
									board:board (
										board_code,
										board_order
									)
								),
								program:programs (
									program_code,
									program_name,
									program_order
								)
							)
						),
						student:students (
							id,
							roll_number,
							first_name,
							last_name
						)
					`)
					.eq('institutions_id', institutions_id)
					.eq('examination_session_id', examination_session_id)
					.eq('attendance_status', 'Present')
					.range(offset, offset + limit - 1)

				const { data, error } = await query

				if (error) {
					console.error('Error fetching attendance data:', error)
					return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 })
				}

				if (data && data.length > 0) {
					allData.push(...data)
					console.log(`📥 Fetched batch: ${data.length} records (offset: ${offset}, total: ${allData.length})`)
				}

				hasMore = data && data.length === limit
				offset += limit

				// Safety check
				if (allData.length >= maxRecords) {
					console.warn(`⚠️ Reached maximum record limit of ${maxRecords}`)
					break
				}
			}

			console.log(`📊 Total attendance records fetched: ${allData.length}`)
			studentsData = allData
		} else {
			// Fetch from exam_registrations (All approved students, Theory papers only)
			// Support up to 100,000 records with efficient pagination
			const allData: any[] = []
			let offset = 0
			const limit = 50000 // Increased batch size for better performance
			const maxRecords = 100000 // Safety limit
			let hasMore = true

			while (hasMore && allData.length < maxRecords) {
				let query = supabase
					.from('exam_registrations')
					.select(`
						id,
						stu_register_no,
						is_regular,
						student_id,
						course_offering:course_offerings (
							id,
							course_code,
							course:courses (
								course_code,
								course_name,
								course_type,
								course_category,
								board_code,
								board:board (
								board_code,
								board_order
							)
							),
							program:programs (
								program_code,
								program_name,
								program_order
							)
						),
						student:students (
							id,
							roll_number,
							first_name,
							last_name
						)
					`)
					.eq('institutions_id', institutions_id)
					.eq('examination_session_id', examination_session_id)
					.eq('registration_status', 'Approved')
					.range(offset, offset + limit - 1)

				const { data, error } = await query

				if (error) {
					console.error('Error fetching registration data:', error)
					return NextResponse.json({ error: 'Failed to fetch registration data' }, { status: 500 })
				}

				if (data && data.length > 0) {
					allData.push(...data)
					console.log(`📥 Fetched batch: ${data.length} records (offset: ${offset}, total: ${allData.length})`)
				}

				hasMore = data && data.length === limit
				offset += limit

				// Safety check
				if (allData.length >= maxRecords) {
					console.warn(`⚠️ Reached maximum record limit of ${maxRecords}`)
					break
				}
			}

			console.log(`📊 Total registrations fetched: ${allData.length}`)
			const data = allData

			if (!data || data.length === 0) {
				return NextResponse.json({
					error: 'No approved registrations found for the selected institution and session'
				}, { status: 400 })
			}

			// Transform registration data to match attendance structure
			studentsData = (data || []).map((reg: any) => ({
				exam_registration_id: reg.id,
				exam_timetable_id: null, // Will need to be fetched separately or left null for registration mode
				student_id: reg.student_id,
				exam_registration: {
					...reg,
					course_offering: reg.course_offering // Ensure course_offering is at the right level
				},
				student: reg.student
			}))
		}

		// Debug: Log course categories before filtering
		const categoryCounts: Record<string, number> = {}
		studentsData.forEach((student) => {
			const courseCategory = student.exam_registration?.course_offering?.course?.course_category
			const category = courseCategory || 'null/undefined'
			categoryCounts[category] = (categoryCounts[category] || 0) + 1
		})
		console.log('📊 Course category distribution:', categoryCounts)

		// Apply filters if provided
		if (board_code) {
			studentsData = studentsData.filter((student) =>
				student.exam_registration?.course_offering?.course?.board?.board_code === board_code
			)
			console.log(`📋 Filtered by board_code: ${studentsData.length} students remaining`)
		}

		if (course_code) {
			studentsData = studentsData.filter((student) =>
				student.exam_registration?.course_offering?.course?.course_code === course_code
			)
			console.log(`📋 Filtered by course_code: ${studentsData.length} students remaining`)
		}

		if (program_code) {
			studentsData = studentsData.filter((student) =>
				student.exam_registration?.course_offering?.program?.program_code === program_code
			)
			console.log(`📋 Filtered by program_code: ${studentsData.length} students remaining`)
		}

		if (studentsData.length === 0) {
			return NextResponse.json({
				error: `No students found matching the criteria in the selected ${source_mode === 'attendance' ? 'attendance records' : 'registrations'}`
			}, { status: 400 })
		}

		console.log(`📋 Final filtered count: ${studentsData.length} students`)

		// Step 2: Fetch course_mapping to get course_order for each course
		// Database Relationship: course_mapping.id = course_offerings.id (shared primary key)
		// This extends course_offerings with program/batch-specific data like course_order
		// SQL Equivalent: LEFT JOIN course_mapping cm ON co.id = cm.id
		const uniqueCourseOfferingIds = [...new Set(studentsData.map(s =>
			s.exam_registration?.course_offering?.id
		).filter(Boolean))]

		const courseMappingMap = new Map<string, number>()

		if (uniqueCourseOfferingIds.length > 0) {
			console.log(`📊 Fetching course_order for ${uniqueCourseOfferingIds.length} unique course offerings...`)

			const { data: courseMappings, error: cmError } = await supabase
				.from('course_mapping')
				.select('id, course_id, course_order')
				.in('id', uniqueCourseOfferingIds)

			if (!cmError && courseMappings) {
				courseMappings.forEach((cm: any) => {
					courseMappingMap.set(cm.id, cm.course_order || 999)
				})
				console.log(`✅ Loaded course_order for ${courseMappings.length} course mappings`)
			} else if (cmError) {
				console.warn('⚠️ Could not fetch course_mapping data:', cmError)
			}
		}


		// Step 3: Sort students by board_order -> course_order -> program_order -> is_regular -> stu_register_no
		// SQL Equivalent:
		// ORDER BY
		//   COALESCE(b.board_order, 999) ASC,
		//   COALESCE(cm.course_order, 999) ASC,
		//   COALESCE(p.program_order, 999) ASC,
		//   er.is_regular DESC,
		//   er.stu_register_no ASC
		const sortedStudents = studentsData.sort((a, b) => {
			// 1. Board order (from exam_registration -> course_offering -> course -> board)
			const aBoardOrder = a.exam_registration?.course_offering?.course?.board?.board_order || 999
			const bBoardOrder = b.exam_registration?.course_offering?.course?.board?.board_order || 999
			if (aBoardOrder !== bBoardOrder) return aBoardOrder - bBoardOrder

			// 2. Course order (from course_mapping)
			const aCourseOfferingId = a.exam_registration?.course_offering?.id
			const bCourseOfferingId = b.exam_registration?.course_offering?.id
			const aCourseOrder = aCourseOfferingId ? (courseMappingMap.get(aCourseOfferingId) || 999) : 999
			const bCourseOrder = bCourseOfferingId ? (courseMappingMap.get(bCourseOfferingId) || 999) : 999
			if (aCourseOrder !== bCourseOrder) return aCourseOrder - bCourseOrder

			// 3. Program order
			const aProgramOrder = a.exam_registration?.course_offering?.program?.program_order || 999
			const bProgramOrder = b.exam_registration?.course_offering?.program?.program_order || 999
			if (aProgramOrder !== bProgramOrder) return aProgramOrder - bProgramOrder

			// 4. Regular students first (DESC: Regular=true comes before Arrear=false)
			const aRegular = a.exam_registration?.is_regular ?? false
			const bRegular = b.exam_registration?.is_regular ?? false
			if (aRegular !== bRegular) return bRegular ? 1 : -1

			// 5. Student register number (ASC)
			const aRegNo = a.exam_registration?.stu_register_no || ''
			const bRegNo = b.exam_registration?.stu_register_no || ''
			return aRegNo.localeCompare(bRegNo)
		})

		console.log('✅ Sorted students by board_order -> course_order -> program_order -> is_regular DESC -> stu_register_no ASC')

		// Step 3: Apply shuffle if needed
		const finalStudents = generation_mode === 'shuffle' ? shuffleArray(sortedStudents) : sortedStudents

		console.log(`🎲 Generation mode: ${generation_mode}`)

		// Step 4: Generate dummy numbers
		const dummyNumberRecords = finalStudents.map((student, index) => {
			const dummyNumber = generateDummyNumber(dummy_number_format, index, startNumber)

			const record: any = {
				institutions_id,
				examination_session_id,
				exam_registration_id: student.exam_registration_id,
				exam_timetable_id: student.exam_timetable_id,
				dummy_number: dummyNumber,
				actual_register_number: student.exam_registration?.stu_register_no || student.student?.roll_number || 'N/A',
				roll_number_for_evaluation: index + 1,
				generated_at: new Date().toISOString(),
				is_active: true
			}

			// Only include generated_by if it's provided
			if (generated_by) {
				record.generated_by = generated_by
			}

			return record
		})

		console.log(`📝 Generated ${dummyNumberRecords.length} dummy number records`)

		// Step 5: Check if any dummy numbers already exist for this institution and session
		// We'll let the database unique constraint handle individual duplicates
		const { data: existingDummy, error: checkError } = await supabase
			.from('student_dummy_numbers')
			.select('id', { count: 'exact', head: true })
			.eq('institutions_id', institutions_id)
			.eq('examination_session_id', examination_session_id)
			.limit(1)

		if (checkError) {
			console.error('Error checking existing dummy numbers:', checkError)
			return NextResponse.json({ error: 'Failed to check existing dummy numbers' }, { status: 500 })
		}

		if (existingDummy && existingDummy.length > 0) {
			return NextResponse.json({
				error: 'Dummy numbers already exist for this institution and session. Please delete them first if you want to regenerate.'
			}, { status: 400 })
		}

		// Step 6: Insert dummy numbers into database in batches (max 1000 per batch)
		const batchSize = 1000
		const totalRecords = dummyNumberRecords.length
		let insertedCount = 0
		const allInsertedData: any[] = []

		console.log(`📤 Inserting ${totalRecords} dummy numbers in batches of ${batchSize}...`)

		for (let i = 0; i < totalRecords; i += batchSize) {
			const batch = dummyNumberRecords.slice(i, i + batchSize)
			const batchNumber = Math.floor(i / batchSize) + 1
			const totalBatches = Math.ceil(totalRecords / batchSize)

			console.log(`📤 Inserting batch ${batchNumber}/${totalBatches} (${batch.length} records)...`)

			const { data: insertedData, error: insertError } = await supabase
				.from('student_dummy_numbers')
				.insert(batch)
				.select()

			if (insertError) {
				console.error(`Error inserting batch ${batchNumber}:`, insertError)

				if (insertError.code === '23505') {
					return NextResponse.json({
						error: `Duplicate dummy numbers detected in batch ${batchNumber}. Please try a different format or starting number.`
					}, { status: 400 })
				}

				if (insertError.code === '23503') {
					// Foreign key constraint violation
					if (insertError.message?.includes('generated_by')) {
						return NextResponse.json({
							error: 'Invalid user reference. The user who is generating dummy numbers does not exist in the system.'
						}, { status: 400 })
					}
					return NextResponse.json({
						error: `Invalid reference in batch ${batchNumber}. Please ensure all referenced records (institution, session, registration) exist.`
					}, { status: 400 })
				}

				if (insertError.code === '23502') {
					// NOT NULL constraint violation
					return NextResponse.json({
						error: `Required field missing in batch ${batchNumber}: ${insertError.message || 'Unknown field'}`
					}, { status: 400 })
				}

				return NextResponse.json({
					error: `Failed to insert batch ${batchNumber} of dummy numbers. ${insertedCount} records inserted before error.`
				}, { status: 500 })
			}

			if (insertedData) {
				allInsertedData.push(...insertedData)
				insertedCount += insertedData.length
				console.log(`✅ Batch ${batchNumber}/${totalBatches} inserted successfully (${insertedData.length} records)`)
			}
		}

		console.log(`✅ Successfully inserted all ${insertedCount} dummy number records`)

		return NextResponse.json({
			success: true,
			message: `Successfully generated ${insertedCount} dummy numbers`,
			count: insertedCount,
			data: allInsertedData
		}, { status: 201 })

	} catch (error) {
		console.error('Dummy number generation error:', error)
		return NextResponse.json({
			error: error instanceof Error ? error.message : 'Internal server error'
		}, { status: 500 })
	}
}
