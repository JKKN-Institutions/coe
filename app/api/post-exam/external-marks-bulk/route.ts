import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createHash } from 'crypto'

// Helper function to convert number to words
function numberToWords(num: number): string {
	if (num === 0) return 'Zero'

	const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
		'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
	const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

	const intPart = Math.floor(num)
	const decimalPart = Math.round((num - intPart) * 100)

	let words = ''

	if (intPart >= 100) {
		words += ones[Math.floor(intPart / 100)] + ' Hundred '
		const remainder = intPart % 100
		if (remainder >= 20) {
			words += tens[Math.floor(remainder / 10)] + ' ' + ones[remainder % 10]
		} else if (remainder > 0) {
			words += ones[remainder]
		}
	} else if (intPart >= 20) {
		words += tens[Math.floor(intPart / 10)] + ' ' + ones[intPart % 10]
	} else if (intPart > 0) {
		words += ones[intPart]
	}

	if (decimalPart > 0) {
		words = words.trim() + ' Point '
		if (decimalPart >= 20) {
			words += tens[Math.floor(decimalPart / 10)] + ' ' + ones[decimalPart % 10]
		} else {
			words += ones[decimalPart]
		}
	}

	return words.trim() || 'Zero'
}

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
					.select('id, course_code, course_name, external_max_mark')
					.eq('institutions_id', institutionId)
					.order('course_code')

				if (error) {
					console.error('Error fetching courses:', error)
					return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 400 })
				}

				return NextResponse.json(data)
			}

			case 'marks': {
				const institutionId = searchParams.get('institutionId')
				const sessionId = searchParams.get('sessionId')
				const programId = searchParams.get('programId')
				const courseId = searchParams.get('courseId')

				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				let query = supabase
					.from('marks_entry')
					.select(`
						id,
						institutions_id,
						examination_session_id,
						exam_registration_id,
						student_dummy_number_id,
						program_id,
						course_id,
						dummy_number,
						total_marks_obtained,
						marks_out_of,
						percentage,
						entry_status,
						evaluator_remarks,
						source,
						created_at,
						student_dummy_numbers:student_dummy_number_id (
							id,
							dummy_number,
							exam_registrations:exam_registration_id (
								id,
								student_name
							)
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
					.order('created_at', { ascending: false })
					.limit(1000000)

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
					console.error('Error fetching external marks:', error)
					return NextResponse.json({ error: 'Failed to fetch external marks' }, { status: 400 })
				}

				// Transform data for display
				const transformedData = data?.map(mark => {
					const dummyNumData = mark.student_dummy_numbers as any
					const examReg = dummyNumData?.exam_registrations as any

					return {
						...mark,
						student_name: examReg?.student_name || 'Unknown',
						dummy_number: dummyNumData?.dummy_number || mark.dummy_number || 'N/A',
						course_code: (mark.courses as any)?.course_code || '',
						course_name: (mark.courses as any)?.course_name || '',
						program_name: (mark.programs as any)?.program_name || '',
						session_name: (mark.examination_sessions as any)?.session_name || '',
						remarks: mark.evaluator_remarks || ''
					}
				})

				return NextResponse.json(transformedData)
			}

			default:
				return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
		}
	} catch (error) {
		console.error('External marks bulk API error:', error)
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
			return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
		}
	} catch (error) {
		console.error('External marks bulk POST error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

async function handleBulkUpload(supabase: any, body: any) {
	const {
		institutions_id,
		examination_session_id,
		program_id,
		course_id,
		marks_data,
		file_name,
		file_size,
		file_type,
		uploaded_by
	} = body

	// Validate required fields
	if (!institutions_id || !marks_data || !Array.isArray(marks_data) || marks_data.length === 0) {
		return NextResponse.json({
			error: 'Missing required fields: institutions_id and marks_data array are required'
		}, { status: 400 })
	}

	// Validate uploaded_by is provided
	if (!uploaded_by) {
		return NextResponse.json({
			error: 'Missing required field: uploaded_by is required'
		}, { status: 400 })
	}

	// Generate file hash
	const fileContent = JSON.stringify(marks_data)
	const file_hash = createHash('sha256').update(fileContent).digest('hex')

	// Create batch record
	let batch: any = null
	let batchCreated = false

	// Find course_offering_id if we have course_id and program_id
	let courseOfferingId: string | null = null
	if (course_id && program_id && examination_session_id) {
		const { data: courseOffering } = await supabase
			.from('course_offerings')
			.select('id')
			.eq('course_id', course_id)
			.eq('program_id', program_id)
			.limit(1)
			.maybeSingle()

		courseOfferingId = courseOffering?.id || null
	}

	// If no course_offering found, try to get first available one for the course
	if (!courseOfferingId && course_id) {
		const { data: anyCourseOffering } = await supabase
			.from('course_offerings')
			.select('id')
			.eq('course_id', course_id)
			.limit(1)
			.maybeSingle()

		courseOfferingId = anyCourseOffering?.id || null
	}

	if (examination_session_id && course_id && courseOfferingId) {
		const { data: batchData, error: batchError } = await supabase
			.from('marks_upload_batches')
			.insert({
				institutions_id,
				examination_session_id,
				course_offering_id: courseOfferingId,
				program_id: program_id || null,
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
				uploaded_at: new Date().toISOString(),
				upload_metadata: {
					source: 'bulk_external_marks_upload',
					mark_type: 'external'
				},
				is_active: true
			})
			.select()
			.single()

		if (batchError) {
			console.error('Error creating batch:', batchError)
			if (batchError.code === '23505') {
				return NextResponse.json({ error: 'This file has already been uploaded for this session' }, { status: 400 })
			}
		} else {
			batch = batchData
			batchCreated = true

			// Update to Processing status (triggers processing_started_at)
			await supabase
				.from('marks_upload_batches')
				.update({ upload_status: 'Processing' })
				.eq('id', batch.id)
		}
	}

	// Process marks
	const results = {
		successful: 0,
		failed: 0,
		skipped: 0,
		errors: [] as any[],
		validation_errors: [] as any[]
	}

	// Fetch all student dummy numbers with exam registrations
	// Note: Supabase default limit is 1000 rows per request, so we paginate
	let dummyNumbers: any[] = []
	const pageSize = 1000
	let page = 0
	let hasMore = true

	while (hasMore) {
		const { data, error } = await supabase
			.from('student_dummy_numbers')
			.select(`
				id,
				dummy_number,
				exam_registration_id,
				exam_registrations!inner (
					id,
					student_id,
					student_name,
					institutions_id,
					examination_session_id,
					course_offering_id,
					course_offerings!inner (
						id,
						course_id,
						program_id,
						courses!inner (
							id,
							course_code,
							external_max_mark
						)
					)
				)
			`)
			.eq('exam_registrations.institutions_id', institutions_id)
			.range(page * pageSize, (page + 1) * pageSize - 1)

		if (error) {
			console.error('Error fetching dummy numbers page:', page, error)
			break
		}

		if (data && data.length > 0) {
			// Data is already filtered by institutions_id at database level
			dummyNumbers = dummyNumbers.concat(data)
			page++
			hasMore = data.length === pageSize
		} else {
			hasMore = false
		}
	}

	// Fetch exam attendance data for the institution with pagination
	// Note: exam_attendance has unique constraint on (institutions_id, exam_registration_id)
	// So we lookup by exam_registration_id only
	let allAttendanceData: any[] = []
	let attPage = 0
	let attHasMore = true
	const attPageSize = 1000

	while (attHasMore) {
		const { data: attendanceData, error: attendanceError } = await supabase
			.from('exam_attendance')
			.select('exam_registration_id, attendance_status')
			.eq('institutions_id', institutions_id)
			.range(attPage * attPageSize, (attPage + 1) * attPageSize - 1)

		if (attendanceError) {
			console.error('Error fetching attendance data page:', attPage, attendanceError)
			break
		}

		if (attendanceData && attendanceData.length > 0) {
			allAttendanceData = allAttendanceData.concat(attendanceData)
			attPage++
			attHasMore = attendanceData.length === attPageSize
		} else {
			attHasMore = false
		}
	}

	// Build attendance map: exam_registration_id -> attendance_status ('Present' or 'Absent')
	const attendanceMap = new Map<string, { is_absent: boolean; attendance_status: string }>()
	allAttendanceData.forEach((att: any) => {
		attendanceMap.set(att.exam_registration_id, {
			is_absent: att.attendance_status === 'Absent',
			attendance_status: att.attendance_status || 'Present'
		})
	})

	console.log('=== DEBUG: Attendance Data ===')
	console.log('Total attendance records fetched:', allAttendanceData.length)

	console.log('=== DEBUG: Student Dummy Numbers ===')
	console.log('Total dummy numbers fetched:', dummyNumbers?.length || 0)

	// Get courses for validation
	const { data: courses } = await supabase
		.from('courses')
		.select('id, course_code, external_max_mark')
		.eq('institutions_id', institutions_id)

	// Build maps for fast lookup
	// Map: dummy_number + course_code -> student info
	const dummyMap = new Map<string, {
		student_dummy_id: string
		dummy_number: string
		exam_registration_id: string
		student_id: string
		student_name: string
		course_id: string
		course_code: string
		course_offering_id: string
		program_id: string
		examination_session_id: string
		external_max_mark: number
		is_absent: boolean
		attendance_status: string
	}>()

	dummyNumbers?.forEach((dn: any) => {
		const dummyNo = dn.dummy_number?.toLowerCase()?.trim()
		const courseCode = dn.exam_registrations?.course_offerings?.courses?.course_code?.toLowerCase()?.trim()
		const courseId = dn.exam_registrations?.course_offerings?.courses?.id
		const examRegId = dn.exam_registrations?.id
		if (dummyNo && courseCode && courseId && examRegId) {
			const key = `${dummyNo}|${courseCode}`
			// Look up attendance from exam_attendance table (unique constraint: institutions_id, exam_registration_id)
			const attendance = attendanceMap.get(examRegId)
			dummyMap.set(key, {
				student_dummy_id: dn.id,
				dummy_number: dn.dummy_number,
				exam_registration_id: examRegId,
				student_id: dn.exam_registrations.student_id,
				student_name: dn.exam_registrations.student_name,
				course_id: courseId,
				course_code: dn.exam_registrations.course_offerings.courses.course_code,
				course_offering_id: dn.exam_registrations.course_offerings.id,
				program_id: dn.exam_registrations.course_offerings.program_id,
				examination_session_id: dn.exam_registrations.examination_session_id,
				external_max_mark: dn.exam_registrations.course_offerings.courses.external_max_mark || 100,
				is_absent: attendance?.is_absent || false,
				attendance_status: attendance?.attendance_status || 'Present'
			})
		}
	})

	const courseMap = new Map<string, { id: string; course_code: string; external_max_mark: number }>(
		courses?.map((c: any) => [c.course_code?.toLowerCase(), c]) || []
	)

	const validDummyNumbers = new Set<string>(
		dummyNumbers?.map((dn: any) => dn.dummy_number?.toLowerCase()?.trim()).filter(Boolean) || []
	)

	console.log('=== DEBUG: Lookup Maps ===')
	console.log('dummyMap keys (first 10):', Array.from(dummyMap.keys()).slice(0, 10))
	console.log('validDummyNumbers (first 10):', Array.from(validDummyNumbers).slice(0, 10))
	console.log('courseMap keys:', Array.from(courseMap.keys()))

	// Process each row
	for (let i = 0; i < marks_data.length; i++) {
		const row = marks_data[i]
		const rowNumber = i + 2 // +2 for Excel header row
		const rowErrors: string[] = []

		// Look up student by dummy_number + course_code
		const dummyNo = String(row.dummy_number || '').toLowerCase().trim()
		const courseCode = String(row.course_code || '').toLowerCase().trim()
		const lookupKey = `${dummyNo}|${courseCode}`
		const studentInfo = dummyMap.get(lookupKey)

		if (i < 3) {
			console.log(`=== DEBUG: Row ${i + 1} Lookup ===`)
			console.log('Looking for:', { dummyNo, courseCode, lookupKey })
			console.log('Found:', studentInfo ? 'YES' : 'NO')
			if (studentInfo) {
				console.log('Attendance:', {
					is_absent: studentInfo.is_absent,
					attendance_status: studentInfo.attendance_status
				})
			}
		}

		// Provide specific error messages if not found
		if (!studentInfo) {
			if (!validDummyNumbers.has(dummyNo)) {
				rowErrors.push(`Student with dummy number "${row.dummy_number}" not found`)
			} else if (!courseMap.has(courseCode)) {
				rowErrors.push(`Course with code "${row.course_code}" not found`)
			} else {
				rowErrors.push(`No exam registration found for dummy number "${row.dummy_number}" in course "${row.course_code}"`)
			}
			results.failed++
			results.validation_errors.push({
				row: rowNumber,
				dummy_number: row.dummy_number || 'N/A',
				course_code: row.course_code || 'N/A',
				errors: rowErrors
			})
			continue
		}

		// ATTENDANCE VALIDATION - Critical requirement
		if (studentInfo.is_absent === true) {
			rowErrors.push('Student is marked as absent. Marks cannot be entered for absent students.')
			results.failed++
			results.validation_errors.push({
				row: rowNumber,
				dummy_number: row.dummy_number || 'N/A',
				course_code: row.course_code || 'N/A',
				errors: rowErrors
			})
			continue
		}

		// Parse marks
		const totalMarks = parseFloat(String(row.total_marks_obtained || 0))
		const marksOutOf = parseFloat(String(row.marks_out_of || studentInfo.external_max_mark || 100))
		const remarks = String(row.remarks || '').trim()

		// Validate marks - strict validation
		if (isNaN(totalMarks)) {
			rowErrors.push('Total marks obtained must be a valid number')
		} else if (totalMarks < 0) {
			rowErrors.push('Total marks obtained cannot be negative')
		} else if (totalMarks === 0) {
			rowErrors.push('Total marks obtained cannot be 0 (zero marks not accepted)')
		}
		if (isNaN(marksOutOf) || marksOutOf <= 0) {
			rowErrors.push('Marks out of must be a positive number greater than 0')
		}
		if (!isNaN(totalMarks) && !isNaN(marksOutOf) && totalMarks > marksOutOf) {
			rowErrors.push(`Total marks (${totalMarks}) cannot exceed marks out of (${marksOutOf})`)
		}

		if (rowErrors.length > 0) {
			results.failed++
			results.validation_errors.push({
				row: rowNumber,
				dummy_number: row.dummy_number || 'N/A',
				course_code: row.course_code || 'N/A',
				errors: rowErrors
			})
			continue
		}

		try {
			// Check if record already exists - if so, skip (don't update)
			const { data: existing } = await supabase
				.from('marks_entry')
				.select('id, dummy_number, total_marks_obtained')
				.eq('institutions_id', institutions_id)
				.eq('student_dummy_number_id', studentInfo.student_dummy_id)
				.eq('course_id', studentInfo.course_id)
				.maybeSingle()

			if (existing) {
				// Skip - marks already exist for this student/course
				results.skipped++
				results.validation_errors.push({
					row: rowNumber,
					dummy_number: row.dummy_number || 'N/A',
					course_code: row.course_code || 'N/A',
					errors: [`Marks already exist for this student (${existing.total_marks_obtained} marks). Skipped to prevent overwrite.`]
				})
				continue
			}

			const marksDataObj: any = {
				total_marks_obtained: totalMarks,
				marks_out_of: marksOutOf,
				total_marks_in_words: numberToWords(totalMarks),
				evaluator_remarks: remarks || null,
				evaluation_date: new Date().toISOString().split('T')[0],
				entry_status: 'Draft'
			}

			// Insert new record only
			const insertData: any = {
				institutions_id,
				examination_session_id: studentInfo.examination_session_id,
				exam_registration_id: studentInfo.exam_registration_id,
				student_dummy_number_id: studentInfo.student_dummy_id,
				program_id: studentInfo.program_id,
				course_id: studentInfo.course_id,
				dummy_number: studentInfo.dummy_number,
				source: 'Bulk Upload',
				...marksDataObj
			}

			const { error: insertError } = await supabase
				.from('marks_entry')
				.insert(insertData)

			if (insertError) {
				throw insertError
			}
			results.successful++
		} catch (error: any) {
			results.failed++
			let errorMessage = error.message || 'Database error'
			if (error.code === '23505') {
				errorMessage = 'Duplicate entry for this student and course'
			} else if (error.code === '23503') {
				if (error.message?.includes('student_dummy_number_id')) {
					errorMessage = 'Student dummy number not found in system'
				} else if (error.message?.includes('course_id')) {
					errorMessage = 'Course not found in system'
				} else {
					errorMessage = `Foreign key constraint violation: ${error.detail || error.message}`
				}
			}
			results.errors.push({
				row: rowNumber,
				dummy_number: row.dummy_number,
				course_code: row.course_code,
				error: errorMessage
			})
		}
	}

	// Determine final status
	let finalStatus = 'Completed'
	if (results.failed === marks_data.length && results.successful === 0) {
		finalStatus = 'Failed'
	} else if (results.failed > 0 || results.skipped > 0) {
		finalStatus = 'Partial'
	}

	// Build error summary
	let errorSummary = null
	if (results.errors.length > 0 || results.validation_errors.length > 0) {
		const errorTypes = new Map<string, number>()
		results.errors.forEach((e: any) => {
			const type = e.error || 'Unknown error'
			errorTypes.set(type, (errorTypes.get(type) || 0) + 1)
		})
		results.validation_errors.forEach((e: any) => {
			e.errors?.forEach((err: string) => {
				errorTypes.set(err, (errorTypes.get(err) || 0) + 1)
			})
		})
		errorSummary = Array.from(errorTypes.entries())
			.map(([type, count]) => `${type}: ${count}`)
			.join('; ')
	}

	// Update batch record with results
	if (batchCreated && batch) {
		const { error: updateBatchError } = await supabase
			.from('marks_upload_batches')
			.update({
				successful_records: results.successful,
				failed_records: results.failed,
				skipped_records: results.skipped,
				upload_status: finalStatus,
				processed_at: new Date().toISOString(),
				processed_by: uploaded_by,
				error_details: results.errors.length > 0 ? results.errors : null,
				error_summary: errorSummary,
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
	try {
		const { ids } = body

		console.log('=== DEBUG: Bulk Delete ===')
		console.log('IDs to delete:', ids)

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return NextResponse.json({ error: 'No IDs provided for deletion' }, { status: 400 })
		}

		// First, fetch the marks entries to check their source and entry_status
		const { data: entriesToCheck, error: fetchError } = await supabase
			.from('marks_entry')
			.select('id, source, entry_status, dummy_number')
			.in('id', ids)

		if (fetchError) {
			console.error('Error fetching entries to check:', fetchError)
			return NextResponse.json({
				error: 'Failed to verify records for deletion',
				details: fetchError
			}, { status: 500 })
		}

		// Filter entries that can be deleted:
		// - Must be from 'Bulk Upload' source (NOT 'Manual Entry')
		// - Must have entry_status = 'Draft'
		const deletableIds: string[] = []
		const nonDeletableEntries: { id: string; dummy_number: string; reason: string }[] = []

		entriesToCheck?.forEach((entry: any) => {
			if (entry.source === 'Manual Entry') {
				nonDeletableEntries.push({
					id: entry.id,
					dummy_number: entry.dummy_number,
					reason: 'Cannot delete Manual Entry records from this page'
				})
			} else if (entry.entry_status !== 'Draft') {
				nonDeletableEntries.push({
					id: entry.id,
					dummy_number: entry.dummy_number,
					reason: `Cannot delete records with status "${entry.entry_status}" (only Draft allowed)`
				})
			} else {
				deletableIds.push(entry.id)
			}
		})

		console.log('Deletable IDs:', deletableIds.length)
		console.log('Non-deletable entries:', nonDeletableEntries.length)

		// If no entries can be deleted, return error
		if (deletableIds.length === 0) {
			return NextResponse.json({
				error: 'None of the selected records can be deleted',
				non_deletable: nonDeletableEntries,
				message: 'Only Bulk Upload records with Draft status can be deleted from this page'
			}, { status: 400 })
		}

		// Delete only the deletable entries
		const { data, error } = await supabase
			.from('marks_entry')
			.delete()
			.in('id', deletableIds)
			.select()

		console.log('Delete result - data:', data, 'error:', error)

		if (error) {
			console.error('Error deleting external marks:', error)
			return NextResponse.json({
				error: `Failed to delete records: ${error.message || error.code || 'Unknown error'}`,
				details: error
			}, { status: 500 })
		}

		// Return result with info about non-deletable entries
		const response: any = {
			success: true,
			deleted: data?.length || 0,
			message: `Successfully deleted ${data?.length || 0} record(s)`
		}

		if (nonDeletableEntries.length > 0) {
			response.skipped = nonDeletableEntries.length
			response.non_deletable = nonDeletableEntries
			response.message = `Deleted ${data?.length || 0} record(s). ${nonDeletableEntries.length} record(s) could not be deleted.`
		}

		return NextResponse.json(response, { status: 200 })
	} catch (err: any) {
		console.error('Unexpected error in handleBulkDelete:', err)
		return NextResponse.json({
			error: `Unexpected error: ${err.message || 'Unknown error'}`
		}, { status: 500 })
	}
}

export async function DELETE(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json({ error: 'ID is required' }, { status: 400 })
		}

		// Hard delete
		const { error } = await supabase
			.from('marks_entry')
			.delete()
			.eq('id', id)

		if (error) {
			console.error('Error deleting external mark:', error)
			return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
		}

		return NextResponse.json({ message: 'Record deleted successfully' })
	} catch (error) {
		console.error('External marks bulk DELETE error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
