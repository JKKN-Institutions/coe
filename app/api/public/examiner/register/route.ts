import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

/**
 * Public Examiner Registration API
 * No authentication required - used for examiner willingness form
 */
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

		// Check for common email typos
		const emailDomain = body.email.split('@')[1]?.toLowerCase()
		const typoPatterns = ['gmial.com', 'gmal.com', 'gamil.com', 'gnail.com', 'yaho.com', 'hotmal.com']
		if (typoPatterns.includes(emailDomain)) {
			return NextResponse.json({
				error: `Possible typo in email domain: ${emailDomain}. Did you mean gmail.com or yahoo.com?`
			}, { status: 400 })
		}

		const email = body.email.toLowerCase().trim()

		// Check if examiner already exists
		const { data: existingExaminer } = await supabase
			.from('examiners')
			.select('id, status')
			.eq('email', email)
			.single()

		if (existingExaminer) {
			if (existingExaminer.status === 'PENDING') {
				return NextResponse.json({
					error: 'Your registration is already pending approval. You will be notified once approved.',
					status: 'PENDING'
				}, { status: 400 })
			}
			if (existingExaminer.status === 'ACTIVE') {
				return NextResponse.json({
					error: 'You are already registered as an examiner.',
					status: 'ACTIVE'
				}, { status: 400 })
			}
			if (existingExaminer.status === 'REJECTED') {
				return NextResponse.json({
					error: 'Your previous registration was rejected. Please contact the examination office.',
					status: 'REJECTED'
				}, { status: 400 })
			}
		}

		// Determine examiner type based on board selections
		let examinerType = 'UG'
		const hasUG = body.ug_board_code && body.ug_board_code !== 'None'
		const hasPG = body.pg_board_code && body.pg_board_code !== 'None'

		if (hasUG && hasPG) {
			examinerType = 'UG_PG'
		} else if (hasPG) {
			examinerType = 'PG'
		} else if (body.willing_for_practical) {
			examinerType = 'PRACTICAL'
		} else if (body.willing_for_scrutiny) {
			examinerType = 'SCRUTINY'
		}

		// Create examiner record
		const insertPayload = {
			full_name: body.full_name.trim(),
			email: email,
			mobile: body.mobile?.trim() || null,
			designation: body.designation?.trim() || null,
			department: body.department?.trim() || null,
			institution_name: body.institution_name?.trim() || null,
			institution_address: body.institution_address?.trim() || null,
			ug_experience_years: parseInt(body.ug_experience_years) || 0,
			pg_experience_years: parseInt(body.pg_experience_years) || 0,
			examiner_type: examinerType,
			is_internal: false,
			email_verified: body.email_verified ?? false,
			status: 'PENDING',
		}

		const { data: examiner, error: insertError } = await supabase
			.from('examiners')
			.insert([insertPayload])
			.select()
			.single()

		if (insertError) {
			console.error('Error creating examiner:', insertError)
			if (insertError.code === '23505') {
				return NextResponse.json({ error: 'An examiner with this email already exists' }, { status: 400 })
			}
			return NextResponse.json({ error: 'Failed to register. Please try again.' }, { status: 500 })
		}

		// Add board associations
		const boardAssociations = []

		// Get UG board if selected
		if (hasUG) {
			const { data: ugBoard } = await supabase
				.from('board')
				.select('id, board_code')
				.eq('board_code', body.ug_board_code)
				.single()

			if (ugBoard) {
				boardAssociations.push({
					examiner_id: examiner.id,
					board_id: ugBoard.id,
					board_code: ugBoard.board_code,
					willing_for_valuation: body.willing_for_valuation ?? true,
					willing_for_practical: body.willing_for_practical ?? false,
					willing_for_scrutiny: body.willing_for_scrutiny ?? false,
					is_active: true,
				})
			}
		}

		// Get PG board if selected
		if (hasPG) {
			const { data: pgBoard } = await supabase
				.from('board')
				.select('id, board_code')
				.eq('board_code', body.pg_board_code)
				.single()

			if (pgBoard) {
				boardAssociations.push({
					examiner_id: examiner.id,
					board_id: pgBoard.id,
					board_code: pgBoard.board_code,
					willing_for_valuation: body.willing_for_valuation ?? true,
					willing_for_practical: body.willing_for_practical ?? false,
					willing_for_scrutiny: body.willing_for_scrutiny ?? false,
					is_active: true,
				})
			}
		}

		if (boardAssociations.length > 0) {
			await supabase.from('examiner_board_associations').insert(boardAssociations)
		}

		return NextResponse.json({
			success: true,
			message: 'Your registration has been submitted successfully. You will be notified once approved.',
			examiner_id: examiner.id,
		}, { status: 201 })
	} catch (e) {
		console.error('Public examiner registration error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
