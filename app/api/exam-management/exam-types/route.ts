import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET - Fetch all exam types
export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const institutionId = searchParams.get('institutions_id')

		let query = supabase
			.from('exam_types')
			.select('*')
			.order('created_at', { ascending: false })

		if (institutionId) {
			query = query.eq('institutions_id', institutionId)
		}

		const { data, error } = await query

		if (error) {
			console.error('Exam types table error:', error)
			return NextResponse.json({ error: 'Failed to fetch exam types' }, { status: 500 })
		}

		return NextResponse.json(data || [])
	} catch (e) {
		console.error('Exam types API error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// POST - Create new exam type
export async function POST(request: Request) {
	try {
		const body = await request.json()
		const supabase = getSupabaseServer()

		// Auto-map grade_system_code to grade_system_id
		let gradeSystemCode: string | undefined = body.grade_system_code
		let gradeSystemId: string | undefined = body.grade_system_id

		// If grade_system_code is provided, fetch grade_system_id
		if (gradeSystemCode) {
			const { data: gradeSystemData, error: gradeSystemError } = await supabase
				.from('grade_system')
				.select('id, grade_system_code')
				.eq('grade_system_code', gradeSystemCode)
				.maybeSingle()

			if (gradeSystemError || !gradeSystemData) {
				return NextResponse.json({
					error: `Invalid grade_system_code: ${gradeSystemCode}. Grade system not found.`
				}, { status: 400 })
			}

			// Auto-map the grade_system_id from the fetched grade system
			gradeSystemId = gradeSystemData.id
			console.log(`✅ Auto-mapped grade_system_code "${gradeSystemCode}" to grade_system_id "${gradeSystemId}"`)
		}
		// If grade_system_id is provided but no grade_system_code, fetch the code
		else if (gradeSystemId && !gradeSystemCode) {
			const { data: gradeSystemData } = await supabase
				.from('grade_system')
				.select('grade_system_code')
				.eq('id', gradeSystemId)
				.maybeSingle()
			if (gradeSystemData?.grade_system_code) {
				gradeSystemCode = gradeSystemData.grade_system_code
			}
		}

		// Validate required fields
		if (!gradeSystemCode || !gradeSystemId) {
			return NextResponse.json({
				error: 'grade_system_code is required and must be valid'
			}, { status: 400 })
		}

		if (!body.institutions_id) {
			return NextResponse.json({
				error: 'institutions_id is required'
			}, { status: 400 })
		}

		if (!body.examination_code) {
			return NextResponse.json({
				error: 'examination_code is required'
			}, { status: 400 })
		}

		if (!body.examination_name) {
			return NextResponse.json({
				error: 'examination_name is required'
			}, { status: 400 })
		}

		const insertPayload: any = {
			institutions_id: body.institutions_id,
			examination_code: body.examination_code,
			examination_name: body.examination_name,
			grade_system_id: gradeSystemId,
			grade_system_code: gradeSystemCode,
			description: body.description || null,
			exam_type: body.exam_type || 'offline',
			is_coe: body.is_coe ?? true,
			is_active: body.is_active ?? true,
		}

		const { data, error } = await supabase
			.from('exam_types')
			.insert([insertPayload])
			.select()
			.single()

		if (error) {
			console.error('Error creating exam type:', error)

			// Handle duplicate key constraint violation
			if (error.code === '23505') {
				return NextResponse.json({
					error: 'Exam type already exists. Please use different examination code for this institution.'
				}, { status: 400 })
			}

			// Handle foreign key constraint violation
			if (error.code === '23503') {
				return NextResponse.json({
					error: 'Invalid reference. Please select a valid institution and grade system.'
				}, { status: 400 })
			}

			return NextResponse.json({ error: 'Failed to create exam type' }, { status: 500 })
		}

		return NextResponse.json(data, { status: 201 })
	} catch (e) {
		console.error('Exam type creation error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// PUT - Update exam type
export async function PUT(request: Request) {
	try {
		const body = await request.json()
		const supabase = getSupabaseServer()

		if (!body.id) {
			return NextResponse.json({ error: 'Exam type ID is required' }, { status: 400 })
		}

		// Auto-map grade_system_code to grade_system_id (same logic as POST)
		let gradeSystemCode: string | undefined = body.grade_system_code
		let gradeSystemId: string | undefined = body.grade_system_id

		// If grade_system_code is provided, fetch grade_system_id
		if (gradeSystemCode) {
			const { data: gradeSystemData, error: gradeSystemError } = await supabase
				.from('grade_system')
				.select('id, grade_system_code')
				.eq('grade_system_code', gradeSystemCode)
				.maybeSingle()

			if (gradeSystemError || !gradeSystemData) {
				return NextResponse.json({
					error: `Invalid grade_system_code: ${gradeSystemCode}. Grade system not found.`
				}, { status: 400 })
			}

			// Auto-map the grade_system_id from the fetched grade system
			gradeSystemId = gradeSystemData.id
			console.log(`✅ Auto-mapped grade_system_code "${gradeSystemCode}" to grade_system_id "${gradeSystemId}" (UPDATE)`)
		}
		// If grade_system_id is provided but no grade_system_code, fetch the code
		else if (gradeSystemId && !gradeSystemCode) {
			const { data: gradeSystemData } = await supabase
				.from('grade_system')
				.select('grade_system_code')
				.eq('id', gradeSystemId)
				.maybeSingle()
			if (gradeSystemData?.grade_system_code) {
				gradeSystemCode = gradeSystemData.grade_system_code
			}
		}

		const updatePayload: any = {
			examination_code: body.examination_code,
			examination_name: body.examination_name,
			description: body.description || null,
			exam_type: body.exam_type || 'offline',
			is_coe: body.is_coe,
			is_active: body.is_active,
		}

		if (gradeSystemCode) updatePayload.grade_system_code = gradeSystemCode
		if (gradeSystemId) updatePayload.grade_system_id = gradeSystemId

		const { data, error } = await supabase
			.from('exam_types')
			.update(updatePayload)
			.eq('id', body.id)
			.select()
			.single()

		if (error) {
			console.error('Error updating exam type:', error)

			// Handle duplicate key constraint violation
			if (error.code === '23505') {
				return NextResponse.json({
					error: 'Exam type already exists. Please use different examination code for this institution.'
				}, { status: 400 })
			}

			// Handle foreign key constraint violation
			if (error.code === '23503') {
				return NextResponse.json({
					error: 'Invalid reference. Please select a valid grade system.'
				}, { status: 400 })
			}

			return NextResponse.json({ error: 'Failed to update exam type' }, { status: 500 })
		}

		return NextResponse.json(data)
	} catch (e) {
		console.error('Exam type update error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// DELETE - Delete exam type
export async function DELETE(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json({ error: 'Exam type ID is required' }, { status: 400 })
		}

		const supabase = getSupabaseServer()

		const { error } = await supabase
			.from('exam_types')
			.delete()
			.eq('id', id)

		if (error) {
			console.error('Error deleting exam type:', error)
			return NextResponse.json({ error: 'Failed to delete exam type' }, { status: 500 })
		}

		return NextResponse.json({ success: true })
	} catch (e) {
		console.error('Exam type deletion error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
