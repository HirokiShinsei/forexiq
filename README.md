# ForexIQ — Forex & Gold Intelligence Board

A real-time forex and gold intelligence dashboard for OFWs and traders monitoring EUR/PHP, USD/PHP, AED/PHP, and XAU/USD — with technical indicators, macro-aware decision signals, news sentiment, and a universal search.

Built with **Express + Vite + React + Tailwind CSS + shadcn/ui**.

---

## Features

- **4 live pairs**: EUR/PHP · USD/PHP · AED/PHP · XAU/USD
- **Candlestick charts** (90-day) with SMA20, SMA50, Bollinger Bands
- **Technical indicators**: RSI, MACD, Stochastic, ATR
- **Macro-aware decision signal**: composite score (60% technical + 40% news/macro)
  - Geopolitical factors: Iran-US conflict, Russia-Ukraine war, Gulf risk
  - Monetary policy: ECB, Fed, BSP, UAE Central Bank
  - OFW remittance analysis
- **Live news feed** with sentiment scoring (NewsData.io)
- **Universal search**: search by pair, currency, or keyword
- **Security hardened**: no tracking, no Google Fonts, CSP headers, rate limiting

---

## Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/forexiq.git
cd forexiq

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your NEWSDATA_API_KEY

# Development
npm run dev

# Production build
npm run build
npm start
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | Yes | `development` or `production` |
| `ALLOWED_ORIGIN` | Production | Your frontend domain for CORS |
| `NEWSDATA_API_KEY` | Recommended | [Get free key at newsdata.io](https://newsdata.io) |

---

## Security

This app is hardened against common web vulnerabilities:

| Protection | Implementation |
|---|---|
| **XSS** | `helmet` Content-Security-Policy, input sanitization in SearchBar |
| **Clickjacking** | `X-Frame-Options: DENY` |
| **MIME sniffing** | `X-Content-Type-Options: nosniff` |
| **API abuse** | `express-rate-limit` — 60 req/min general, 20/5min for data endpoints |
| **Data leakage** | `Referrer-Policy: no-referrer` |
| **Tracking** | No Google Fonts, no analytics scripts, no cookies |
| **CORS** | Only same-origin requests to `/api/` (configurable via `ALLOWED_ORIGIN`) |
| **Error info** | Internal errors never leak stack traces in production |
| **Body size** | Request bodies capped at 50kb |
| **Query injection** | All search input sanitized, max 100 chars, HTML stripped |

---

## Deploying to Cloudflare

### Option A: Cloudflare Pages (Static Frontend) + External Backend

Best for free hosting of the frontend. You run the Node.js backend separately (Railway, Render, Fly.io).

1. Push to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com) → Create Project → Connect to GitHub
3. Build settings:
   - **Build command**: `npm run build`
   - **Output directory**: `dist/public`
   - **Node version**: `20`
4. Add environment variables in Cloudflare Pages dashboard
5. Set your backend URL in `client/src/lib/queryClient.ts` if hosting backend separately

### Option B: Cloudflare Workers (Full Stack)

Runs both frontend and backend on Cloudflare's edge network.

```bash
# Install Wrangler CLI
npm install -g wrangler

# Authenticate
wrangler login

# Set secrets (never put these in wrangler.toml)
wrangler secret put NEWSDATA_API_KEY
wrangler secret put ALLOWED_ORIGIN

# Deploy
npm run build
wrangler deploy
```

### Option C: GitHub Actions → Cloudflare Pages (CI/CD)

Automatic deployment on every push to `main`.

1. Get your Cloudflare API token: Dashboard → My Profile → API Tokens → Create Token
2. Add to GitHub: Settings → Secrets → `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
3. Push to `main` — the workflow in `.github/workflows/deploy.yml` handles the rest

---

## Pushing to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: ForexIQ intelligence board"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/forexiq.git
git branch -M main
git push -u origin main
```

**Important**: make sure `.env` is in `.gitignore` (it is by default). Never commit API keys.

---

## Free APIs Used

| API | Purpose | Limit |
|---|---|---|
| [Frankfurter](https://www.frankfurter.app) | EUR/PHP, USD/PHP, AED/PHP history & spot rates | Unlimited (ECB data) |
| [gold-api.com](https://gold-api.com) | XAU/USD spot price | Free tier |
| [NewsData.io](https://newsdata.io) | News feed with sentiment | 200 req/day free |

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v3, shadcn/ui, Lightweight Charts v5
- **Backend**: Express 5, TypeScript, tsx
- **Security**: Helmet, express-rate-limit
- **Routing**: wouter (hash-based for static hosting compatibility)

---

*For informational purposes only. Not financial advice.*
