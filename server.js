import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  next();
});
const port = process.env.PORT || 3000;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(ROOT, "server", "api");
app.post("/api/stripe-webhook", express.raw({ type: "application/json", limit: "2mb" }), async (req, res) => {
  try {
    const { default: handler } = await import("./server/api/stripe-webhook.js");
    return await handler(req, res);
  } catch (error) {
    console.error("Stripe webhook error:", error);
    if (!res.headersSent) return res.status(500).json({ success: false, error: "Stripe webhook processing failed." });
  }
});
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.all("/api/*", async (req, res) => {
  const requestedPath = (req.path || "").replace(/^\/api\/?/, "");
  const segments = requestedPath.split("/").filter(Boolean);
  if (!segments.length || segments.some(s => s.startsWith(".") || s.includes("\\"))) return res.status(404).json({ success: false, error: "API route not found." });
  const handlerPath = path.resolve(API_DIR, ...segments) + ".js";
  if (!handlerPath.startsWith(API_DIR + path.sep)) return res.status(404).json({ success: false, error: "API route not found." });
  try { await fs.promises.access(handlerPath, fs.constants.R_OK); }
  catch { return res.status(404).json({ success: false, error: "API route not found." }); }
  try {
    const { default: handler } = await import(pathToFileURL(handlerPath).href);
    if (typeof handler !== "function") return res.status(500).json({ success: false, error: "API handler is invalid." });
    return await handler(req, res);
  } catch (error) {
    console.error(`API handler failed for ${req.method} ${req.path}:`, error);
    if (!res.headersSent) return res.status(500).json({ success: false, error: "API request failed." });
  }
});
app.use(express.static(ROOT, { extensions: ["html"] }));
app.get("*", (req, res) => res.sendFile(path.join(ROOT, "index.html")));
app.listen(port, () => console.log(`VoiceAI server running on port ${port}`));
export default app;