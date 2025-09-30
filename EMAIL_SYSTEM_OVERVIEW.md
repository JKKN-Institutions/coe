# 📧 Email Notification System - Complete Overview

Automatic welcome emails for new users using **Supabase Edge Functions** + **Resend**.

---

## 🎯 What It Does

When you create a new user in the admin panel:
1. ✅ User account is saved to database
2. ✅ Welcome email is automatically sent
3. ✅ User receives professional email with:
   - Personalized greeting
   - Login URL
   - Temporary password (if set)
   - Instructions to change password

---

## 🏗️ Architecture

```
┌─────────────────────┐
│   Admin Panel       │
│   (Create User)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   API Route         │
│   /api/users        │
└──────────┬──────────┘
           │
           ├─── Save to Database ───► ✅ User Created
           │
           ▼
┌─────────────────────┐
│   Email Service     │
│   lib/email-service │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Supabase Edge     │
│   Function          │
│   (send-email)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Resend API        │
│   (Email Delivery)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   User Email 📧     │
└─────────────────────┘
```

---

## 📁 File Structure

```
jkkncoe/
├── lib/
│   └── email-service.ts              # Email service (calls Supabase)
├── app/
│   └── api/
│       └── users/
│           └── route.ts              # Triggers email on user creation
├── supabase/
│   └── functions/
│       └── send-email/
│           └── index.ts              # Edge function (calls Resend)
├── SUPABASE_EMAIL_SETUP.md           # Complete setup guide
├── QUICK_EMAIL_SETUP.md              # 5-minute quick start
├── EMAIL_SYSTEM_OVERVIEW.md          # This file
├── deploy-email-function.sh          # Unix deployment script
└── deploy-email-function.bat         # Windows deployment script
```

---

## 🚀 Setup Methods

### Method 1: Automated Script (Easiest)

**Windows:**
```bash
deploy-email-function.bat
```

**Mac/Linux:**
```bash
chmod +x deploy-email-function.sh
./deploy-email-function.sh
```

### Method 2: Manual CLI

```bash
# Install & login
npm install -g supabase
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy
supabase functions deploy send-email

# Configure
supabase secrets set RESEND_API_KEY=re_your_key
supabase secrets set EMAIL_FROM=noreply@yourdomain.com
```

### Method 3: Supabase Dashboard

1. Go to Edge Functions
2. Create function named `send-email`
3. Copy code from `supabase/functions/send-email/index.ts`
4. Add secrets in function settings

---

## ⚙️ Configuration

### Required: Resend Account

1. Sign up at https://resend.com (free)
2. Create API key
3. Deploy edge function with secrets

### Already Have: Supabase

Your `.env.local` already has Supabase configured:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**No additional environment variables needed!**

### Edge Function Secrets

Set via Supabase (not in .env.local):
```bash
RESEND_API_KEY=re_your_key_here
EMAIL_FROM=noreply@yourdomain.com
```

---

## 📧 Email Template Features

### Professional Design
- ✨ Gradient header (purple theme)
- 📝 Clean, readable typography
- 📱 Mobile responsive
- 🎨 Branded colors matching portal

### Content Includes
- 👤 Personalized greeting with user's name
- 🔗 Direct "Login to Your Account" button
- 🔑 Temporary password (if provided)
- ⚠️ Security reminder to change password
- 📧 JKKN COE branding and footer

### Customization

Edit `lib/email-service.ts` → `generateWelcomeEmailHTML()` function to customize:
- Email subject
- HTML template
- Colors and styling
- Text content

---

## 📊 Limits & Pricing

### Resend (Email Service)

| Plan | Price | Emails/Month | Emails/Day |
|------|-------|--------------|------------|
| Free | $0 | 3,000 | 100 |
| Pro | $20 | 50,000 | 1,600+ |
| Business | $80 | 200,000 | 6,600+ |

### Supabase (Edge Functions)

| Plan | Price | Invocations/Month |
|------|-------|-------------------|
| Free | $0 | 500,000 |
| Pro | $25 | 2,000,000 |

