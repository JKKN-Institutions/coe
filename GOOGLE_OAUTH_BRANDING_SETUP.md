# Google OAuth Branding Configuration Guide

## Change "Choose an account to continue to ndnulujelcnnnhydfyum.supabase.co" to "JKKN"

This guide will help you customize the Google OAuth consent screen to show your organization name instead of the Supabase URL.

## Steps to Configure OAuth Consent Screen

### 1. Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create a new one if needed)

### 2. Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**

2. **Choose User Type:**
   - Select **Internal** (if only for your Google Workspace organization)
   - Select **External** (if for any Google account user)

3. **Edit App Registration - App Information:**
   - **App name:** `JKKN` or `JKKN COE Portal`
   - **User support email:** Your support email
   - **App logo:** Upload JKKN logo (optional, must be 120x120px)

4. **App Domain (Important for Branding):**
   - **Application home page:** `https://jkkn.ac.in` (or your main website)
   - **Application privacy policy:** `https://jkkn.ac.in/privacy` (if available)
   - **Application terms of service:** `https://jkkn.ac.in/terms` (if available)

5. **Authorized domains:**
   - Add your domain: `jkkn.ac.in`
   - Keep Supabase domain: `supabase.co`

6. **Developer contact information:**
   - Add your administrator email addresses

### 3. Configure OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Update the following:

   **Authorized JavaScript origins:**
   ```
   https://ndnulujelcnnnhydfyum.supabase.co
   http://localhost:3000
   https://your-production-domain.com
   ```

   **Authorized redirect URIs:**
   ```
   https://ndnulujelcnnnhydfyum.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   https://your-production-domain.com/auth/callback
   ```

### 4. Verification Requirements (For External Apps)

If you selected "External" user type and want to remove the "unverified app" warning:

1. **Domain Verification:**
   - Verify ownership of `jkkn.ac.in` domain
   - Go to **Domain verification** tab
   - Add the domain and follow verification steps

2. **App Verification (Optional):**
   - Required only if requesting sensitive scopes
   - Basic email/profile scopes don't require verification
   - Submit for verification if you see warnings

### 5. Custom Domain Solution (Advanced)

To completely remove Supabase URL from the flow, you can:

#### Option A: Use a Custom Domain with Supabase (Pro/Team plan required)
1. In Supabase Dashboard → Settings → Custom Domains
2. Add your subdomain: `auth.jkkn.ac.in`
3. Configure DNS CNAME record
4. Update OAuth redirect URIs to use custom domain

#### Option B: Proxy Authentication (Self-hosted solution)
1. Set up a reverse proxy on your domain
2. Configure it to forward auth requests to Supabase
3. Update all OAuth configurations to use your domain

## Quick Configuration Checklist

- [ ] OAuth consent screen configured
- [ ] App name set to "JKKN" or "JKKN COE Portal"
- [ ] Support email configured
- [ ] Application homepage set to your domain
- [ ] Authorized domains include your domain
- [ ] OAuth client redirect URIs updated
- [ ] Logo uploaded (optional)
- [ ] Domain verified (for external apps)

## Testing the Changes

1. Clear browser cookies and cache
2. Go to your application login page
3. Click "Continue with Google"
4. You should now see: "Choose an account to continue to JKKN"

## Important Notes

1. **Changes may take time:** OAuth consent screen changes can take 5 minutes to several hours to propagate
2. **Caching:** Users may need to clear cookies/cache to see updates
3. **Verification:** External apps may show "unverified" warning until domain verification is complete
4. **Scopes:** Only request necessary scopes (email, profile) to avoid verification requirements

## Troubleshooting

### Still showing Supabase URL?
1. Check that OAuth consent screen is saved and published
2. Clear all Google account cookies
3. Try incognito/private browsing mode
4. Wait for changes to propagate (up to 24 hours)

### "Unverified App" Warning?
1. Complete domain verification
2. For production, submit for OAuth verification
3. For internal use, use Google Workspace internal app type

### Redirect URI Mismatch?
1. Ensure all redirect URIs in Google Console match exactly
2. Include both development and production URLs
3. Check for trailing slashes

## Support

For Google OAuth configuration issues:
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console Help](https://support.google.com/cloud)

For Supabase-specific issues:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Support](https://supabase.com/support)