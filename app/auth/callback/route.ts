import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('Supabase OAuth Callback Route:', { 
    code: !!code, 
    state: !!state,
    error, 
    errorDescription,
    url: requestUrl.toString()
  });

  if (error) {
    console.error('OAuth error:', error, errorDescription);
    
    // Handle specific OAuth errors
    if (error === 'invalid_request' && errorDescription?.includes('bad_oauth_state')) {
      console.error('OAuth state validation failed - this usually indicates a CSRF attack or expired state');
      // Redirect to login with a more specific error
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'oauth_state_invalid');
      loginUrl.searchParams.set('error_description', 'Authentication session expired. Please try logging in again.');
      return NextResponse.redirect(loginUrl);
    }
    
    // Redirect to login with error
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', error);
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    try {
      console.log('Exchanging code for session...');
      
      // Exchange code for session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        
        // Handle specific OAuth errors
        if (exchangeError.message?.includes('invalid_grant') || exchangeError.message?.includes('code_expired')) {
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('error', 'oauth_code_expired');
          loginUrl.searchParams.set('error_description', 'Authentication code expired. Please try logging in again.');
          return NextResponse.redirect(loginUrl);
        }
        
        if (exchangeError.message?.includes('invalid_request')) {
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('error', 'oauth_invalid_request');
          loginUrl.searchParams.set('error_description', 'Invalid authentication request. Please try logging in again.');
          return NextResponse.redirect(loginUrl);
        }
        
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'authentication_failed');
        return NextResponse.redirect(loginUrl);
      }

      if (data.session) {
        console.log('OAuth session created successfully:', {
          userId: data.session.user?.id,
          email: data.session.user?.email
        });
        
        // Check if user is active in our database
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('is_active')
            .eq('email', data.session.user?.email)
            .single();

          if (userError || !userData) {
            console.log('User not found in database, redirecting to contact admin');
            const contactUrl = new URL('/contact-admin', request.url);
            return NextResponse.redirect(contactUrl);
          }

          if (!userData.is_active) {
            console.log('User account is inactive, redirecting to contact admin');
            const contactUrl = new URL('/contact-admin', request.url);
            return NextResponse.redirect(contactUrl);
          }

          // User is active, redirect to dashboard
          console.log('User is active, redirecting to dashboard');
          const dashboardUrl = new URL('/dashboard', request.url);
          return NextResponse.redirect(dashboardUrl);
        } catch (dbError) {
          console.error('Database check error:', dbError);
          const contactUrl = new URL('/contact-admin', request.url);
          return NextResponse.redirect(contactUrl);
        }
      } else {
        console.error('No session returned from code exchange');
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'no_session');
        return NextResponse.redirect(loginUrl);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'authentication_failed');
      return NextResponse.redirect(loginUrl);
    }
  }

  // If no code or error, redirect to login
  console.log('No code or error found, redirecting to login');
  return NextResponse.redirect(new URL('/login', request.url));
}
