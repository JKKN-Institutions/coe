# Gmail API Quick Setup Guide

Follow these steps to enable email notifications for new users.

## 🚀 Quick Start (5-10 minutes)

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable Gmail API:
   - Navigate to **APIs & Services > Library**
   - Search "Gmail API" and click **Enable**

### 2. OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Select **External** and click **Create**
3. Fill in basic info:
   - App name: `JKKN COE Portal`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**
5. On Scopes page, click **Add or Remove Scopes**
6. Add this scope: `https://www.googleapis.com/auth/gmail.send`
7. Click **Save and Continue**
8. Add Test Users: Add your Gmail account
9. Click **Save and Continue**

### 3. Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Web application**
4. Name: `JKKN COE Email Service`
5. Add Authorized redirect URI: `https://developers.google.com/oauthplayground`
6. Click **Create**
7. **📋 Copy and save:**
   - Client ID
   - Client Secret

### 4. Get Refresh Token

1. Go to [OAuth Playground](https://developers.google.com/oauthplayground)
2. Click **⚙️ (Settings)** in top-right corner
3. Check **✓ Use your own OAuth credentials**
4. Paste your Client ID and Client Secret
5. Close settings
6. In left panel, find **Gmail API v1**
7. Select: `https://www.googleapis.com/auth/gmail.send`
8. Click **Authorize APIs**
9. Sign in with your Gmail account
10. Click **Allow**
11. Click **Exchange authorization code for tokens**
12. **📋 Copy the Refresh Token**

### 5. Configure Environment Variables

Add to your `.env.local` file:

```env
GMAIL_CLIENT_ID=paste_your_client_id_here
GMAIL_CLIENT_SECRET=paste_your_client_secret_here
GMAIL_REFRESH_TOKEN=paste_your_refresh_token_here
GMAIL_USER=your-email@gmail.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Test It! 🎉

1. Restart your development server
2. Go to Users page
3. Click **Add** to create a new user
4. Fill in user details (use a real email address)
5. Click **Create User**
6. Check the email inbox! 📧

---

## ✅ Success Indicators

- ✅ No error in console logs
- ✅ User receives welcome email
- ✅ Email contains login link
- ✅ Email includes credentials (if password was set)

## ❌ Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid credentials" | Double-check Client ID and Secret |
| "Token expired" | Generate new refresh token |
| "Access blocked" | Add your Gmail as test user |
| No email received | Check spam folder |
| "API not enabled" | Enable Gmail API in Cloud Console |

## 📊 Sending Limits

- Regular Gmail: 500 emails/day
- Google Workspace: 2,000 emails/day

---

## 🔐 Security Notes

- Never commit `.env.local` to Git
- Keep your credentials private
- Use test users during development
- Monitor usage in Google Cloud Console

---

## 📚 Full Documentation

See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for detailed documentation.

## 🆘 Need Help?

1. Check console logs for detailed errors
2. Verify all environment variables are set
3. Test credentials in OAuth Playground
4. Ensure Gmail API is enabled
5. Check sending quota in Google Cloud Console