/**
 * build-server.ts
 *
 * Server-only build for Render deployment.
 * Runs esbuild to compile server/index.ts → dist/index.cjs
 * WITHOUT running Vite (the frontend is built by GitHub Actions
 * and deployed to Cloudflare Pages — Render only needs the backend).
 *
 * Used by render.yaml buildCommand:
 *   npm ci --include=dev && npm run build:server
 */
import { build as esbuild } from "esbuild";
import { rm, readFile, mkdir } from "fs/promises";

// Packages bundled into dist/index.cjs to reduce cold-start syscalls.
// Everything NOT in this list is treated as external (must be in node_modules).
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildServer() {
  // Clean only the server output, not the full dist (in case someone runs
  // this after a full build locally — though on Render dist is empty anyway)
  await rm("dist/index.cjs", { force: true });
  // Ensure dist/ directory exists
  await mkdir("dist", { recursive: true });

  console.log("building server (API-only, no frontend)...");

  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    // Keep minify OFF so any future runtime errors produce readable stack traces
    minify: false,
    external: externals,
    logLevel: "info",
  });

  console.log("server build complete → dist/index.cjs");
}

buildServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
