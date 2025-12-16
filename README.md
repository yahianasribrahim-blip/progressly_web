# Progressly

<div align="center">
  <h3>🚀 What's Working Right Now In Your Niche</h3>
  <p>The AI-powered content platform built for Muslim creators. Get insights on hooks, formats, and hashtags that are performing right now.</p>
</div>

---

## 🎯 Product Philosophy

> **Progressly is not an analytics dashboard. It is a "tell me what to do" product.**
> 
> If the user still has to think, the product failed.

---

## ✨ How It Works

1. **Select your niche** (Hijab Tutorials, Deen Information, Food, Gym, etc.)
2. **Click "Analyze My Niche"** (uses 1 analysis credit)
3. **Get actionable insights:**

   - 🎣 **Hooks That Are Working** - Platform-specific hook examples with engagement ratings
   - 🎬 **Formats That Are Performing** - Camera style, subtitles, video length, and why it works
   - 📹 **Example Videos** - Reference videos from real creators
   - #️⃣ **Hashtags With Momentum** - Grouped by reach (Broad/Medium/Niche)
   - 📊 **Performance Benchmark** - Expected view range and timeframe

---

## 💳 Pricing

| Plan | Price | Analysis Credits | Key Features |
|------|-------|-----------------|--------------|
| **Free** | $0/mo | 1/week | 3 hooks, 1 format, limited access |
| **Starter** | $29/mo | 3/week | Full access, save 10 analyses, copy buttons |
| **Pro** | $79/mo | 1/day | Daily data, unlimited saves, priority support |

*Annual billing saves 17%*

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Authentication**: NextAuth.js v5 (Email + Google)
- **Payments**: Stripe subscriptions
- **Styling**: Tailwind CSS + Shadcn UI
- **Database**: PostgreSQL + Prisma

---

## 🚀 Getting Started

### 1. Clone and Install

```bash
git clone <your-repo>
cd progressly
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
AUTH_SECRET="your-secret"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Email
RESEND_API_KEY="..."
EMAIL_FROM="noreply@yourdomain.com"

# Stripe
STRIPE_API_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID="price_..."
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID="price_..."
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID="price_..."
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID="price_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Setup

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
progressly/
├── app/
│   ├── (marketing)/          # Landing & pricing pages
│   ├── (protected)/dashboard/ # Dashboard (requires login)
│   │   ├── page.tsx          # "Analyze My Niche" main page
│   │   ├── saved/            # Saved analyses
│   │   ├── settings/         # Account settings
│   │   └── billing/          # Subscription management
│   └── api/
│       └── analysis/record/  # Track usage
│
├── components/
│   ├── dashboard/
│   │   ├── analyze-niche-section.tsx
│   │   ├── niche-selector.tsx
│   │   └── analysis/        # 5 result card components
│   └── pricing/
│       └── pricing-section.tsx
│
├── lib/
│   ├── user.ts              # Credit tracking & limits
│   └── mock-analysis.ts     # AI-generated content
│
└── config/
    ├── subscriptions.ts     # Pricing tiers
    └── dashboard.ts         # Navigation
```

---

## 🔮 Roadmap

- [ ] Real AI integration (OpenAI/Gemini)
- [ ] Live social media data scraping
- [ ] Persistent saved analyses (database)
- [ ] Team accounts for agencies
- [ ] Mobile app

---

## ⚠️ Disclaimer

**Progressly does not guarantee virality.** It shows patterns from content that is already performing. Your results depend on execution quality, consistency, and audience engagement.

---

<div align="center">
  <p>Built with ❤️ for content creators</p>
</div>
