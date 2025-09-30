# 📧 Quick Email Setup (5 Minutes)

Send welcome emails to new users using Supabase + Resend.

## ⚡ Super Quick Setup

### 1️⃣ Get Resend API Key (2 min)

1. Go to https://resend.com/signup
2. Sign up (free)
3. Create API Key → Copy it (starts with `re_`)

### 2️⃣ Deploy Edge Function (2 min)

**Using Supabase CLI:**

```bash
# Install CLI (if needed)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy
supabase functions deploy send-email

# Set secrets
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase secrets set EMAIL_FROM=noreply@yourdomain.com
```

### 3️⃣ Test It! (1 min)

1. Create a new user in your app
2. Check email inbox 📧
3. Done! ✅

---

## 📋 Checklist

- [ ] Resend account created
- [ ] API key copied
- [ ] Edge function deployed
- [ ] Secrets configured
- [ ] Test email sent
- [ ] Email received

---

## 🐛 Not Working?

**Check logs:**
```bash
supabase functions logs send-email
```

**Verify secrets:**
```bash
supabase secrets list
```

**Test function:**
```bash
curl -L -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"to":"test@example.com","subject":"Test","html":"<h1>Hi</h1>"}'
```

---

## 📚 Full Documentation

See [SUPABASE_EMAIL_SETUP.md](./SUPABASE_EMAIL_SETUP.md) for complete guide.

---

## 💰 Pricing

**Resend Free Tier:**
- 3,000 emails/month
- 100 emails/day
- ✅ Perfect for most projects!

**Supabase:**
- Edge Functions included in free tier
- 500,000 invocations/month

---

## ✨ What You Get

✅ Professional welcome emails
✅ Automatic user notifications
✅ Login credentials included
✅ Direct login link
✅ Beautiful HTML template
✅ Serverless architecture

---

**That's it! 🎉**

Your users will now receive welcome emails automatically when their accounts are created.