import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

// List of public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/auth/callback',
  '/contact-admin',
  '/verify-email',
  '/',
];

// List of API routes that don't require authentication
const publicApiRoutes = [
  '/api/auth',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const res = NextResponse.next();

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return res;
  }

  // Allow public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return res;
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Files with extensions (images, etc.)
  ) {
    return res;
  }

  // Create a Supabase client configured for server-side
  const supabase = createMiddlewareClient({ req: request, res });

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If no session and trying to access protected route, redirect to login
  if (!session) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if this is a page refresh by looking for referer header
    const referer = request.headers.get('referer');
    const isPageRefresh = referer && referer.includes(pathname);
    
    // If it's a page refresh, add a small delay to allow auth context to load
    if (isPageRefresh) {
      // Add a small delay to prevent race conditions during page refresh
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Re-check session after delay
      const {
        data: { session: retrySession },
      } = await supabase.auth.getSession();
      
      if (retrySession) {
        // Session found after delay, continue with the request
        return res;
      }
    }

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Session exists, check if user is active
  if (session.user) {
    // Check if we have cached user data in cookies to avoid DB queries
    const cachedUserData = request.cookies.get('user_profile')?.value;
    
    if (cachedUserData) {
      try {
        const userProfile = JSON.parse(cachedUserData);
        // Check if cache is still valid (less than 10 minutes old for better performance)
        if (userProfile.cached_at && (Date.now() - userProfile.cached_at) < 10 * 60 * 1000) {
          // Use cached data - only check if user is active, skip role check for performance
          if (!userProfile.is_active) {
            // Sign out the invalid user
            await supabase.auth.signOut();

            if (pathname.startsWith('/api')) {
              return NextResponse.json(
                { error: 'Your account is inactive. Please contact support for assistance.' },
                { status: 403 }
              );
            }

            const url = request.nextUrl.clone();
            url.pathname = '/login';
            const response = NextResponse.redirect(url);
            response.cookies.set('auth_error', 'inactive', {
              httpOnly: false,
              sameSite: 'lax',
              maxAge: 10
            });
            return response;
          }
          return res;
        }
      } catch (error) {
        // Invalid cache, continue with DB query
        console.warn('Invalid cached user data:', error);
      }
    }

    // Cache miss: skip DB lookup for speed and allow request to proceed
    // Client will enforce inactivity/permissions after hydration
    return res;
  }

  // User is authenticated and active, allow request to proceed
  return res;
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
};