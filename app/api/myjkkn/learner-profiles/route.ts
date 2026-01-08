import { NextRequest, NextResponse } from 'next/server'
import {
	fetchMyJKKNLearnerProfiles,
	fetchMyJKKNInstitutions,
	fetchMyJKKNPrograms,
	fetchMyJKKNSemesters,
	fetchMyJKKNDepartments,
	fetchMyJKKNBatches,
	MyJKKNApiError
} from '@/lib/myjkkn-api'
import { getSupabaseServer } from '@/lib/supabase-server'

// MyJKKN API has a server-side max limit per request
const MYJKKN_MAX_PER_PAGE = 200

// Cache for lookup data (refreshed per request)
interface LookupMaps {
	institutions: Map<string, { counselling_code: string; name: string }>
	programs: Map<string, { program_code: string; program_name: string }>
	semesters: Map<string, { semester_code: string; semester_name: string; semester_number: number }>
	departments: Map<string, { department_code: string; department_name: string }>
	batches: Map<string, { batch_code: string; batch_name: string }>
	localInstitutions: Map<string, { institution_name: string; institution_code: string }>
}

// Fetch all lookup data from MyJKKN APIs
async function fetchLookupData(): Promise<LookupMaps> {
	console.log('[Learner Profiles API] Fetching lookup data for enrichment...')

	const [institutionsRes, programsRes, semestersRes, departmentsRes, batchesRes] = await Promise.all([
		fetchMyJKKNInstitutions({ limit: 1000 }).catch(() => ({ data: [] })),
		fetchMyJKKNPrograms({ limit: 1000 }).catch(() => ({ data: [] })),
		fetchMyJKKNSemesters({ limit: 1000 }).catch(() => ({ data: [] })),
		fetchMyJKKNDepartments({ limit: 1000 }).catch(() => ({ data: [] })),
		fetchMyJKKNBatches({ limit: 1000 }).catch(() => ({ data: [] })),
	])

	// Build institution lookup map (id -> { counselling_code, name })
	const institutions = new Map<string, { counselling_code: string; name: string }>()
	for (const inst of institutionsRes.data || []) {
		const instAny = inst as Record<string, unknown>
		institutions.set(
			instAny.id as string,
			{
				counselling_code: (instAny.counselling_code || instAny.institution_code || '') as string,
				name: (instAny.name || instAny.institution_name || '') as string
			}
		)
	}

	// Build program lookup map (id -> { program_code, program_name })
	const programs = new Map<string, { program_code: string; program_name: string }>()
	for (const prog of programsRes.data || []) {
		const progAny = prog as Record<string, unknown>
		programs.set(
			progAny.id as string,
			{
				program_code: (progAny.program_code || progAny.program_id || '') as string,
				program_name: (progAny.program_name || '') as string
			}
		)
	}

	// Build semester lookup map (id -> { semester_code, semester_name, semester_number })
	const semesters = new Map<string, { semester_code: string; semester_name: string; semester_number: number }>()
	for (const sem of semestersRes.data || []) {
		const semAny = sem as Record<string, unknown>
		const semName = (semAny.semester_name || '') as string
		const semCode = (semAny.semester_code || '') as string
		// Extract semester number from name (e.g., "SEMESTER II" -> 2, "SEMESTER IV" -> 4)
		// or from code suffix (e.g., "UEN-2" -> 2)
		let semNumber = (semAny.semester_number || 0) as number
		if (!semNumber) {
			// Try to extract from semester name using Roman numerals
			const romanMatch = semName.match(/(?:SEMESTER|SEM)\s*([IVXLC]+)/i)
			if (romanMatch) {
				const romanToNum: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 }
				semNumber = romanToNum[romanMatch[1].toUpperCase()] || 0
			}
			// Fallback: try to extract from code suffix (e.g., "UEN-2" -> 2)
			if (!semNumber) {
				const codeMatch = semCode.match(/-(\d+)$/)
				if (codeMatch) {
					semNumber = parseInt(codeMatch[1], 10)
				}
			}
		}
		semesters.set(
			semAny.id as string,
			{
				semester_code: semCode,
				semester_name: semName,
				semester_number: semNumber
			}
		)
	}

	// Build department lookup map (id -> { department_code, department_name })
	const departments = new Map<string, { department_code: string; department_name: string }>()
	for (const dept of departmentsRes.data || []) {
		const deptAny = dept as Record<string, unknown>
		departments.set(
			deptAny.id as string,
			{
				department_code: (deptAny.department_code || '') as string,
				department_name: (deptAny.department_name || '') as string
			}
		)
	}

	// Build batch lookup map (id -> { batch_code, batch_name })
	const batches = new Map<string, { batch_code: string; batch_name: string }>()
	for (const batch of batchesRes.data || []) {
		const batchAny = batch as Record<string, unknown>
		batches.set(
			batchAny.id as string,
			{
				batch_code: (batchAny.batch_code || '') as string,
				batch_name: (batchAny.batch_name || '') as string
			}
		)
	}

	// Fetch local COE institutions for name lookup by institution_code
	const localInstitutions = new Map<string, { institution_name: string; institution_code: string }>()
	try {
		const supabase = getSupabaseServer()
		const { data: localInsts } = await supabase
			.from('institutions')
			.select('id, institution_code, institution_name')

		for (const inst of localInsts || []) {
			// Map by institution_code (counselling_code from MyJKKN)
			if (inst.institution_code) {
				localInstitutions.set(inst.institution_code, {
					institution_name: inst.institution_name || '',
					institution_code: inst.institution_code
				})
			}
		}
	} catch (err) {
		console.warn('[Learner Profiles API] Could not fetch local institutions:', err)
	}

	console.log(`[Learner Profiles API] Lookup data loaded: ${institutions.size} institutions, ${programs.size} programs, ${semesters.size} semesters, ${departments.size} departments, ${batches.size} batches, ${localInstitutions.size} local institutions`)

	return { institutions, programs, semesters, departments, batches, localInstitutions }
}

