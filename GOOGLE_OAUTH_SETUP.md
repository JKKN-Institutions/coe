# Google OAuth Setup for JKKN COE

This guide will help you configure Google OAuth authentication in your Supabase project.

## 🔧 Prerequisites

1. A Google Cloud Console account
2. Access to your Supabase project dashboard
3. Your application running locally or deployed

## 📋 Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `JKKN COE Authentication`
4. Click "Create"

### 1.2 Enable Google+ API
1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

### 1.3 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - For development: `https://ndnulujelcnnnhydfyum.supabase.co/auth/v1/callback`
   - For production: `https://your-domain.com/auth/callback`
5. Click "Create"
6. **Save the Client ID and Client Secret** - you'll need these for Supabase

## 🔧 Step 2: Supabase Configuration

### 2.1 Configure Google Provider
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/ndnulujelcnnnhydfyum)
2. Navigate to "Authentication" → "Providers"
3. Find "Google" in the list and click "Configure"
4. Toggle "Enable Google provider"
5. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
6. Set the redirect URL to: `https://ndnulujelcnnnhydfyum.supabase.co/auth/v1/callback`
7. Click "Save"

### 2.2 Configure Site URL
1. In Supabase Dashboard, go to "Authentication" → "URL Configuration"
2. Set **Site URL** to:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

## 🔧 Step 3: Environment Variables

Update your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ndnulujelcnnnhydfyum.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Google OAuth (Optional - for reference)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 🧪 Step 4: Testing

### 4.1 Test the Setup
1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Click "Continue with Google"
4. You should be redirected to Google's OAuth consent screen
5. After authentication, you should be redirected back to your app

### 4.2 Verify User Creation
1. Check your Supabase "Authentication" → "Users" tab
2. You should see the new user created via Google OAuth
3. Check the "users" table in your database
4. Verify the user profile was created correctly

## 🔧 Step 5: Production Deployment

### 5.1 Update Google OAuth Settings
1. In Google Cloud Console, add your production domain to authorized redirect URIs
2. Update Supabase Site URL and Redirect URLs for production

### 5.2 Environment Variables
Make sure your production environment has the correct Supabase credentials.

## 🛠️ Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**
   - Check that the redirect URI in Google Console matches Supabase
   - Ensure the URI is exactly: `https://ndnulujelcnnnhydfyum.supabase.co/auth/v1/callback`

2. **"Client ID not found" error**
   - Verify the Client ID is correctly entered in Supabase
   - Check that the Google Cloud project is active

3. **"Access blocked" error**
   - Make sure the Google+ API is enabled
   - Check that the OAuth consent screen is configured

4. **User not created in database**
   - Verify RLS policies are set up correctly
   - Check that the `handleOAuthCallback` function is working

### Debug Steps

1. Check browser console for errors
2. Verify Supabase logs in the dashboard
3. Test the OAuth flow step by step
4. Ensure all URLs are correctly configured

## 📝 OAuth Consent Screen Configuration

### For Development
1. In Google Cloud Console, go to "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - App name: `JKKN COE`
   - User support email: your email
   - Developer contact: your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users (your email addresses)

### For Production
1. Complete the OAuth consent screen verification process
2. Submit for Google verification if needed
3. Add your production domain to authorized domains

## 🔐 Security Considerations

1. **Keep credentials secure** - Never commit Client Secret to version control
2. **Use environment variables** - Store sensitive data in environment variables
3. **Regular rotation** - Rotate OAuth credentials periodically
4. **Monitor usage** - Check Google Cloud Console for unusual activity

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Google Cloud Console logs
3. Check Supabase authentication logs
4. Verify all URLs and credentials are correct

---

**Note**: This setup enables users to sign in with their Google accounts, and their profile information will be automatically synced to your `users` table in Supabase.
