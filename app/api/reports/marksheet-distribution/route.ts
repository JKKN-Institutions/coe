import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const institutionId = searchParams.get('institution_id')
		const programCode = searchParams.get('program_code')
		const semesterCode = searchParams.get('semester_code')

		// Validate required parameters
		if (!institutionId) {
			return NextResponse.json({ error: 'institution_id is required' }, { status: 400 })
		}
		if (!programCode) {
			return NextResponse.json({ error: 'program_code is required' }, { status: 400 })
		}
		if (!semesterCode) {
			return NextResponse.json({ error: 'semester_code is required' }, { status: 400 })
		}

		const supabase = getSupabaseServer()

		console.log('[Marksheet Distribution API] Fetching learners:', {
			institutionId,
			programCode,
			semesterCode
		})

		// Get the selected institution details
		const { data: institution, error: instError } = await supabase
			.from('institutions')
			.select('id, institution_code, myjkkn_institution_ids')
			.eq('id', institutionId)
			.single()

		if (instError || !institution) {
			console.error('[Marksheet Distribution API] Institution not found:', instError)
			return NextResponse.json({ error: 'Institution not found' }, { status: 404 })
		}

		console.log('[Marksheet Distribution API] Institution:', institution)

		// Get myjkkn_institution_ids - for CAS this includes both Aided and Self
		const myjkknInstitutionIds: string[] = institution.myjkkn_institution_ids || []

		if (myjkknInstitutionIds.length === 0) {
			console.log('[Marksheet Distribution API] No myjkkn_institution_ids found')
			return NextResponse.json({
				learners: [],
				metadata: { total: 0, institution_id: institutionId, program_code: programCode, semester_code: semesterCode }
			})
		}

		console.log('[Marksheet Distribution API] Using MyJKKN institution IDs:', myjkknInstitutionIds)

		// Get program UUIDs from MyJKKN API for the given program_code
		// learners_profiles.program_id stores MyJKKN program UUIDs
		const programIds: string[] = []

		for (const myjkknInstId of myjkknInstitutionIds) {
			try {
				// Use the internal proxy endpoint
				const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
				const params = new URLSearchParams({
					limit: '100',
					is_active: 'true',
					institution_id: myjkknInstId
				})

				const res = await fetch(`${baseUrl}/api/myjkkn/programs?${params.toString()}`)

				if (!res.ok) {
					console.error(`[Marksheet Distribution API] HTTP error ${res.status} for inst ${myjkknInstId}`)
					continue
				}

				const response = await res.json()
				const programs = response.data || response || []
				// Filter by program_code client-side
				// MyJKKN returns program_id as the CODE (e.g., "UEN"), not as a UUID
				for (const prog of programs) {
					const code = prog.program_id || prog.program_code
					if (code === programCode && prog.id && !programIds.includes(prog.id)) {
						programIds.push(prog.id)
						console.log(`[Marksheet Distribution API] Found program ${code} with ID ${prog.id}`)
					}
				}
			} catch (error) {
				console.error(`[Marksheet Distribution API] Error fetching programs for inst ${myjkknInstId}:`, error)
			}
		}

		console.log('[Marksheet Distribution API] Program IDs found:', programIds)

		if (programIds.length === 0) {
			console.log('[Marksheet Distribution API] No programs found for code:', programCode)
			return NextResponse.json({
				learners: [],
				metadata: { total: 0, institution_id: institutionId, program_code: programCode, semester_code: semesterCode }
			})
		}

		// Extract semester number from semester_code (e.g., "UEN-1" -> 1)
		let targetSemesterNumber: number | null = null
		const semCodeMatch = semesterCode.match(/-(\d+)$/)
		if (semCodeMatch) {
			targetSemesterNumber = parseInt(semCodeMatch[1], 10)
		}

		console.log('[Marksheet Distribution API] Target semester number:', targetSemesterNumber)

		// Get semester UUIDs from MyJKKN API
		// We need to find semesters that match the semester_code or semester_number
		const semesterIds: string[] = []

		for (const myjkknInstId of myjkknInstitutionIds) {
			try {
				// Use the internal proxy endpoint
				const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
				const params = new URLSearchParams({
					limit: '100',
					is_active: 'true',
					institution_id: myjkknInstId,
					program_code: programCode
				})

				const res = await fetch(`${baseUrl}/api/myjkkn/semesters?${params.toString()}`)

				if (!res.ok) {
					console.error(`[Marksheet Distribution API] HTTP error ${res.status} for semesters for inst ${myjkknInstId}`)
					continue
				}

				const response = await res.json()
				const semesters = response.data || response || []
				for (const sem of semesters) {
					// Match by semester_code or semester_number
					const semesterMatches =
						sem.semester_code === semesterCode ||
						(targetSemesterNumber !== null && sem.semester_number === targetSemesterNumber)

					if (semesterMatches && sem.id && !semesterIds.includes(sem.id)) {
						semesterIds.push(sem.id)
						console.log(`[Marksheet Distribution API] Found semester ${sem.semester_code} with ID ${sem.id}`)
					}
				}
			} catch (error) {
				console.error(`[Marksheet Distribution API] Error fetching semesters for inst ${myjkknInstId}:`, error)
			}
		}

		console.log('[Marksheet Distribution API] Semester IDs found:', semesterIds)

		// Fetch learners from local learners_profiles table
		// Filter by institution_id (MyJKKN IDs), program_id, and semester_id
		let query = supabase
			.from('learners_profiles')
			.select(`
				id,
				register_number,
				roll_number,
				first_name,
				last_name,
				date_of_birth,
				college_email,
				student_email,
				student_mobile,
				institution_id,
				program_id,
				semester_id
			`)
			.in('institution_id', myjkknInstitutionIds)
			.in('program_id', programIds)
			.eq('lifecycle_status', 'active')
			.order('register_number', { ascending: true })

		// Only filter by semester_id if we found matching semesters
		if (semesterIds.length > 0) {
			query = query.in('semester_id', semesterIds)
		}

		const { data: learners, error: learnersError } = await query

		if (learnersError) {
			console.error('[Marksheet Distribution API] Error fetching learners:', learnersError)
			return NextResponse.json({ error: 'Failed to fetch learners' }, { status: 500 })
		}

		console.log('[Marksheet Distribution API] Learners fetched:', learners?.length || 0)

		// Debug: Log first few learners to verify program/semester IDs
		if (learners && learners.length > 0) {
			console.log('[Marksheet Distribution API] Sample learners:', learners.slice(0, 3).map(l => ({
				register_number: l.register_number,
				institution_id: l.institution_id,
				program_id: l.program_id,
				semester_id: l.semester_id
			})))
		}

		// Format learner data for the PDF
		const formattedLearners = (learners || []).map((learner: any) => ({
			register_number: learner.register_number || learner.roll_number || '-',
			learner_name: formatLearnerName(learner),
			dob: formatDOB(learner.date_of_birth),
			email: learner.college_email || learner.student_email || '-',
			phone: learner.student_mobile || '-',
		}))

		console.log('[Marksheet Distribution API] Returning', formattedLearners.length, 'learners')

		return NextResponse.json({
			learners: formattedLearners,
			metadata: {
				total: formattedLearners.length,
				institution_id: institutionId,
				program_code: programCode,
				semester_code: semesterCode
			}
		})

	} catch (error) {
		console.error('[Marksheet Distribution API] Error:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch learner data' },
			{ status: 500 }
		)
	}
}

// Helper function to format learner name
function formatLearnerName(learner: any): string {
	const parts: string[] = []

	if (learner.first_name) parts.push(learner.first_name)
	if (learner.last_name) parts.push(learner.last_name)

	if (parts.length > 0) {
		return parts.join(' ').toUpperCase()
	}

	return '-'
}

// Helper function to format DOB as DD-MM-YYYY
function formatDOB(dob: string | null | undefined): string {
	if (!dob) return '-'

	try {
		// Try parsing as ISO date
		const date = new Date(dob)
		if (isNaN(date.getTime())) return dob

		// Format as DD-MM-YYYY
		const day = date.getDate().toString().padStart(2, '0')
		const month = (date.getMonth() + 1).toString().padStart(2, '0')
		const year = date.getFullYear()

		return `${day}-${month}-${year}`
	} catch {
		return dob
	}
}
