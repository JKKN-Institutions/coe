import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
	const supabase = getSupabaseServer()
	const { searchParams } = new URL(request.url)
	const action = searchParams.get('action')

	try {
		// Get institutions for dropdown
		if (action === 'institutions') {
			const { data, error } = await supabase
				.from('institutions')
				.select('id, name, institution_code')
				.eq('is_active', true)
				.order('name')

			if (error) throw error
			return NextResponse.json(data)
		}

		// Get sessions for selected institution
		if (action === 'sessions') {
			const institutionId = searchParams.get('institutionId')
			if (!institutionId) {
				return NextResponse.json({ error: 'Institution ID required' }, { status: 400 })
			}

			const { data, error } = await supabase
				.from('examination_sessions')
				.select('id, session_name, session_code')
				.eq('institutions_id', institutionId)
				.order('session_name', { ascending: false })

			if (error) throw error
			return NextResponse.json(data)
		}

		// Get courses for selected session (only courses with marks entries)
		if (action === 'courses') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')

			if (!institutionId || !sessionId) {
				return NextResponse.json({ error: 'Institution and Session IDs required' }, { status: 400 })
			}

			// Get courses that have marks entry
			const { data, error } = await supabase
				.from('marks_entry')
				.select(`
					course_id,
					courses:course_id (
						id,
						course_code,
						course_name
					)
				`)
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)

			if (error) throw error

			// Get unique courses
			const uniqueCourses = new Map()
			data?.forEach((item: any) => {
				if (item.courses && !uniqueCourses.has(item.course_id)) {
					uniqueCourses.set(item.course_id, item.courses)
				}
			})

			return NextResponse.json(Array.from(uniqueCourses.values()))
		}

		// Get packets that have marks entries (for correction)
		if (action === 'packets') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')
			const courseId = searchParams.get('courseId')

			if (!institutionId || !sessionId || !courseId) {
				return NextResponse.json({ error: 'Institution, Session, and Course IDs required' }, { status: 400 })
			}

			// Get all packets for this course
			const { data: allPackets, error: packetError } = await supabase
				.from('answer_sheet_packets')
				.select('id, packet_no, total_sheets, institutions_id, examination_session_id, course_id')
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('course_id', courseId)
				.order('packet_no')

			if (packetError) {
				console.error('Error fetching packets:', packetError)
				throw packetError
			}

			if (!allPackets || allPackets.length === 0) {
				return NextResponse.json([])
			}

			// Get marks entries for this course to find which packets have marks
			const { data: marksData, error: marksError } = await supabase
				.from('marks_entry')
				.select(`
					student_dummy_number_id,
					student_dummy_numbers:student_dummy_number_id (
						packet_id
					)
				`)
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('course_id', courseId)

			if (marksError) {
				console.error('Error checking marks:', marksError)
				return NextResponse.json([])
			}

			// Extract packet IDs that have marks
			const packetIds = allPackets.map(p => p.id)
			const packetsWithMarks = new Set(
				marksData?.map((mark: any) => mark.student_dummy_numbers?.packet_id)
					.filter((id: string) => id && packetIds.includes(id)) || []
			)

			// Filter to only packets that HAVE marks (opposite of mark entry)
			const availablePackets = allPackets.filter(packet => packetsWithMarks.has(packet.id))

			return NextResponse.json(availablePackets)
		}

		// Get students with marks for a packet
		if (action === 'students') {
			const packetId = searchParams.get('packetId')

			if (!packetId) {
				return NextResponse.json({ error: 'Packet ID required' }, { status: 400 })
			}

			// Get packet details
			const { data: packetData, error: packetError } = await supabase
				.from('answer_sheet_packets')
				.select(`
					id,
					packet_no,
					total_sheets,
					institutions_id,
					examination_session_id,
					course_id,
					courses:course_id (
						course_code,
						course_name,
						external_max_mark,
						external_pass_mark
					)
				`)
				.eq('id', packetId)
				.single()

			if (packetError || !packetData) {
				return NextResponse.json({ error: 'Packet not found' }, { status: 404 })
			}

			// Get dummy numbers for this packet with exam_registration -> course_offering to get program_id
			const { data: dummyNumbers, error: dummyError } = await supabase
				.from('student_dummy_numbers')
				.select(`
					id,
					dummy_number,
					exam_registration_id,
					exam_registrations:exam_registration_id (
						course_offering_id,
						course_offerings:course_offering_id (
							program_id
						)
					)
				`)
				.eq('packet_id', packetId)
				.order('dummy_number')

			if (dummyError) {
				console.error('Error fetching dummy numbers:', dummyError)
				throw dummyError
			}

			// Get marks entries for these dummy numbers
			const dummyIds = dummyNumbers?.map(d => d.id) || []
			const { data: marksEntries, error: marksError } = await supabase
				.from('marks_entry')
				.select('id, student_dummy_number_id, total_marks_obtained, total_marks_in_words, evaluator_remarks')
				.in('student_dummy_number_id', dummyIds)
				.eq('course_id', packetData.course_id)

			if (marksError) {
				console.error('Error fetching marks:', marksError)
				throw marksError
			}

			// Create marks map
			const marksMap = new Map(
				marksEntries?.map(m => [m.student_dummy_number_id, m]) || []
			)

			// Build students array with marks
			const students = dummyNumbers?.map(dn => {
				const marks = marksMap.get(dn.id)
				const examReg = dn.exam_registrations as any
				const courseOffering = examReg?.course_offerings as any
				return {
					student_dummy_id: dn.id,
					dummy_number: dn.dummy_number,
					exam_registration_id: dn.exam_registration_id,
					program_id: courseOffering?.program_id || null,
					marks_entry_id: marks?.id || null,
					total_marks_obtained: marks?.total_marks_obtained ?? null,
					total_marks_in_words: marks?.total_marks_in_words || '',
					remarks: marks?.evaluator_remarks || ''
				}
			}) || []

			const courseData = packetData.courses as any

			return NextResponse.json({
				students,
				course_details: {
					subject_code: courseData?.course_code || '',
					subject_name: courseData?.course_name || '',
					maximum_marks: courseData?.external_max_mark || 100,
					minimum_pass_marks: courseData?.external_pass_mark || 40,
					packet_no: packetData.packet_no,
					total_sheets: packetData.total_sheets
				}
			})
		}

		// Search marks entries for correction
		if (action === 'search') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')
			const courseId = searchParams.get('courseId')
			const dummyNumber = searchParams.get('dummyNumber')

			if (!institutionId || !sessionId) {
				return NextResponse.json({ error: 'Institution and Session IDs required' }, { status: 400 })
			}

			let query = supabase
				.from('marks_entry')
				.select(`
					id,
					dummy_number,
					total_marks_obtained,
					total_marks_in_words,
					marks_out_of,
					evaluation_date,
					evaluator_remarks,
					entry_status,
					course_id,
					examination_session_id,
					institutions_id,
					exam_registration_id,
					student_dummy_number_id,
					program_id,
					courses:course_id (
						course_code,
						course_name,
						external_max_mark,
						external_pass_mark
					)
				`)
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('is_active', true)
				.order('dummy_number')

			if (courseId) {
				query = query.eq('course_id', courseId)
			}

			if (dummyNumber) {
				query = query.ilike('dummy_number', `%${dummyNumber}%`)
			}

			const { data, error } = await query.limit(100)

			if (error) throw error
			return NextResponse.json(data)
		}

		// Get correction history for a marks entry
		if (action === 'history') {
			const marksEntryId = searchParams.get('marksEntryId')

			if (!marksEntryId) {
				return NextResponse.json({ error: 'Marks entry ID required' }, { status: 400 })
			}

			const { data, error } = await supabase
				.from('marks_correction_log')
				.select(`
					id,
					old_marks,
					new_marks,
					marks_difference,
					correction_reason,
					correction_type,
					corrected_at,
					corrected_by,
					approval_status,
					users:corrected_by (
						full_name,
						email
					)
				`)
				.eq('marks_entry_id', marksEntryId)
				.order('corrected_at', { ascending: false })

			if (error) throw error
			return NextResponse.json(data)
		}

		return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

	} catch (error) {
		console.error('External marks correction GET error:', error)
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to fetch data' },
			{ status: 500 }
		)
	}
}

