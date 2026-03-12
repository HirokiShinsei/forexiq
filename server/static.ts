import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // On Render (API-only), the frontend is served by Cloudflare Pages.
  // dist/public/ does not exist on Render — and that's intentional.
  // We skip static serving gracefully instead of throwing.
  //
  // __dirname in a CJS esbuild bundle resolves to the directory of
  // dist/index.cjs, so path.resolve(__dirname, "public") = dist/public.
  // On Render this directory doesn't exist, so we return early.
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    // API-only mode: frontend is hosted externally (Cloudflare Pages).
    // Return a 404 for any non-API route rather than crashing.
    app.use("/{*path}", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.status(404).json({
          error: "This is an API-only server. The frontend is at https://forexiq.pages.dev",
        });
      }
    });
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
