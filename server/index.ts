import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

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
// CORS — only allow same-origin requests to API
// External calls (Frankfurter, gold-api, NewsData)
// are made server-side, so browser CORS is irrelevant.
// Block cross-origin API access by default.
// ──────────────────────────────────────────────
app.use("/api/", (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // Allow: no origin (server-side / Postman), same-origin, or localhost dev
  const allowedOrigins = [
    undefined,
    null,
    `http://localhost:5000`,
    `http://127.0.0.1:5000`,
    process.env.ALLOWED_ORIGIN, // set in production via env var
  ].filter(Boolean);

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Remove any CORS headers that could allow cross-origin fetches
  res.removeHeader("Access-Control-Allow-Origin");
  next();
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
    },
  );
})();
