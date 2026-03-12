import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import https from "https";

// ──────────────────────────────────────────────
// CORS allow-list — built once at startup
//
// Hardcoded defaults cover the known deployments.
// ALLOWED_ORIGIN / ALLOWED_ORIGIN_2 env vars let
// you add extra origins (custom domains, previews)
// without changing code.
// ──────────────────────────────────────────────
function getAllowedOrigins(): string[] {
  const origins: string[] = [
    // Local development
    "http://localhost:5000",
    "http://localhost:3000",
    "http://127.0.0.1:5000",
    // Production frontend — Cloudflare Pages
    "https://forexiq.pages.dev",
  ];
  // Extra origins from env (custom domain, preview deploys, etc.)
  if (process.env.ALLOWED_ORIGIN)   origins.push(process.env.ALLOWED_ORIGIN.trim());
  if (process.env.ALLOWED_ORIGIN_2) origins.push(process.env.ALLOWED_ORIGIN_2.trim());
  return origins;
}
const ALLOWED_ORIGINS = getAllowedOrigins();

// Log allowed origins at startup so it's visible in Render logs
console.log("[cors] allowed origins:", ALLOWED_ORIGINS);

// Reusable CORS middleware — attached BEFORE Helmet, rate-limiters, and routes
function applyCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin as string | undefined;
  const originAllowed = Boolean(origin && ALLOWED_ORIGINS.includes(origin));

  if (originAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin!);
    res.setHeader("Vary", "Origin");            // tell caches this response varies by Origin
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "false");
  }

  // Preflight — only short-circuit for OPTIONS; always set Max-Age if origin matched
  if (req.method === "OPTIONS") {
    if (originAllowed) {
      res.setHeader("Access-Control-Max-Age", "86400");
    }
    return res.sendStatus(204);
  }

  next();
}

const app = express();
const httpServer = createServer(app);

// ──────────────────────────────────────────────
// Trust proxy — required on Render (and any platform
// behind a reverse proxy) so that express-rate-limit
// can read the real client IP from X-Forwarded-For.
// Without this, express-rate-limit throws
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on every request.
// ──────────────────────────────────────────────
app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ──────────────────────────────────────────────
// Middleware order matters:
//   1. CORS  (must run first — before Helmet can strip headers)
//   2. Helmet (security headers)
//   3. Rate limiting
//   4. Body parsing
//   5. Routes
// ──────────────────────────────────────────────

// 1. CORS — applied globally so it runs before everything else.
//    The handler only sets headers for origins in ALLOWED_ORIGINS;
//    all other requests pass through without CORS headers.
app.use("/api/", applyCors);
app.options("/api/*path", applyCors); // explicit OPTIONS catch-all (Express 5: named wildcard required)

// 2. Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: [
          "'self'",
          "https://api.frankfurter.app",
          "https://gold-api.com",
          "https://newsdata.io",
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: process.env.NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    noSniff: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    xssFilter: true,
    referrerPolicy: { policy: "no-referrer" },
    permittedCrossDomainPolicies: false,
    // CRITICAL: crossOriginResourcePolicy must be disabled for API routes.
    // The default 'same-origin' policy causes Helmet to send
    // Cross-Origin-Resource-Policy: same-origin on API responses, which
    // makes Chrome/Firefox ignore our Access-Control-Allow-Origin header.
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false, // needed for LW Charts canvas
    crossOriginOpenerPolicy: false,
  })
);

// ──────────────────────────────────────────────
// Rate Limiting — prevent API abuse / scraping
// ──────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,     // 1 minute window
  max: 60,                  // max 60 API requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please wait before retrying." },
  skip: () => process.env.NODE_ENV === "development",
});

const newsFetchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute window
  max: 20,                  // max 20 /api/market or /api/news calls per 5 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit reached — try again in a few minutes." },
  skip: () => process.env.NODE_ENV === "development",
});

app.use("/api/", apiLimiter);
app.use("/api/market", newsFetchLimiter);
app.use("/api/news", newsFetchLimiter);
app.use("/api/search", newsFetchLimiter);

// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
// Body Parsing
// ──────────────────────────────────────────────
app.use(
  express.json({
    limit: "50kb",  // reject oversized bodies
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "50kb" }));

// ──────────────────────────────────────────────
// Logging (development only — no PII in production)
// ──────────────────────────────────────────────
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Only log method, path, status — no body content logged in production
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

// ──────────────────────────────────────────────
// Routes + Server
// ──────────────────────────────────────────────
(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    // Never leak internal error details in production
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : (err.message || "Internal Server Error");

    if (process.env.NODE_ENV !== "production") {
      console.error("Internal Server Error:", err);
    }

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      startKeepAlive();
    },
  );
})();

// ──────────────────────────────────────────────
// Render Free Tier Keep-Alive
// Render spins down free services after 15 min of
// inactivity. RENDER_EXTERNAL_URL is automatically
// injected by Render — so this only activates there.
// Pings /health every 10 min to prevent spin-down.
// ──────────────────────────────────────────────
function startKeepAlive() {
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (!renderUrl) return; // not on Render — skip

  const healthUrl = `${renderUrl}/health`;
  log(`Keep-alive active → pinging ${healthUrl} every 10 min`);

  setInterval(() => {
    const req = https.get(healthUrl, (res) => {
      log(`Keep-alive ping → ${res.statusCode}`);
      res.resume(); // drain the response body
    });
    req.on("error", (err) => {
      // Non-fatal — just log, don't crash the server
      log(`Keep-alive ping failed: ${err.message}`);
    });
    req.setTimeout(10_000, () => {
      req.destroy();
      log("Keep-alive ping timed out");
    });
  }, 10 * 60 * 1000); // 10 minutes
}