export async function POST(request: NextRequest) {
	const supabase = getSupabaseServer()

	try {
		const body = await request.json()
		const {
			marks_entry_id,
			new_marks,
			new_marks_in_words,
			correction_reason,
			correction_type,
			reference_number
		} = body

		// Validate required fields
		if (!marks_entry_id || new_marks === undefined || !correction_reason || !correction_type) {
			return NextResponse.json({
				error: 'Missing required fields: marks_entry_id, new_marks, correction_reason, correction_type'
			}, { status: 400 })
		}

		// Get original marks entry
		const { data: originalEntry, error: fetchError } = await supabase
			.from('marks_entry')
			.select('*')
			.eq('id', marks_entry_id)
			.single()

		if (fetchError || !originalEntry) {
			return NextResponse.json({ error: 'Marks entry not found' }, { status: 404 })
		}

		// Check if marks are actually different
		if (originalEntry.total_marks_obtained === new_marks) {
			return NextResponse.json({ error: 'New marks must be different from current marks' }, { status: 400 })
		}

		// Validate new marks against maximum
		if (new_marks > originalEntry.marks_out_of) {
			return NextResponse.json({
				error: `Marks cannot exceed maximum (${originalEntry.marks_out_of})`
			}, { status: 400 })
		}

		if (new_marks < 0) {
			return NextResponse.json({ error: 'Marks cannot be negative' }, { status: 400 })
		}

		// Start transaction - create correction log
		const { data: correctionLog, error: logError } = await supabase
			.from('marks_correction_log')
			.insert({
				marks_entry_id,
				dummy_number: originalEntry.dummy_number,
				course_id: originalEntry.course_id,
				examination_session_id: originalEntry.examination_session_id,
				institutions_id: originalEntry.institutions_id,
				old_marks: originalEntry.total_marks_obtained,
				new_marks,
				old_marks_in_words: originalEntry.total_marks_in_words,
				new_marks_in_words,
				correction_reason,
				correction_type,
				reference_number: reference_number || null,
				approval_status: 'Approved', // Auto-approve for authorized users
				corrected_by: (await supabase.auth.getUser()).data.user?.id
			})
			.select()
			.single()

		if (logError) {
			console.error('Error creating correction log:', logError)
			throw logError
		}

		// Update the marks entry
		const { data: updatedEntry, error: updateError } = await supabase
			.from('marks_entry')
			.update({
				total_marks_obtained: new_marks,
				total_marks_in_words: new_marks_in_words,
				updated_at: new Date().toISOString()
			})
			.eq('id', marks_entry_id)
			.select()
			.single()

		if (updateError) {
			console.error('Error updating marks entry:', updateError)
			throw updateError
		}

		return NextResponse.json({
			success: true,
			message: 'Marks corrected successfully',
			correction_log: correctionLog,
			updated_entry: updatedEntry
		})

	} catch (error) {
		console.error('External marks correction POST error:', error)
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to correct marks' },
			{ status: 500 }
		)
	}
}
