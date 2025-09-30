# 📧 Email Notification System

Automatic welcome emails for new users with login credentials.

## ✨ Features

- ✅ **Automatic welcome emails** when users are created
- ✅ **Professional HTML template** with gradient design
- ✅ **Login credentials included** (if password is set)
- ✅ **Direct login link** to the portal
- ✅ **Gmail API integration** with OAuth2
- ✅ **Non-blocking** - User creation succeeds even if email fails
- ✅ **Graceful fallback** - Works without email configured

## 📧 Email Preview

When a new user is created, they receive a professional email:

```
┌────────────────────────────────────────┐
│                                        │
│     Welcome to JKKN COE                │
│  Your account has been created         │
│                                        │
├────────────────────────────────────────┤
│                                        │
│  Hello [User Name],                    │
│                                        │
│  Your account has been created on      │
│  the JKKN College of Engineering       │
│  portal. You can now access the        │
│  system using your credentials.        │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ Your Login Credentials:          │ │
│  │ Temporary Password: ********     │ │
│  │ Important: Change after login    │ │
│  └──────────────────────────────────┘ │
│                                        │
│       [ Login to Your Account ]        │
│                                        │
│  If you have questions, contact        │
│  our support team.                     │
│                                        │
├────────────────────────────────────────┤
│    JKKN College of Engineering         │
│    Automated message - Do not reply    │
└────────────────────────────────────────┘
```

## 🚀 Quick Setup

See [GMAIL_QUICK_SETUP.md](./GMAIL_QUICK_SETUP.md) for step-by-step instructions (5-10 minutes).

### TL;DR

1. Enable Gmail API in Google Cloud Console
2. Create OAuth 2.0 credentials
3. Get refresh token from OAuth Playground
4. Add credentials to `.env.local`
5. Test by creating a new user

## 🔧 Configuration

Add to `.env.local`:

```env
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
GMAIL_USER=your-email@gmail.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📝 How It Works

1. **User Created** → Admin creates user through the portal
2. **Email Triggered** → System automatically sends welcome email
3. **User Receives** → Professional email with login details
4. **User Logs In** → Direct link to login page

## 🎯 Use Cases

- ✅ New employee onboarding
- ✅ Student account creation
- ✅ Staff member registration
- ✅ Administrator account setup

## 📊 Email Content

| Field | Description |
|-------|-------------|
| **To** | New user's email address |
| **From** | Your Gmail account (JKKN COE) |
| **Subject** | "Welcome to JKKN College of Engineering - Your Account is Ready" |
| **Body** | Professional HTML template with gradient design |
| **Includes** | Name, Login URL, Temporary password (if set) |

## 🔐 Security Features

- ✅ OAuth 2.0 authentication (no plain passwords)
- ✅ Refresh token for long-term access
- ✅ Environment variables for credentials
- ✅ Password reminder to change on first login
- ✅ Secure HTTPS links only

## 📈 Sending Limits

| Account Type | Daily Limit | Per Email |
|-------------|-------------|-----------|
| Regular Gmail | 500 emails | 500 recipients |
| Google Workspace | 2,000 emails | 10,000 recipients |

## 🐛 Troubleshooting

**Email not sending?**
1. Check environment variables are set
2. Verify Gmail API is enabled
3. Ensure refresh token is valid
4. Check console logs for errors
5. Verify test user is added in OAuth consent

**Email in spam?**
- Use verified Gmail account
- Avoid spam trigger words
- Keep content professional
- Don't send too many emails at once

## 📚 Documentation

- **Quick Setup**: [GMAIL_QUICK_SETUP.md](./GMAIL_QUICK_SETUP.md)
- **Detailed Guide**: [EMAIL_SETUP.md](./EMAIL_SETUP.md)
- **Environment Example**: [.env.example](./.env.example)

## 🔄 Email Flow Diagram

```
┌─────────────┐
│ Admin Panel │
└──────┬──────┘
       │ Creates User
       ▼
┌─────────────────┐
│ User API Route  │
└──────┬──────────┘
       │ Saves to DB
       ▼
┌─────────────────┐
│ Email Service   │
└──────┬──────────┘
       │ Sends via Gmail API
       ▼
┌─────────────────┐
│ User Inbox 📧   │
└─────────────────┘
```

## 💡 Tips

- Test with your own email first
- Monitor sending quota in Google Cloud Console
- Keep refresh token secure
- Use Google Workspace for higher limits
- Add multiple test users during development

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section in documentation
2. Verify all environment variables
3. Test credentials in OAuth Playground
4. Check Gmail API quota in Cloud Console
5. Review console logs for detailed errors

---

**Built with:** Nodemailer + Gmail API + OAuth2
**Security:** OAuth 2.0 authentication
**Template:** Professional HTML with responsive design