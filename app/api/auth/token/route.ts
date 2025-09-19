import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    // Validate required environment variables
    const requiredEnvVars = {
      NEXT_PUBLIC_PARENT_APP_URL: process.env.NEXT_PUBLIC_PARENT_APP_URL,
      NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY,
      NEXT_PUBLIC_APP_ID: process.env.NEXT_PUBLIC_APP_ID,
      NEXT_PUBLIC_REDIRECT_URI: process.env.NEXT_PUBLIC_REDIRECT_URI
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      return NextResponse.json(
        { error: 'Authentication configuration error' },
        { status: 500 }
      );
    }

    // Exchange code with parent app
    const tokenResponse = await fetch(
      `${process.env.NEXT_PUBLIC_PARENT_APP_URL}/api/auth/child-app/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || ''
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          app_id: process.env.NEXT_PUBLIC_APP_ID,
          redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI
        })
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error,
        requestDetails: {
          url: `${process.env.NEXT_PUBLIC_PARENT_APP_URL}/api/auth/child-app/token`,
          app_id: process.env.NEXT_PUBLIC_APP_ID,
          redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI,
          hasApiKey: !!process.env.NEXT_PUBLIC_API_KEY
        }
      });
      return NextResponse.json(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        { error: error.error || 'Token exchange failed' },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();

    console.log('Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      hasUser: !!tokenData.user,
      userEmail: tokenData.user?.email
    });

    // Return tokens to frontend
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in || 3600,
      user: tokenData.user
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