// Enrich learner data with lookup values
function enrichLearnerData(learners: unknown[], lookups: LookupMaps): unknown[] {
	return learners.map((learner) => {
		const l = learner as Record<string, unknown>

		// Get institution info
		const instId = l.institution_id as string
		const instInfo = instId ? lookups.institutions.get(instId) : undefined
		const counsellingCode = instInfo?.counselling_code || ''
		const localInst = counsellingCode ? lookups.localInstitutions.get(counsellingCode) : undefined

		// Get program info
		const progId = l.program_id as string
		const progInfo = progId ? lookups.programs.get(progId) : undefined

		// Get semester info
		const semId = l.semester_id as string
		const semInfo = semId ? lookups.semesters.get(semId) : undefined

		// Get department info
		const deptId = l.department_id as string
		const deptInfo = deptId ? lookups.departments.get(deptId) : undefined

		// Get batch info
		const batchId = l.batch_id as string
		const batchInfo = batchId ? lookups.batches.get(batchId) : undefined

		return {
			...l,
			// Institution fields
			institution_code: counsellingCode,
			institution_name: localInst?.institution_name || instInfo?.name || '',
			// Program fields
			program_code: progInfo?.program_code || '',
			program_name: progInfo?.program_name || '',
			// Semester fields
			semester_code: semInfo?.semester_code || '',
			semester_name: semInfo?.semester_name || '',
			current_semester: semInfo?.semester_number || l.current_semester || null,
			// Department fields
			department_code: deptInfo?.department_code || '',
			department_name: deptInfo?.department_name || '',
			// Batch fields
			batch_code: batchInfo?.batch_code || '',
			batch_name: batchInfo?.batch_name || '',
			// Normalize other fields
			email: l.college_email || l.student_email || l.email || '',
			phone: l.student_mobile || l.phone || '',
			is_active: l.is_active ?? l.is_profile_complete ?? true,
		}
	})
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const page = searchParams.get('page')
	const limit = searchParams.get('limit')
	const search = searchParams.get('search')
	const is_active = searchParams.get('is_active')
	const institution_id = searchParams.get('institution_id')
	const institution_code = searchParams.get('institution_code')
	const program_id = searchParams.get('program_id')
	const program_code = searchParams.get('program_code')
	const department_id = searchParams.get('department_id')
	const department_code = searchParams.get('department_code')
	const batch_id = searchParams.get('batch_id')
	const current_semester = searchParams.get('current_semester')
	const admission_year = searchParams.get('admission_year')
	const fetchAll = searchParams.get('fetchAll') === 'true' || (limit && parseInt(limit, 10) > MYJKKN_MAX_PER_PAGE)

	// Try MyJKKN API first
	try {
		const baseOptions = {
			search: search || undefined,
			is_active: is_active ? is_active === 'true' : undefined,
			institution_id: institution_id || undefined,
			institution_code: institution_code || undefined,
			program_id: program_id || undefined,
			program_code: program_code || undefined,
			department_id: department_id || undefined,
			department_code: department_code || undefined,
			batch_id: batch_id || undefined,
			current_semester: current_semester ? parseInt(current_semester, 10) : undefined,
			admission_year: admission_year ? parseInt(admission_year, 10) : undefined,
		}

		// If fetchAll or large limit requested, paginate through all results
		if (fetchAll) {
			console.log('[Learner Profiles API] Fetching all learners with pagination...')

			// Fetch lookup data first
			const lookups = await fetchLookupData()

			// Fetch first page to get total count
			const firstPageResponse = await fetchMyJKKNLearnerProfiles({
				...baseOptions,
				page: 1,
				limit: MYJKKN_MAX_PER_PAGE,
			})

			const allData: unknown[] = [...(firstPageResponse.data || [])]
			// Handle both 'metadata' and 'pagination' keys (API may use either)
			const paginationInfo = (firstPageResponse as any).metadata || (firstPageResponse as any).pagination || {}
			const totalPages = paginationInfo.totalPages || 1
			const totalCount = paginationInfo.total || (firstPageResponse as any).count || allData.length

			console.log(`[Learner Profiles API] Page 1/${totalPages} - Fetched ${firstPageResponse.data?.length || 0}`)

			// Fetch remaining pages sequentially (to avoid overwhelming the API)
			for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
				try {
					const response = await fetchMyJKKNLearnerProfiles({
						...baseOptions,
						page: currentPage,
						limit: MYJKKN_MAX_PER_PAGE,
					})

					if (response.data && response.data.length > 0) {
						allData.push(...response.data)
					}

					console.log(`[Learner Profiles API] Page ${currentPage}/${totalPages} - Fetched ${response.data?.length || 0}, Total: ${allData.length}`)
				} catch (pageError) {
					console.error(`[Learner Profiles API] Error fetching page ${currentPage}:`, pageError)
					// Continue with what we have so far instead of failing completely
					break
				}
			}

			console.log(`[Learner Profiles API] Complete! Total learners fetched: ${allData.length}`)

			// Enrich data with lookup values
			const enrichedData = enrichLearnerData(allData, lookups)

			return NextResponse.json({
				data: enrichedData,
				metadata: {
					page: 1,
					limit: enrichedData.length,
					total: totalCount,
					totalPages: 1,
				},
			})
		}

		// Single page request - also enrich data
		const [lookups, response] = await Promise.all([
			fetchLookupData(),
			fetchMyJKKNLearnerProfiles({
				...baseOptions,
				page: page ? parseInt(page, 10) : 1,
				limit: limit ? Math.min(parseInt(limit, 10), MYJKKN_MAX_PER_PAGE) : MYJKKN_MAX_PER_PAGE,
			})
		])

		const enrichedData = enrichLearnerData(response.data || [], lookups)

		return NextResponse.json({
			...response,
			data: enrichedData,
		})
	} catch (error) {
		console.error('MyJKKN API failed, falling back to local Supabase:', error)

		// Fallback to local Supabase learners_profiles table
		try {
			const supabase = getSupabaseServer()
			const pageNum = page ? parseInt(page, 10) : 1
			const limitNum = limit ? parseInt(limit, 10) : 100000

			// Helper to build base query with filters
			const buildQuery = () => {
				let q = supabase.from('learners_profiles').select('*', { count: 'exact' })
				if (institution_id) q = q.eq('institution_id', institution_id)
				if (program_id) q = q.eq('program_id', program_id)
				if (department_id) q = q.eq('department_id', department_id)
				if (batch_id) q = q.eq('batch_id', batch_id)
				if (admission_year) q = q.eq('admission_year', parseInt(admission_year, 10))
				if (search) {
					q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,roll_number.ilike.%${search}%,register_number.ilike.%${search}%,college_email.ilike.%${search}%`)
				}
				return q.order('created_at', { ascending: false })
			}

			// Supabase has 1000 row limit per request, fetch in batches for large requests
			const BATCH_SIZE = 1000
			let allData: unknown[] = []
			let total = 0

			if (limitNum > BATCH_SIZE) {
				// Fetch in batches
				const offset = (pageNum - 1) * limitNum
				let fetched = 0
				let batchOffset = offset

				while (fetched < limitNum) {
					const batchLimit = Math.min(BATCH_SIZE, limitNum - fetched)
					const { data: batchData, error: batchError, count: batchCount } = await buildQuery()
						.range(batchOffset, batchOffset + batchLimit - 1)

					if (batchError) {
						console.error('Supabase fallback error:', batchError)
						throw batchError
					}

					if (batchCount !== null && total === 0) {
						total = batchCount
					}

					if (!batchData || batchData.length === 0) break

					allData = allData.concat(batchData)
					fetched += batchData.length
					batchOffset += batchLimit

					// Stop if we got less than requested (no more data)
					if (batchData.length < batchLimit) break
				}
			} else {
				// Single request for small limits
				const offset = (pageNum - 1) * limitNum
				const { data, error: dbError, count } = await buildQuery()
					.range(offset, offset + limitNum - 1)

				if (dbError) {
					console.error('Supabase fallback error:', dbError)
					throw dbError
				}

				allData = data || []
				total = count || 0
			}

			const totalPages = Math.ceil(total / limitNum)

			return NextResponse.json({
				data: allData,
				metadata: {
					page: pageNum,
					limit: limitNum,
					total,
					totalPages,
				},
				source: 'supabase_fallback',
			})
		} catch (fallbackError) {
			console.error('Supabase fallback also failed:', fallbackError)

			if (error instanceof MyJKKNApiError) {
				return NextResponse.json(
					{ error: error.message, status: error.status, details: error.details },
					{ status: error.status }
				)
			}
			return NextResponse.json(
				{ error: 'Failed to fetch learner profiles' },
				{ status: 500 }
			)
		}
	}
}
