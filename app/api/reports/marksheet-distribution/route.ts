import { NextRequest, NextResponse } from 'next/server'
import { fetchMyJKKNLearnerProfiles, fetchMyJKKNPrograms } from '@/lib/myjkkn-api'

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const institutionId = searchParams.get('institution_id')
		const programCode = searchParams.get('program_code')
		const semesterCode = searchParams.get('semester_code')
		const myjkknInstitutionIdsParam = searchParams.get('myjkkn_institution_ids')

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

		// Parse myjkkn_institution_ids
		const myjkknInstitutionIds = myjkknInstitutionIdsParam
			? myjkknInstitutionIdsParam.split(',').filter(Boolean)
			: []

		// Extract semester number from semester_code for filtering
		// Semester code format might be like "UEN-1", "BCA-2", etc.
		let targetSemesterNumber: number | null = null
		const semCodeMatch = semesterCode.match(/-(\d+)$/)
		if (semCodeMatch) {
			targetSemesterNumber = parseInt(semCodeMatch[1], 10)
		}

		console.log('[Marksheet Distribution API] Fetching learners:', {
			institutionId,
			programCode,
			semesterCode,
			targetSemesterNumber,
			myjkknInstitutionIds
		})

		// First, lookup the program IDs for this program_code from MyJKKN
		// MyJKKN learners have program_id (UUID) not program_code
		const programIds: string[] = []
		for (const myjkknInstId of myjkknInstitutionIds) {
			try {
				const programsResponse = await fetchMyJKKNPrograms({
					institution_id: myjkknInstId,
					program_code: programCode,
					limit: 100,
				})
				const programs = programsResponse.data || []
				for (const prog of programs) {
					if (prog.id && !programIds.includes(prog.id)) {
						programIds.push(prog.id)
					}
				}
			} catch (error) {
				console.error(`[Marksheet Distribution API] Error fetching programs for inst ${myjkknInstId}:`, error)
			}
		}

		console.log(`[Marksheet Distribution API] Found program IDs for ${programCode}:`, programIds)

		// Fetch learners from MyJKKN API filtered by institution and program
		let allLearners: any[] = []

		if (myjkknInstitutionIds.length > 0) {
			// Fetch for each myjkkn_institution_id
			for (const myjkknInstId of myjkknInstitutionIds) {
				try {
					// Try fetching with program_code first
					const response = await fetchMyJKKNLearnerProfiles({
						institution_id: myjkknInstId,
						program_code: programCode,
						current_semester: targetSemesterNumber || undefined,
						limit: 1000,
					})

					const learners = response.data || []
					allLearners = allLearners.concat(learners)

					console.log(`[Marksheet Distribution API] Fetched ${learners.length} learners for myjkkn_inst_id: ${myjkknInstId}`)
				} catch (error) {
					console.error(`[Marksheet Distribution API] Error fetching for myjkkn_inst_id ${myjkknInstId}:`, error)
				}
			}
		} else {
			// Fallback: fetch by program_code only
			const response = await fetchMyJKKNLearnerProfiles({
				program_code: programCode,
				current_semester: targetSemesterNumber || undefined,
				limit: 1000,
			})
			allLearners = response.data || []
		}

		console.log(`[Marksheet Distribution API] Total learners fetched: ${allLearners.length}`)

		// Log sample learner to debug field names
		if (allLearners.length > 0) {
			console.log(`[Marksheet Distribution API] Sample learner fields:`, Object.keys(allLearners[0]))
			console.log(`[Marksheet Distribution API] Sample learner:`, {
				institution_id: allLearners[0].institution_id,
				program_code: allLearners[0].program_code,
				program_id: allLearners[0].program_id,
				current_semester: allLearners[0].current_semester,
				semester_code: allLearners[0].semester_code
			})
		}

		// Client-side filtering by institution_id, program_id, and semester
		// MyJKKN API may not filter properly, so we filter client-side
		const filteredLearners = allLearners.filter((learner: any) => {
			// Filter by institution_id
			if (myjkknInstitutionIds.length > 0) {
				const learnerInstId = learner.institution_id
				if (learnerInstId && !myjkknInstitutionIds.includes(learnerInstId)) {
					return false
				}
			}

			// Filter by program_id if we have the lookup
			if (programIds.length > 0 && learner.program_id) {
				if (!programIds.includes(learner.program_id)) {
					return false
				}
			}

			// Filter by semester number
			if (targetSemesterNumber !== null) {
				const learnerSemester = learner.current_semester || learner.semester_number || learner.semester
				if (learnerSemester !== undefined && learnerSemester !== null) {
					// Convert to number for comparison
					const learnerSemNum = typeof learnerSemester === 'string'
						? parseInt(learnerSemester, 10)
						: learnerSemester
					if (learnerSemNum !== targetSemesterNumber) {
						return false
					}
				}
			}

			return true
		})

		console.log(`[Marksheet Distribution API] Filtered learners: ${filteredLearners.length} (by institution: ${myjkknInstitutionIds.length > 0}, by program: ${programIds.length > 0}, by semester: ${targetSemesterNumber})`)

		// Deduplicate by registration number or roll number
		const uniqueLearners = new Map<string, any>()
		for (const learner of filteredLearners) {
			const key = learner.register_number || learner.roll_number || learner.id
			if (key && !uniqueLearners.has(key)) {
				uniqueLearners.set(key, learner)
			}
		}

		// Convert to array and sort by register_number/roll_number
		const learnerList = Array.from(uniqueLearners.values()).sort((a, b) => {
			const regA = a.register_number || a.roll_number || ''
			const regB = b.register_number || b.roll_number || ''
			return regA.localeCompare(regB)
		})

		// Format learner data for the PDF
		const formattedLearners = learnerList.map((learner: any) => ({
			register_number: learner.register_number || learner.roll_number || '-',
			learner_name: formatLearnerName(learner),
			dob: formatDOB(learner.dob || learner.date_of_birth),
			email: learner.college_email || learner.student_email || learner.email || '-',
			phone: learner.student_mobile || learner.phone || '-',
		}))

		console.log(`[Marksheet Distribution API] Returning ${formattedLearners.length} learners`)

		return NextResponse.json({
			learners: formattedLearners,
			metadata: {
				total: formattedLearners.length,
				institution_id: institutionId,
				program_code: programCode,
				semester_code: semesterCode,
				semester_number: targetSemesterNumber
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
	if (learner.middle_name) parts.push(learner.middle_name)
	if (learner.last_name) parts.push(learner.last_name)

	if (parts.length > 0) {
		return parts.join(' ').toUpperCase()
	}

	// Fallback to full name field
	if (learner.full_name) return learner.full_name.toUpperCase()
	if (learner.name) return learner.name.toUpperCase()

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
