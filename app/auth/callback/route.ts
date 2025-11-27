import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url)
	const code = requestUrl.searchParams.get('code')
	const state = requestUrl.searchParams.get('state')
	const error = requestUrl.searchParams.get('error')
	const errorDescription = requestUrl.searchParams.get('error_description')

	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

	console.log('OAuth Callback:', {
		code: !!code,
		state: !!state,
		error,
		errorDescription,
	})

	// Handle OAuth errors
	if (error) {
		console.error('OAuth error:', error, errorDescription)

		if (error === 'invalid_request' && errorDescription?.includes('bad_oauth_state')) {
			const loginUrl = new URL('/login', siteUrl)
			loginUrl.searchParams.set('error', 'oauth_state_invalid')
			loginUrl.searchParams.set('error_description', 'Authentication session expired. Please try logging in again.')
			return NextResponse.redirect(loginUrl)
		}

		const loginUrl = new URL('/login', siteUrl)
		loginUrl.searchParams.set('error', error)
		if (errorDescription) {
			loginUrl.searchParams.set('error_description', errorDescription)
		}
		return NextResponse.redirect(loginUrl)
	}

	// Validate required params
	if (!code) {
		console.log('No code found, redirecting to login')
		const loginUrl = new URL('/login', siteUrl)
		loginUrl.searchParams.set('error', 'missing_code')
		loginUrl.searchParams.set('error_description', 'Authorization code not received')
		return NextResponse.redirect(loginUrl)
	}

	try {
		// Exchange code for tokens via internal API
		const tokenResponse = await fetch(`${siteUrl}/api/auth/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code, state }),
		})

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json()
			console.error('Token exchange failed:', errorData)
			const loginUrl = new URL('/login', siteUrl)
			loginUrl.searchParams.set('error', errorData.error || 'token_exchange_failed')
			loginUrl.searchParams.set('error_description', errorData.error_description || 'Failed to exchange code for tokens')
			return NextResponse.redirect(loginUrl)
		}

		const { access_token, refresh_token, user } = await tokenResponse.json()

		console.log('Token exchange successful:', {
			hasAccessToken: !!access_token,
			hasRefreshToken: !!refresh_token,
			hasUser: !!user,
		})

		// Redirect to dashboard with tokens in URL params
		// (AuthProvider will handle storing them and cleaning the URL)
		const dashboardUrl = new URL('/dashboard', siteUrl)
		dashboardUrl.searchParams.set('token', access_token)
		if (refresh_token) {
			dashboardUrl.searchParams.set('refresh_token', refresh_token)
		}
		if (user) {
			dashboardUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(user)))
		}

		return NextResponse.redirect(dashboardUrl)
	} catch (err) {
		console.error('Callback error:', err)
		const loginUrl = new URL('/login', siteUrl)
		loginUrl.searchParams.set('error', 'server_error')
		loginUrl.searchParams.set('error_description', 'An unexpected error occurred')
		return NextResponse.redirect(loginUrl)
	}
}
