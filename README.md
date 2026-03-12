# ForexIQ — Forex & Gold Intelligence Dashboard

Real-time forex monitoring for EUR/PHP, USD/PHP, AED/PHP, and XAU/USD (Gold).
Candlestick charts, technical indicators (RSI, MACD, Bollinger, Stochastic),
composite buy/sell/hold signals with macro factor analysis, news sentiment,
and universal search across all symbols.

---

## Architecture

```
Browser (Cloudflare Pages — static)
    │
    │  HTTPS /api/* requests
    ▼
Render (Node.js Express — free tier, Singapore)
    │
    ├── Frankfurter API  → EUR/PHP, USD/PHP, AED/PHP rates
    ├── gold-api.com     → XAU/USD spot price
    └── newsdata.io      → News + sentiment scoring
```

- **Frontend** — React 18 + Vite + Tailwind CSS → deployed as static files on Cloudflare Pages
- **Backend** — Express 5 + Node.js 20 → deployed on Render (free tier, Singapore region)
- **No database** — all data is fetched live from free public APIs

---

## Local Development

### Prerequisites
- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/HirokiShinsei/forexiq.git
cd forexiq
npm install

# Copy env template and fill in your values
cp .env.example .env
# Edit .env — at minimum set NEWSDATA_API_KEY
```

### Run dev server

```bash
npm run dev
```

Opens at http://localhost:5000 — Vite proxies `/api` requests to Express.

---

## Production Deployment

Two services to deploy. Do them in this order:

### 1. Deploy Backend → Render

**What it is:** A static build is NOT enough — the backend is a live Node.js server that
fetches forex data, calculates signals, and serves JSON to the frontend.

**Steps:**

1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub account → select `HirokiShinsei/forexiq`
3. Render detects `render.yaml` automatically and pre-fills:
   - **Name:** `forexiq-api`
   - **Region:** Singapore
   - **Build command:** `npm ci && npm run build`
   - **Start command:** `node dist/index.cjs`
   - **Plan:** Free
4. Add **Environment Variables** (click "Add Environment Variable" for each):

   | Key | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | |
   | `ALLOWED_ORIGIN` | `https://forexiq.pages.dev` | Your Cloudflare Pages URL — set AFTER step 2 below |
   | `ALLOWED_ORIGIN_2` | `https://yourdomain.com` | Only if you add a custom domain |
   | `NEWSDATA_API_KEY` | `pub_...` | From [newsdata.io](https://newsdata.io) dashboard |

5. Click **Create Web Service**
6. Wait ~3 minutes for the first deploy
7. Copy your Render URL: e.g. `https://forexiq-api.onrender.com`

> **Keep-alive:** The server self-pings `/health` every 10 minutes via `RENDER_EXTERNAL_URL`
> (auto-injected by Render), preventing the free-tier 15-minute spin-down.

---

### 2. Deploy Frontend → Cloudflare Pages

**What it is:** A **Static Pages deploy** — Cloudflare serves the pre-built HTML/CSS/JS files.
No Node.js runtime. No Cloudflare Workers. No wrangler deploy.

**Steps:**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages** → **Create a project**
2. Choose **Connect to Git** → select `HirokiShinsei/forexiq`
3. Set build configuration:

   | Setting | Value |
   |---|---|
   | **Production branch** | `main` |
   | **Build command** | `npm run build` |
   | **Build output directory** | `dist/public` |
   | **Root directory** | `/` (leave blank) |
   | **Node.js version** | `20` (set in Environment Variables) |

4. Add **Environment Variables** (under Settings → Environment Variables):

   | Key | Value | Environment |
   |---|---|---|
   | `NODE_VERSION` | `20` | Production + Preview |
   | `VITE_API_URL` | `https://forexiq-api.onrender.com` | Production |

   > `VITE_API_URL` tells the frontend where the Render backend is. It gets baked into the
   > JS bundle at build time. **Must be the exact Render URL from step 1.**

5. Click **Save and Deploy**
6. After deploy, copy the Pages URL: e.g. `https://forexiq.pages.dev`

7. **Go back to Render** and update `ALLOWED_ORIGIN` to your Pages URL:
   - Render Dashboard → forexiq-api → Environment → Edit `ALLOWED_ORIGIN`
   - Set to: `https://forexiq.pages.dev`
   - Render will auto-redeploy

> **No wrangler.toml in root:** The file was renamed to `wrangler.toml.workers-ref` to prevent
> Cloudflare Pages from running `wrangler deploy` (Workers mode). Pages detects `wrangler.toml`
> and tries to bundle the app as a Worker, which fails because the Express backend uses Node.js
> built-ins not available in the V8 isolate runtime.

---

### 3. GitHub Secrets (for CI/CD)

Go to: GitHub → repo → Settings → Secrets → Actions → New repository secret

| Secret | Value | Used by |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Create at Cloudflare → My Profile → API Tokens → "Edit Cloudflare Workers" template (scopes: `Cloudflare Pages: Edit`) | GitHub Actions → Cloudflare Pages deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → right sidebar (32-char hex) | GitHub Actions → Cloudflare Pages deploy |
| `VITE_API_URL` | `https://forexiq-api.onrender.com` | Build step — bakes API URL into frontend bundle |
| `RENDER_SERVICE_URL` | `https://forexiq-api.onrender.com` | Post-deploy health check step |

> Once these are set, every `git push` to `main` automatically:
> 1. Type-checks + builds the project
> 2. Deploys the static frontend to Cloudflare Pages
> 3. Pings the Render backend's `/health` to confirm it's up
> 4. Render auto-deploys the backend via its own GitHub integration

---

## CORS Configuration

The backend uses an explicit CORS allow-list. Only these origins can call `/api/*`:

- `http://localhost:5000` (local dev)
- `http://localhost:3000` (local dev alt)
- Value of `ALLOWED_ORIGIN` env var (your Cloudflare Pages URL)
- Value of `ALLOWED_ORIGIN_2` env var (optional custom domain)

All other origins receive `403 Forbidden`. Preflight `OPTIONS` requests are handled correctly.

---

## Environment Variables Reference

See `.env.example` for the complete reference with instructions for every variable.

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Health check — returns `{"status":"ok","ts":...}` |
| `GET /api/market/:symbol` | OHLC candles, indicators, signal, news for a symbol |
| `GET /api/news` | Global news feed with sentiment scores |
| `GET /api/search?q=...` | Search symbols + news by keyword |

**Supported symbols:** `EUR_PHP`, `USD_PHP`, `AED_PHP`, `XAU_USD`

---

## Free API Limits

| API | Limit | Key required |
|---|---|---|
| [Frankfurter](https://api.frankfurter.app) | Unlimited | No |
| [gold-api.com](https://gold-api.com) | ~100 req/day | No |
| [NewsData.io](https://newsdata.io) | 200 req/day | Yes (free) |

---

## Security

- **Helmet** — sets X-Frame-Options, CSP, HSTS, noSniff, referrer policy
- **CORS allow-list** — only your Pages URL can call the API
- **Rate limiting** — 60 req/min general, 20 req/5min on data endpoints
- **No tracking** — zero analytics, no Google Fonts, no external scripts
- **Env-var secrets** — API keys loaded from environment, never hardcoded
- **Body size cap** — 50kb max request body
- **Cloudflare Pages `_headers`** — CDN-level security headers on all static responses
