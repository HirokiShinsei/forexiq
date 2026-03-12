import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import https from "https";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ──────────────────────────────────────────────
// Security Headers (Helmet)
// ──────────────────────────────────────────────
app.use(
  helmet({
    // Content Security Policy — only allow resources from self + known CDNs
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // needed for Vite HMR in dev + inlined chunks
        styleSrc: ["'self'", "'unsafe-inline'"],  // needed for Tailwind inline styles
        fontSrc: ["'self'", "data:"],              // no Google Fonts — system fonts only
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
    // Force HTTPS in production
    hsts: process.env.NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    // Prevent MIME type sniffing
    noSniff: true,
    // Prevent clickjacking
    frameguard: { action: "deny" },
    // Hide Express fingerprint
    hidePoweredBy: true,
    // XSS filter
    xssFilter: true,
    // Referrer policy — don't leak URL to external requests
    referrerPolicy: { policy: "no-referrer" },
    // Permissions policy — deny access to sensitive browser APIs
    permittedCrossDomainPolicies: false,
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
// CORS — allow Cloudflare Pages frontend to call
// this Render backend. All API fetches are made
// server-side to external APIs (no browser CORS
// needed for those), but the frontend→backend
// calls DO cross origins and need explicit CORS.
// ──────────────────────────────────────────────

// Build the allowed origins list from env + dev defaults
function getAllowedOrigins(): string[] {
  const origins: string[] = [
    "http://localhost:5000",
    "http://localhost:3000",
    "http://127.0.0.1:5000",
  ];

  // ALLOWED_ORIGIN: primary production origin (Cloudflare Pages URL)
  // e.g. https://forexiq.pages.dev  OR  https://yourdomain.com
  if (process.env.ALLOWED_ORIGIN) {
    origins.push(process.env.ALLOWED_ORIGIN);
  }

  // ALLOWED_ORIGIN_2: optional second origin (custom domain on Pages)
  if (process.env.ALLOWED_ORIGIN_2) {
    origins.push(process.env.ALLOWED_ORIGIN_2);
  }

  return origins;
}

app.use("/api/", (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  // Preflight — respond immediately with CORS headers
  if (req.method === "OPTIONS") {
    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Max-Age", "86400");
    }
    return res.sendStatus(204);
  }

  // Actual request — set CORS header if origin is allowed
  if (!origin) {
    // Server-to-server / Postman / health checks — no origin header, allow
    return next();
  }

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    return next();
  }

  // Unknown origin — reject
  return res.status(403).json({ error: "Forbidden" });
});

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
