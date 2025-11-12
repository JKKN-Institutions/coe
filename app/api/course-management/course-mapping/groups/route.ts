import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()

		// Query to get grouped course mappings with counts
		const { data: mappings, error } = await supabase
			.from('course_mapping')
			.select(`
				institution_code,
				program_code,
				regulation_code,
				created_at
			`)
			.eq('is_active', true)
			.order('created_at', { ascending: false })

		if (error) {
			console.error('Error fetching course mappings:', error)
			return NextResponse.json({ error: 'Failed to fetch course mappings' }, { status: 500 })
		}

		// Group by institution_code, program_code, regulation_code only (no batch)
		const groupsMap = new Map<string, {
			institution_code: string
			program_code: string
			regulation_code: string
			total_courses: number
			created_at: string
		}>()

		mappings?.forEach((mapping: any) => {
			const key = `${mapping.institution_code}|${mapping.program_code}|${mapping.regulation_code}`

			if (groupsMap.has(key)) {
				const existing = groupsMap.get(key)!
				existing.total_courses += 1
			} else {
				groupsMap.set(key, {
					institution_code: mapping.institution_code,
					program_code: mapping.program_code,
					regulation_code: mapping.regulation_code,
					total_courses: 1,
					created_at: mapping.created_at
				})
			}
		})

		const groups = Array.from(groupsMap.values())

		// Fetch related data for each group
		const enrichedGroups = await Promise.all(
			groups.map(async (group) => {
				// Fetch institution name
				const { data: institution } = await supabase
					.from('institutions')
					.select('name')
					.eq('institution_code', group.institution_code)
					.single()

				// Fetch program name
				const { data: program } = await supabase
					.from('programs')
					.select('program_name')
					.eq('program_code', group.program_code)
					.single()

				// Fetch regulation name
				const { data: regulation } = await supabase
					.from('regulations')
					.select('regulation_name')
					.eq('regulation_code', group.regulation_code)
					.single()

				return {
					...group,
					institution_name: institution?.name,
					program_name: program?.program_name,
					regulation_name: regulation?.regulation_name
				}
			})
		)

		return NextResponse.json(enrichedGroups)
	} catch (error) {
		console.error('Error in course mapping groups API:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
