import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

// List of public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/auth/callback',
  '/contact-admin',
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

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Session exists, check if user is active
  if (session.user) {
    const { data: userProfile, error: fetchError } = await supabase
      .from('users')
      .select('is_active, role')
      .eq('email', session.user.email)
      .single();

    // If table doesn't exist or user not found, try to create the user
    if (fetchError || !userProfile) {
      // Try to create a new user entry
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          username: session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url || '',
          role: 'user',
          is_active: true,
          is_verified: true,
          institution_id: '1'
        })
        .select()
        .single();

      // If creation failed (table doesn't exist or other error)
      if (createError) {
        console.error('Failed to create user:', createError);

        // Allow access but log the issue
        console.warn('Users table may not exist. Please create it using the SQL in CREATE_USERS_TABLE.md');
        return res;
      }

      // User created successfully, allow access
      if (newUser) {
        return res;
      }
    }

    // Check if user exists and is active
    if (userProfile && (!userProfile.is_active || !userProfile.role)) {
      // Sign out the invalid user
      await supabase.auth.signOut();

      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Your account is inactive. Please contact support for assistance.' },
          { status: 403 }
        );
      }

      // Store error in cookie instead of URL parameter
      const url = request.nextUrl.clone();
      url.pathname = '/login';

      const response = NextResponse.redirect(url);
      response.cookies.set('auth_error', 'inactive', {
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 10 // expires in 10 seconds
      });

      return response;
    }
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