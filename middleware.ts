import { NextRequest, NextResponse } from 'next/server'

// List of public routes that don't require authentication
const publicRoutes = [
	'/login',
	'/auth/callback',
	'/callback',
	'/contact-admin',
	'/verify-email',
	'/',
]

// List of API routes that don't require authentication
const publicApiRoutes = [
	'/api/auth',
	'/api/token',
]

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl
	const res = NextResponse.next()

	// Allow public routes
	if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
		return res
	}

	// Allow public API routes
	if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
		return res
	}

	// Allow static assets and Next.js internals
	if (
		pathname.startsWith('/_next') ||
		pathname.startsWith('/static') ||
		pathname.includes('.') // Files with extensions (images, etc.)
	) {
		return res
	}

	// Check for access_token cookie (parent app OAuth)
	const accessToken = request.cookies.get('access_token')?.value

	// If no token and trying to access protected route
	if (!accessToken) {
		if (pathname.startsWith('/api')) {
			return NextResponse.json(
				{ error: 'Authentication required' },
				{ status: 401 }
			)
		}

		// Redirect to login with redirect URL
		const url = request.nextUrl.clone()
		url.pathname = '/login'
		url.searchParams.set('redirect', pathname)
		return NextResponse.redirect(url)
	}

	// Token exists, allow request to proceed
	// Token validation happens client-side in AuthProvider
	return res
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 */
		'/((?!_next/static|_next/image|favicon.ico|public).*)',
	],
}
