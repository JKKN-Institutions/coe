import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const institution_code = searchParams.get('institution_code')

		let query = supabase
			.from('academic_years')
			.select('*')
			.order('start_date', { ascending: false })

		if (institution_code) {
			query = query.eq('institution_code', institution_code)
		}

		const { data, error } = await query

		if (error) {
			console.error('Academic years error:', error)
			return NextResponse.json({ error: 'Failed to fetch academic years' }, { status: 500 })
		}

		return NextResponse.json(data || [])
	} catch (e) {
		console.error('API error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const supabase = getSupabaseServer()

		let institution_code: string | undefined = body.institution_code
		let institutions_id: string | undefined = body.institutions_id

		if (institution_code) {
			const { data: inst, error: instError } = await supabase
				.from('institutions')
				.select('id, institution_code')
				.eq('institution_code', institution_code)
				.maybeSingle()

			if (instError || !inst) {
				return NextResponse.json({
					error: `Invalid institution_code: ${institution_code}`
				}, { status: 400 })
			}

			institutions_id = inst.id
			console.log(`✅ Auto-mapped "${institution_code}" to "${institutions_id}"`)
		} else if (institutions_id && !institution_code) {
			const { data: inst } = await supabase
				.from('institutions')
				.select('institution_code')
				.eq('id', institutions_id)
				.maybeSingle()
			if (inst?.institution_code) {
				institution_code = inst.institution_code
			}
		}

		if (!body.academic_year || !body.start_date || !body.end_date || !institution_code || !institutions_id) {
			return NextResponse.json({
				error: 'Academic year, start date, end date, and institution are required'
			}, { status: 400 })
		}

		const startDate = new Date(body.start_date)
		const endDate = new Date(body.end_date)
		if (endDate <= startDate) {
			return NextResponse.json({
				error: 'End date must be after start date'
			}, { status: 400 })
		}

		const insertPayload: any = {
			academic_year: body.academic_year,
			start_date: body.start_date,
			end_date: body.end_date,
			remarks: body.remarks ?? null,
		is_active: body.is_active ?? true,
			institutions_id: institutions_id,
			institution_code: institution_code,
		}

		const { data, error } = await supabase
			.from('academic_years')
			.insert([insertPayload])
			.select()
			.single()

		if (error) {
			console.error('Error creating:', error)
			if (error.code === '23505') {
				return NextResponse.json({ error: 'Academic year already exists' }, { status: 400 })
			}
			if (error.code === '23503') {
				return NextResponse.json({ error: 'Invalid institution reference' }, { status: 400 })
			}
			return NextResponse.json({ error: error.message }, { status: 500 })
		}

		return NextResponse.json(data, { status: 201 })
	} catch (e) {
		console.error('Creation error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export async function PUT(request: Request) {
	try {
		const body = await request.json()
		const supabase = getSupabaseServer()

		let institution_code: string | undefined = body.institution_code
		let institutions_id: string | undefined = body.institutions_id

		if (institution_code) {
			const { data: inst, error: instError } = await supabase
				.from('institutions')
				.select('id, institution_code')
				.eq('institution_code', institution_code)
				.maybeSingle()

			if (instError || !inst) {
				return NextResponse.json({
					error: `Invalid institution_code: ${institution_code}`
				}, { status: 400 })
			}

			institutions_id = inst.id
		} else if (institutions_id && !institution_code) {
			const { data: inst } = await supabase
				.from('institutions')
				.select('institution_code')
				.eq('id', institutions_id)
				.maybeSingle()
			if (inst?.institution_code) {
				institution_code = inst.institution_code
			}
		}

		if (body.start_date && body.end_date) {
			const startDate = new Date(body.start_date)
			const endDate = new Date(body.end_date)
			if (endDate <= startDate) {
				return NextResponse.json({
					error: 'End date must be after start date'
				}, { status: 400 })
			}
		}

		const updatePayload: any = {
			academic_year: body.academic_year,
			start_date: body.start_date,
			end_date: body.end_date,
			remarks: body.remarks ?? null,
		is_active: body.is_active ?? true,
		}

		if (institution_code) updatePayload.institution_code = institution_code
		if (institutions_id) updatePayload.institutions_id = institutions_id

		const { data, error } = await supabase
			.from('academic_years')
			.update(updatePayload)
			.eq('id', body.id)
			.select()
			.single()

		if (error) {
			console.error('Error updating:', error)
			if (error.code === '23505') {
				return NextResponse.json({ error: 'Academic year already exists' }, { status: 400 })
			}
			if (error.code === '23503') {
				return NextResponse.json({ error: 'Invalid institution reference' }, { status: 400 })
			}
			return NextResponse.json({ error: error.message }, { status: 500 })
		}

		return NextResponse.json(data)
	} catch (e) {
		console.error('Update error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export async function DELETE(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json({ error: 'ID is required' }, { status: 400 })
		}

		const supabase = getSupabaseServer()

		const { error } = await supabase
			.from('academic_years')
			.delete()
			.eq('id', id)

		if (error) {
			console.error('Error deleting:', error)
			return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
		}

		return NextResponse.json({ success: true })
	} catch (e) {
		console.error('Deletion error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
