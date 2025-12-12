import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()

		// Try using RPC function first (most efficient - single SQL query with GROUP BY and JOINs)
		const { data: rpcData, error: rpcError } = await supabase.rpc('get_course_mapping_groups')

		if (!rpcError && rpcData) {
			// RPC function succeeded - return data directly (already sorted and enriched)
			const formattedData = rpcData.map((row: any) => ({
				institution_code: row.institution_code,
				program_code: row.program_code,
				regulation_code: row.regulation_code,
				total_courses: Number(row.total_courses),
				created_at: row.latest_created_at,
				institution_name: row.institution_name,
				program_name: row.program_name,
				regulation_name: row.regulation_name
			}))
			return NextResponse.json(formattedData)
		}

		// Fallback: RPC function doesn't exist or failed - use optimized JS approach
		console.log('RPC function not available, using fallback:', rpcError?.message)

		// Optimized fallback: fetch only distinct combinations using a subquery approach
		// We limit to 1000 to prevent excessive data transfer and group in JS
		const { data: mappings, error } = await supabase
			.from('course_mapping')
			.select('institution_code, program_code, regulation_code, created_at')
			.eq('is_active', true)
			.limit(10000) // Safety limit

		if (error) {
			console.error('Error fetching course mappings:', error)
			return NextResponse.json({ error: 'Failed to fetch course mappings' }, { status: 500 })
		}

		if (!mappings || mappings.length === 0) {
			return NextResponse.json([])
		}

		// Group in JavaScript
		const groupsMap = new Map<string, {
			institution_code: string
			program_code: string
			regulation_code: string
			total_courses: number
			created_at: string
		}>()

		for (const mapping of mappings) {
			const key = `${mapping.institution_code}|${mapping.program_code}|${mapping.regulation_code}`
			const existing = groupsMap.get(key)
			if (existing) {
				existing.total_courses += 1
				// Keep the latest created_at
				if (new Date(mapping.created_at) > new Date(existing.created_at)) {
					existing.created_at = mapping.created_at
				}
			} else {
				groupsMap.set(key, {
					institution_code: mapping.institution_code,
					program_code: mapping.program_code,
					regulation_code: mapping.regulation_code,
					total_courses: 1,
					created_at: mapping.created_at
				})
			}
		}

		const groups = Array.from(groupsMap.values())

		if (groups.length === 0) {
			return NextResponse.json([])
		}

		// Batch fetch all related data in parallel (3 queries total instead of N*3)
		const uniqueInstitutionCodes = [...new Set(groups.map(g => g.institution_code).filter(Boolean))]
		const uniqueProgramCodes = [...new Set(groups.map(g => g.program_code).filter(Boolean))]
		const uniqueRegulationCodes = [...new Set(groups.map(g => g.regulation_code).filter(Boolean))]

		const [institutionsResult, programsResult, regulationsResult] = await Promise.all([
			uniqueInstitutionCodes.length > 0
				? supabase.from('institutions').select('institution_code, name').in('institution_code', uniqueInstitutionCodes)
				: Promise.resolve({ data: [], error: null }),
			uniqueProgramCodes.length > 0
				? supabase.from('programs').select('program_code, program_name').in('program_code', uniqueProgramCodes)
				: Promise.resolve({ data: [], error: null }),
			uniqueRegulationCodes.length > 0
				? supabase.from('regulations').select('regulation_code, regulation_name').in('regulation_code', uniqueRegulationCodes)
				: Promise.resolve({ data: [], error: null })
		])

		// Create lookup maps for O(1) access
		const institutionMap = new Map<string, string>()
		institutionsResult.data?.forEach(i => institutionMap.set(i.institution_code, i.name))

		const programMap = new Map<string, string>()
		programsResult.data?.forEach(p => programMap.set(p.program_code, p.program_name))

		const regulationMap = new Map<string, string>()
		regulationsResult.data?.forEach(r => regulationMap.set(r.regulation_code, r.regulation_name))

		// Enrich groups using lookup maps (O(1) per group)
		const enrichedGroups = groups.map(group => ({
			...group,
			institution_name: institutionMap.get(group.institution_code) || null,
			program_name: programMap.get(group.program_code) || null,
			regulation_name: regulationMap.get(group.regulation_code) || null
		}))

		// Sort by created_at descending
		enrichedGroups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

		return NextResponse.json(enrichedGroups)
	} catch (error) {
		console.error('Error in course mapping groups API:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
