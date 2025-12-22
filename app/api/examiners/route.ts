import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)

		const status = searchParams.get('status')
		const examiner_type = searchParams.get('examiner_type')
		const board_id = searchParams.get('board_id')
		const search = searchParams.get('search')
		const institution_code = searchParams.get('institution_code')

		let query = supabase
			.from('examiners')
			.select(`
				*,
				examiner_board_associations (
					id,
					board_id,
					board_code,
					willing_for_valuation,
					willing_for_practical,
					willing_for_scrutiny,
					is_active,
					board:board (
						id,
						board_code,
						board_name,
						board_type
					)
				)
			`)
			.order('created_at', { ascending: false })

		if (status && status !== 'all') {
			query = query.eq('status', status)
		}

		if (examiner_type && examiner_type !== 'all') {
			query = query.eq('examiner_type', examiner_type)
		}

		if (institution_code) {
			query = query.eq('institution_code', institution_code)
		}

		if (search) {
			query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,mobile.ilike.%${search}%,department.ilike.%${search}%,institution_name.ilike.%${search}%`)
		}

		const { data, error } = await query

		if (error) {
			console.error('Error fetching examiners:', error)
			return NextResponse.json({ error: 'Failed to fetch examiners' }, { status: 500 })
		}

		// Filter by board if needed
		let filteredData = data || []
		if (board_id) {
			filteredData = filteredData.filter((examiner: any) =>
				examiner.examiner_board_associations?.some((assoc: any) => assoc.board_id === board_id && assoc.is_active)
			)
		}

		return NextResponse.json(filteredData)
	} catch (e) {
		console.error('Examiners API error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const supabase = getSupabaseServer()

		// Validate required fields
		if (!body.full_name?.trim()) {
			return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
		}
		if (!body.email?.trim()) {
			return NextResponse.json({ error: 'Email is required' }, { status: 400 })
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(body.email)) {
			return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
		}

		// Check for duplicate email
		const { data: existingExaminer } = await supabase
			.from('examiners')
			.select('id')
			.eq('email', body.email.toLowerCase().trim())
			.single()

		if (existingExaminer) {
			return NextResponse.json({ error: 'An examiner with this email already exists' }, { status: 400 })
		}

		const insertPayload = {
			full_name: body.full_name.trim(),
			email: body.email.toLowerCase().trim(),
			mobile: body.mobile?.trim() || null,
			designation: body.designation?.trim() || null,
			department: body.department?.trim() || null,
			institution_name: body.institution_name?.trim() || null,
			institution_address: body.institution_address?.trim() || null,
			ug_experience_years: parseInt(body.ug_experience_years) || 0,
			pg_experience_years: parseInt(body.pg_experience_years) || 0,
			examiner_type: body.examiner_type || 'UG',
			is_internal: body.is_internal ?? false,
			address: body.address?.trim() || null,
			city: body.city?.trim() || null,
			state: body.state?.trim() || null,
			pincode: body.pincode?.trim() || null,
			email_verified: body.email_verified ?? false,
			status: body.status || 'PENDING',
			status_remarks: body.status_remarks?.trim() || null,
			institution_code: body.institution_code?.trim() || null,
			notes: body.notes?.trim() || null,
		}

		const { data, error } = await supabase
			.from('examiners')
			.insert([insertPayload])
			.select()
			.single()

		if (error) {
			console.error('Error creating examiner:', error)
			if (error.code === '23505') {
				return NextResponse.json({ error: 'An examiner with this email already exists' }, { status: 400 })
			}
			return NextResponse.json({ error: 'Failed to create examiner' }, { status: 500 })
		}

		// Add board associations if provided
		if (body.board_associations && body.board_associations.length > 0) {
			const boardAssociations = body.board_associations.map((assoc: any) => ({
				examiner_id: data.id,
				board_id: assoc.board_id,
				board_code: assoc.board_code,
				willing_for_valuation: assoc.willing_for_valuation ?? true,
				willing_for_practical: assoc.willing_for_practical ?? false,
				willing_for_scrutiny: assoc.willing_for_scrutiny ?? false,
				is_active: true,
			}))

			await supabase.from('examiner_board_associations').insert(boardAssociations)
		}

		// Fetch the complete examiner with associations
		const { data: completeExaminer } = await supabase
			.from('examiners')
			.select(`
				*,
				examiner_board_associations (
					id,
					board_id,
					board_code,
					willing_for_valuation,
					willing_for_practical,
					willing_for_scrutiny,
					is_active,
					board:board (
						id,
						board_code,
						board_name,
						board_type
					)
				)
			`)
			.eq('id', data.id)
			.single()

		return NextResponse.json(completeExaminer, { status: 201 })
	} catch (e) {
		console.error('Examiner creation error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export async function PUT(request: Request) {
	try {
		const body = await request.json()
		const supabase = getSupabaseServer()

		if (!body.id) {
			return NextResponse.json({ error: 'Examiner ID is required' }, { status: 400 })
		}

		// Validate email format if provided
		if (body.email) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			if (!emailRegex.test(body.email)) {
				return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
			}

			// Check for duplicate email (excluding current examiner)
			const { data: existingExaminer } = await supabase
				.from('examiners')
				.select('id')
				.eq('email', body.email.toLowerCase().trim())
				.neq('id', body.id)
				.single()

			if (existingExaminer) {
				return NextResponse.json({ error: 'An examiner with this email already exists' }, { status: 400 })
			}
		}

		const updatePayload: any = {
			updated_at: new Date().toISOString(),
		}

		// Only include fields that are provided
		if (body.full_name !== undefined) updatePayload.full_name = body.full_name.trim()
		if (body.email !== undefined) updatePayload.email = body.email.toLowerCase().trim()
		if (body.mobile !== undefined) updatePayload.mobile = body.mobile?.trim() || null
		if (body.designation !== undefined) updatePayload.designation = body.designation?.trim() || null
		if (body.department !== undefined) updatePayload.department = body.department?.trim() || null
		if (body.institution_name !== undefined) updatePayload.institution_name = body.institution_name?.trim() || null
		if (body.institution_address !== undefined) updatePayload.institution_address = body.institution_address?.trim() || null
		if (body.ug_experience_years !== undefined) updatePayload.ug_experience_years = parseInt(body.ug_experience_years) || 0
		if (body.pg_experience_years !== undefined) updatePayload.pg_experience_years = parseInt(body.pg_experience_years) || 0
		if (body.examiner_type !== undefined) updatePayload.examiner_type = body.examiner_type
		if (body.is_internal !== undefined) updatePayload.is_internal = body.is_internal
		if (body.address !== undefined) updatePayload.address = body.address?.trim() || null
		if (body.city !== undefined) updatePayload.city = body.city?.trim() || null
		if (body.state !== undefined) updatePayload.state = body.state?.trim() || null
		if (body.pincode !== undefined) updatePayload.pincode = body.pincode?.trim() || null
		if (body.email_verified !== undefined) updatePayload.email_verified = body.email_verified
		if (body.status !== undefined) updatePayload.status = body.status
		if (body.status_remarks !== undefined) updatePayload.status_remarks = body.status_remarks?.trim() || null
		if (body.institution_code !== undefined) updatePayload.institution_code = body.institution_code?.trim() || null
		if (body.notes !== undefined) updatePayload.notes = body.notes?.trim() || null

		const { data, error } = await supabase
			.from('examiners')
			.update(updatePayload)
			.eq('id', body.id)
			.select()
			.single()

		if (error) {
			console.error('Error updating examiner:', error)
			if (error.code === '23505') {
				return NextResponse.json({ error: 'An examiner with this email already exists' }, { status: 400 })
			}
			return NextResponse.json({ error: 'Failed to update examiner' }, { status: 500 })
		}

		// Update board associations if provided
		if (body.board_associations !== undefined) {
			// Remove existing associations
			await supabase
				.from('examiner_board_associations')
				.delete()
				.eq('examiner_id', body.id)

			// Add new associations
			if (body.board_associations.length > 0) {
				const boardAssociations = body.board_associations.map((assoc: any) => ({
					examiner_id: body.id,
					board_id: assoc.board_id,
					board_code: assoc.board_code,
					willing_for_valuation: assoc.willing_for_valuation ?? true,
					willing_for_practical: assoc.willing_for_practical ?? false,
					willing_for_scrutiny: assoc.willing_for_scrutiny ?? false,
					is_active: true,
				}))

				await supabase.from('examiner_board_associations').insert(boardAssociations)
			}
		}

		// Fetch the complete examiner with associations
		const { data: completeExaminer } = await supabase
			.from('examiners')
			.select(`
				*,
				examiner_board_associations (
					id,
					board_id,
					board_code,
					willing_for_valuation,
					willing_for_practical,
					willing_for_scrutiny,
					is_active,
					board:board (
						id,
						board_code,
						board_name,
						board_type
					)
				)
			`)
			.eq('id', body.id)
			.single()

		return NextResponse.json(completeExaminer)
	} catch (e) {
		console.error('Examiner update error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export async function DELETE(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json({ error: 'Examiner ID is required' }, { status: 400 })
		}

		const supabase = getSupabaseServer()

		const { error } = await supabase
			.from('examiners')
			.delete()
			.eq('id', id)

		if (error) {
			console.error('Error deleting examiner:', error)
			return NextResponse.json({ error: 'Failed to delete examiner' }, { status: 500 })
		}

		return NextResponse.json({ success: true })
	} catch (e) {
		console.error('Examiner deletion error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
