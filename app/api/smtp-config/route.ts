import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/smtp-config
 * List all SMTP configurations
 */
export async function GET(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const institutionCode = searchParams.get('institution_code')

		let query = supabase
			.from('smtp_configuration')
			.select('*')
			.order('created_at', { ascending: false })

		if (institutionCode) {
			query = query.eq('institution_code', institutionCode)
		}

		const { data, error } = await query

		if (error) throw error

		// Don't expose encrypted passwords in response
		const sanitizedData = data?.map(config => ({
			...config,
			smtp_password_encrypted: config.smtp_password_encrypted ? '********' : null
		}))

		return NextResponse.json(sanitizedData || [])
	} catch (error) {
		console.error('Error fetching SMTP configs:', error)
		return NextResponse.json({ error: 'Failed to fetch SMTP configurations' }, { status: 500 })
	}
}

/**
 * POST /api/smtp-config
 * Create new SMTP configuration
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const body = await request.json()

		const {
			institution_code,
			smtp_host,
			smtp_port = 587,
			smtp_secure = true,
			smtp_user,
			smtp_password,
			sender_email,
			sender_name = 'Controller of Examinations',
			default_cc_emails = [],
			is_active = true
		} = body

		// Validate required fields
		if (!institution_code || !smtp_host || !smtp_user || !smtp_password || !sender_email) {
			return NextResponse.json({
				error: 'Missing required fields: institution_code, smtp_host, smtp_user, smtp_password, sender_email'
			}, { status: 400 })
		}

		// In production, encrypt the password before storing
		// For now, storing as-is (should use encryption in production)
		const smtp_password_encrypted = smtp_password // TODO: Encrypt this

		const { data, error } = await supabase
			.from('smtp_configuration')
			.insert({
				institution_code,
				smtp_host,
				smtp_port,
				smtp_secure,
				smtp_user,
				smtp_password_encrypted,
				sender_email,
				sender_name,
				default_cc_emails,
				is_active
			})
			.select()
			.single()

		if (error) {
			if (error.code === '23505') {
				return NextResponse.json({
					error: 'SMTP configuration for this institution already exists'
				}, { status: 400 })
			}
			throw error
		}

		// Return without password
		return NextResponse.json({
			...data,
			smtp_password_encrypted: '********'
		}, { status: 201 })
	} catch (error) {
		console.error('Error creating SMTP config:', error)
		return NextResponse.json({ error: 'Failed to create SMTP configuration' }, { status: 500 })
	}
}

/**
 * PUT /api/smtp-config
 * Update existing SMTP configuration
 */
export async function PUT(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const body = await request.json()

		const { id, smtp_password, ...updateData } = body

		if (!id) {
			return NextResponse.json({ error: 'Missing configuration ID' }, { status: 400 })
		}

		// Only update password if provided
		if (smtp_password) {
			// TODO: Encrypt password in production
			updateData.smtp_password_encrypted = smtp_password
		}

		updateData.updated_at = new Date().toISOString()

		const { data, error } = await supabase
			.from('smtp_configuration')
			.update(updateData)
			.eq('id', id)
			.select()
			.single()

		if (error) throw error

		return NextResponse.json({
			...data,
			smtp_password_encrypted: '********'
		})
	} catch (error) {
		console.error('Error updating SMTP config:', error)
		return NextResponse.json({ error: 'Failed to update SMTP configuration' }, { status: 500 })
	}
}

/**
 * DELETE /api/smtp-config
 * Delete SMTP configuration
 */
export async function DELETE(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json({ error: 'Missing configuration ID' }, { status: 400 })
		}

		const { error } = await supabase
			.from('smtp_configuration')
			.delete()
			.eq('id', id)

		if (error) throw error

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Error deleting SMTP config:', error)
		return NextResponse.json({ error: 'Failed to delete SMTP configuration' }, { status: 500 })
	}
}
