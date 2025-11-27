import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { headers } from 'next/headers'

/**
 * Fetch permissions for a user based on their role and user_roles
 */
async function fetchUserPermissions(supabase: any, userId: string | null, roleName: string | null): Promise<string[]> {
	const roleIds: string[] = []

	// Method 1: Get role by name from parent app
	if (roleName) {
		const { data: role } = await supabase
			.from('roles')
			.select('id')
			.eq('name', roleName)
			.eq('is_active', true)
			.single()

		if (role) {
			roleIds.push(role.id)
		}
	}

	// Method 2: Get roles from user_roles table if user exists locally
	if (userId) {
		const { data: userRoles } = await supabase
			.from('user_roles')
			.select('role_id, roles!inner(id, is_active)')
			.eq('user_id', userId)
			.eq('is_active', true)

		if (userRoles) {
			userRoles.forEach((ur: any) => {
				if (ur.roles?.is_active !== false && !roleIds.includes(ur.role_id)) {
					roleIds.push(ur.role_id)
				}
			})
		}
	}

	if (roleIds.length === 0) {
		return []
	}

	// Fetch permissions for all roles
	const { data: rolePerms } = await supabase
		.from('role_permissions')
		.select('permissions!inner(name, is_active)')
		.in('role_id', roleIds)

	if (!rolePerms) {
		return []
	}

	// Extract unique permission names
	const permissions = new Set<string>()
	rolePerms.forEach((rp: any) => {
		if (rp.permissions?.is_active !== false && rp.permissions?.name) {
			permissions.add(rp.permissions.name)
		}
	})

	return Array.from(permissions)
}

/**
 * Sync user session data after parent app OAuth login
 * Updates last_login, syncs user data, fetches permissions, and creates/updates both sessions and user_sessions records
 */
export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { email, user_id, full_name, avatar_url, role, access_token, refresh_token, expires_in } = body

		if (!email) {
			return NextResponse.json({ error: 'Email is required' }, { status: 400 })
		}

		const supabase = getSupabaseServer()

		// Get request headers for session tracking
		const headersList = await headers()
		const userAgent = headersList.get('user-agent') || ''
		const forwardedFor = headersList.get('x-forwarded-for')
		const realIp = headersList.get('x-real-ip')
		const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || null

		// Check if user exists in local database (include avatar_url for response)
		const { data: existingUser, error: fetchError } = await supabase
			.from('users')
			.select('id, email, is_active, avatar_url')
			.eq('email', email)
			.single()

		if (fetchError && fetchError.code !== 'PGRST116') {
			// PGRST116 = not found, other errors are actual errors
			console.error('Error fetching user:', fetchError)
			return NextResponse.json({ error: 'Database error' }, { status: 500 })
		}

		const now = new Date()
		const nowISO = now.toISOString()

		if (existingUser) {
			// User exists - update last_login
			const { error: updateError } = await supabase
				.from('users')
				.update({
					last_login: nowISO,
					updated_at: nowISO,
					// Optionally sync avatar if provided and user doesn't have one
					...(avatar_url && { avatar_url }),
				})
				.eq('id', existingUser.id)

			if (updateError) {
				console.error('Error updating user:', updateError)
			}

			// Calculate expires_at based on actual token expiry (default 1 hour if not provided)
			const expiresAt = new Date(now.getTime() + (expires_in || 3600) * 1000).toISOString()

			// Create/update sessions and user_sessions records if tokens are provided
			if (access_token) {
				// 1. Update sessions table (main session tracking)
				// First, mark existing active sessions as inactive
				await supabase
					.from('sessions')
					.update({ is_active: false, updated_at: nowISO })
					.eq('user_id', existingUser.id)
					.eq('is_active', true)

				// Parse user agent for device info
				const deviceInfo = {
					browser: extractBrowser(userAgent),
					os: extractOS(userAgent),
					device: extractDevice(userAgent),
					raw: userAgent.substring(0, 255) // Truncate to avoid overflow
				}

				// Insert new active session
				const { error: sessionError } = await supabase
					.from('sessions')
					.insert({
						user_id: existingUser.id,
						session_token: access_token,
						refresh_token: refresh_token || null,
						device_info: deviceInfo,
						ip_address: ipAddress,
						user_agent: userAgent.substring(0, 500), // Truncate user agent
						is_active: true,
						expires_at: expiresAt,
						created_at: nowISO,
						updated_at: nowISO,
					})

				if (sessionError) {
					console.error('Error creating session:', sessionError)
					// Non-critical - continue anyway
				}

				// 2. Update user_sessions table (legacy/backup session tracking)
				// Delete existing sessions for this user (keep only current session)
				await supabase
					.from('user_sessions')
					.delete()
					.eq('user_id', existingUser.id)

				// Insert new user_session
				const { error: userSessionError } = await supabase
					.from('user_sessions')
					.insert({
						user_id: existingUser.id,
						access_token: access_token,
						refresh_token: refresh_token || null,
						expires_at: expiresAt,
						created_at: nowISO,
					})

				if (userSessionError) {
					console.error('Error creating user_session:', userSessionError)
					// Non-critical - continue anyway
				}
			}

			// Fetch user permissions from database based on role
			const permissions = await fetchUserPermissions(supabase, existingUser.id, role)

			return NextResponse.json({
				success: true,
				message: 'Session synced',
				user_id: existingUser.id,
				is_new_user: false,
				expires_at: new Date(now.getTime() + (expires_in || 3600) * 1000).toISOString(),
				avatar_url: existingUser.avatar_url || null, // Return local avatar if available
				permissions, // Return permissions from database
				roles: [role].filter(Boolean) // Return roles array
			})
		} else {
			// User doesn't exist in local DB - they need to be added by admin
			// Still try to fetch permissions by role name (in case role exists)
			const permissions = await fetchUserPermissions(supabase, null, role)

			return NextResponse.json({
				success: true,
				message: 'User not in local database - contact admin for provisioning',
				is_new_user: true,
				permissions, // Return any permissions for the role
				roles: [role].filter(Boolean)
			})
		}
	} catch (error) {
		console.error('Sync session error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// Helper functions to extract device info from user agent
function extractBrowser(userAgent: string): string {
	if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome'
	if (userAgent.includes('Firefox')) return 'Firefox'
	if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
	if (userAgent.includes('Edg')) return 'Edge'
	if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera'
	return 'Unknown'
}

function extractOS(userAgent: string): string {
	if (userAgent.includes('Windows')) return 'Windows'
	if (userAgent.includes('Mac OS')) return 'macOS'
	if (userAgent.includes('Linux')) return 'Linux'
	if (userAgent.includes('Android')) return 'Android'
	if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
	return 'Unknown'
}

function extractDevice(userAgent: string): string {
	if (userAgent.includes('Mobile') || userAgent.includes('Android') && !userAgent.includes('Tablet')) return 'Mobile'
	if (userAgent.includes('Tablet') || userAgent.includes('iPad')) return 'Tablet'
	return 'Desktop'
}
