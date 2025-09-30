# Email Notification Setup

This application sends welcome emails to newly created users with their login credentials using Gmail API.

## Email Service Configuration

The application uses **Gmail API with OAuth2** for sending emails through your Gmail account.

### Setup Steps

#### Step 1: Enable Gmail API in Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com/
   - Create a new project or select an existing one

2. **Enable Gmail API**
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

#### Step 2: Create OAuth 2.0 Credentials

1. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Select "External" user type
   - Fill in the required information:
     - App name: "JKKN COE Portal"
     - User support email: your email
     - Developer contact information: your email
   - Add scope: `https://www.googleapis.com/auth/gmail.send`
   - Add test users (your Gmail account)

2. **Create OAuth 2.0 Client ID**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "JKKN COE Email Service"
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`
   - Click "Create"
   - **Save the Client ID and Client Secret**

#### Step 3: Get Refresh Token

1. **Go to OAuth 2.0 Playground**
   - Visit https://developers.google.com/oauthplayground

2. **Configure OAuth Playground**
   - Click the gear icon (⚙️) in the top right
   - Check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - Close settings

3. **Authorize APIs**
   - In the left panel, find "Gmail API v1"
   - Select `https://www.googleapis.com/auth/gmail.send`
   - Click "Authorize APIs"
   - Sign in with your Gmail account
   - Click "Allow"

4. **Exchange Authorization Code**
   - Click "Exchange authorization code for tokens"
   - **Copy the Refresh Token** (you'll need this)

#### Step 4: Configure Environment Variables

Add the following variables to your `.env.local` file:

```env
# Gmail API Configuration
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
GMAIL_USER=your-email@gmail.com

# Application URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Variable Descriptions:**
- `GMAIL_CLIENT_ID`: OAuth 2.0 Client ID from Google Cloud Console
- `GMAIL_CLIENT_SECRET`: OAuth 2.0 Client Secret from Google Cloud Console
- `GMAIL_REFRESH_TOKEN`: Refresh token from OAuth Playground
- `GMAIL_USER`: Your Gmail email address (sender email)
- `NEXT_PUBLIC_APP_URL`: Your application's URL (used in the login link)

#### Step 5: Test Email Sending

- Create a new user through the admin panel
- Check if the welcome email is received
- Check the console/logs for any errors

## Email Features

When a new user is created:
- ✅ Automatic welcome email is sent
- ✅ Email includes login URL
- ✅ Temporary password is included (if set)
- ✅ Professional HTML email template
- ✅ Gradient design matching the portal theme

## Email Template

The welcome email includes:
- Personalized greeting with user's name
- Login credentials (if temporary password is set)
- Direct link to login page
- Instructions to change password
- Branded header and footer

## Development Mode

For development/testing without Gmail API:
- The system will log a warning but won't fail user creation
- Email sending is gracefully skipped if Gmail credentials are not configured
- User accounts will still be created successfully

## Troubleshooting

### Email Not Sending

1. **Check Credentials**: Ensure all Gmail environment variables are set correctly
   ```bash
   GMAIL_CLIENT_ID
   GMAIL_CLIENT_SECRET
   GMAIL_REFRESH_TOKEN
   GMAIL_USER
   ```

2. **Verify Gmail API is Enabled**: Check Google Cloud Console

3. **Check Refresh Token**: Token might have expired, generate a new one

4. **Check Logs**: Look at the console for detailed error messages

5. **Test OAuth Credentials**: Use OAuth Playground to verify credentials work

### Common Errors

**"Invalid credentials"**
- Verify Client ID and Client Secret are correct
- Make sure you copied them from the same OAuth client

**"Token has been expired or revoked"**
- Generate a new refresh token from OAuth Playground
- Update `GMAIL_REFRESH_TOKEN` in `.env.local`

**"Access blocked: This app's request is invalid"**
- Add your Gmail account as a test user in OAuth consent screen
- Make sure Gmail API scope is added

**"Daily sending quota exceeded"**
- Gmail has sending limits (500 emails/day for regular accounts)
- Consider using Google Workspace for higher limits

### Emails Going to Spam

1. Use a verified Gmail account
2. Avoid spam trigger words in subject/content
3. Keep email content professional
4. Don't send too many emails too quickly

## Gmail Sending Limits

**Regular Gmail Account:**
- 500 emails per day
- 500 recipients per email

**Google Workspace Account:**
- 2,000 emails per day
- 10,000 recipients per email

## Alternative Email Services

If you need higher volumes or professional features, consider:

- **SendGrid**: High-volume transactional emails
- **Amazon SES**: AWS email service with pay-as-you-go pricing
- **Mailgun**: Email API service for developers
- **Postmark**: Transactional email with excellent deliverability

To switch services, modify `/lib/email-service.ts`

## Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Use OAuth 2.0** (this setup) instead of app passwords
3. **Rotate credentials** periodically
4. **Monitor usage** in Google Cloud Console
5. **Use test users** during development