**💡 Most projects will stay within free tiers!**

---

## 🔍 Monitoring & Debugging

### View Logs

```bash
# Real-time logs
supabase functions logs send-email --follow

# Recent logs
supabase functions logs send-email
```

### Check Sent Emails

Resend Dashboard → Emails
- View all sent emails
- See delivery status
- Check bounce/spam reports
- Track opens/clicks (if enabled)

### Test Edge Function

```bash
curl -L -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello World</h1>"
  }'
```

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Function not found | Run `supabase functions deploy send-email` |
| Invalid API key | Check secrets: `supabase secrets list` |
| Email not received | Check spam folder, verify Resend dashboard |
| CORS error | Edge function handles CORS automatically |
| Domain not verified | Use `onboarding@resend.dev` or verify domain |
| Rate limit exceeded | Upgrade Resend plan or wait 24 hours |

### Debug Checklist

- [ ] Edge function deployed?
- [ ] Secrets configured?
- [ ] Resend API key valid?
- [ ] Email address valid?
- [ ] Check edge function logs
- [ ] Check Resend dashboard
- [ ] Verify domain (production)

---

## 🔐 Security Best Practices

1. ✅ **Use Edge Function Secrets**
   - Never put API keys in code
   - Use `supabase secrets set`

2. ✅ **Verify Domain (Production)**
   - Add SPF, DKIM, DMARC records
   - Improves deliverability

3. ✅ **Monitor Usage**
   - Check Resend dashboard regularly
   - Set up usage alerts

4. ✅ **Rotate Credentials**
   - Regenerate API keys periodically
   - Update secrets after rotation

5. ✅ **Rate Limiting**
   - Resend enforces rate limits
   - Plan accordingly for bulk sends

---

## 🎨 Customization Guide

### Change Email Subject

Edit `lib/email-service.ts`:
```typescript
subject: 'Your Custom Subject Here'
```

### Modify Email Template

Edit `generateWelcomeEmailHTML()` function in `lib/email-service.ts`

### Add Email Attachments

Modify edge function `supabase/functions/send-email/index.ts`:
```typescript
body: JSON.stringify({
  from: '...',
  to: [...],
  subject: '...',
  html: '...',
  attachments: [
    {
      filename: 'document.pdf',
      content: 'base64_content_here'
    }
  ]
})
```

### Send to Multiple Recipients

Modify API call to accept array of emails and loop through them.

---

## 📚 Documentation Index

| Document | Purpose | Time |
|----------|---------|------|
| [QUICK_EMAIL_SETUP.md](./QUICK_EMAIL_SETUP.md) | Fast setup guide | 5 min |
| [SUPABASE_EMAIL_SETUP.md](./SUPABASE_EMAIL_SETUP.md) | Complete guide | 15 min |
| [EMAIL_SYSTEM_OVERVIEW.md](./EMAIL_SYSTEM_OVERVIEW.md) | This overview | - |

---

## 🆘 Getting Help

### Check These First:
1. Edge function logs
2. Resend dashboard
3. Troubleshooting section in docs
4. Supabase dashboard

### Still Stuck?
- Review [SUPABASE_EMAIL_SETUP.md](./SUPABASE_EMAIL_SETUP.md)
- Check Resend documentation
- Check Supabase documentation
- Verify all secrets are set correctly

---

## ✨ Features Summary

✅ **Automatic** - No manual intervention needed
✅ **Professional** - Beautiful HTML email template
✅ **Secure** - OAuth2, encrypted credentials
✅ **Scalable** - Serverless architecture
✅ **Reliable** - Resend has 99.9% uptime
✅ **Affordable** - Free tier covers most needs
✅ **Trackable** - Monitor sends in Resend dashboard
✅ **Customizable** - Easy to modify template
✅ **Non-blocking** - User creation succeeds even if email fails

---

**Built with:**
- 🚀 Supabase Edge Functions (Serverless)
- 📧 Resend API (Email delivery)
- 🎨 Custom HTML template
- 🔐 OAuth2 security

**Ready to send emails!** 🎉