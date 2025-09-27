import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('Supabase OAuth Callback Route:', { 
    code: !!code, 
    error, 
    errorDescription,
    url: requestUrl.toString()
  });

  if (error) {
    console.error('OAuth error:', error, errorDescription);
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
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'authentication_failed');
        return NextResponse.redirect(loginUrl);
      }

      if (data.session) {
        console.log('OAuth session created successfully:', {
          userId: data.session.user?.id,
          email: data.session.user?.email
        });
        // Redirect to our callback page to handle the session
        const callbackUrl = new URL('/auth/callback', request.url);
        return NextResponse.redirect(callbackUrl);
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
