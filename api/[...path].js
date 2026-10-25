import handler0 from "../server/api/agents.js";
import handler1 from "../server/api/agents/chat.js";
import handler2 from "../server/api/agents/deploy.js";
import handler3 from "../server/api/agents/test.js";
import handler4 from "../server/api/assistant.js";
import handler5 from "../server/api/captions.js";
import handler6 from "../server/api/contact.js";
import handler7 from "../server/api/dubbing-status.js";
import handler8 from "../server/api/dubbing.js";
import handler9 from "../server/api/favorites.js";
import handler10 from "../server/api/generate.js";
import handler11 from "../server/api/generations.js";
import handler12 from "../server/api/health.js";
import handler13 from "../server/api/image/generate.js";
import handler14 from "../server/api/music.js";
import handler15 from "../server/api/music/save.js";
import handler16 from "../server/api/profile.js";
import handler17 from "../server/api/projects.js";
import handler18 from "../server/api/sound-effects.js";
import handler19 from "../server/api/stripe-checkout.js";
import handler20 from "../server/api/stripe-portal.js";
import handler21 from "../server/api/stripe-webhook.js";
import handler22 from "../server/api/stt.js";
import handler23 from "../server/api/studio.js";
import handler24 from "../server/api/tts.js";
import handler25 from "../server/api/usage.js";
import handler26 from "../server/api/video-voice-transfer.js";
import handler27 from "../server/api/voice-changer.js";
import handler28 from "../server/api/voice-clone.js";
import handler29 from "../server/api/voice-design.js";
import handler30 from "../server/api/voice-isolator.js";
import handler31 from "../server/api/voices.js";
import handler32 from "../server/api/voices-sync.js";

export const config = { api: { bodyParser: false } };
const handlers = {
  "agents": handler0, "agents/chat": handler1, "agents/deploy": handler2, "agents/test": handler3,
  "assistant": handler4, "captions": handler5, "contact": handler6, "dubbing-status": handler7,
  "dubbing": handler8, "favorites": handler9, "generate": handler10, "generations": handler11,
  "health": handler12, "image/generate": handler13, "music": handler14, "music/save": handler15,
  "profile": handler16, "projects": handler17, "sound-effects": handler18, "stripe-checkout": handler19,
  "stripe-portal": handler20, "stripe-webhook": handler21, "stt": handler22, "studio": handler23,
  "tts": handler24, "usage": handler25, "video-voice-transfer": handler26, "voice-changer": handler27,
  "voice-clone": handler28, "voice-design": handler29, "voice-isolator": handler30, "voices": handler31,
  "voices/sync": handler32
};

async function readRawBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limit) { const error = new Error("Request body is too large."); error.statusCode = 413; throw error; }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
function parseUrlEncoded(buffer) {
  const params = new URLSearchParams(buffer.toString("utf8"));
  const result = {};
  for (const [key, value] of params) {
    if (Object.prototype.hasOwnProperty.call(result, key)) result[key] = Array.isArray(result[key]) ? [...result[key], value] : [result[key], value];
    else result[key] = value;
  }
  return result;
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const origin = req.headers?.origin;
  const allowedOrigins = new Set(["https://bhaylugohil376-lab.github.io", "http://localhost:3000", "http://127.0.0.1:3000"]);
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  const pathname = new URL(req.url || "/", "https://voiceai.invalid").pathname;
  const route = pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
  const selected = handlers[route];
  if (!route || !selected) return res.status(404).json({ success: false, error: "API route not found." });
  try {
    const contentType = String(req.headers?.["content-type"] || "").toLowerCase();
    if (route === "stripe-webhook") {
      if (!Buffer.isBuffer(req.body)) req.body = await readRawBody(req, 2 * 1024 * 1024);
    } else if (contentType.includes("application/json") || contentType.includes("application/x-www-form-urlencoded")) {
      if (req.body === undefined || Buffer.isBuffer(req.body) || typeof req.body === "string") {
        let raw = req.body;
        if (raw === undefined) raw = await readRawBody(req, 10 * 1024 * 1024);
        if (typeof raw === "string") raw = Buffer.from(raw);
        if (Buffer.isBuffer(raw)) {
          if (contentType.includes("application/json")) {
            const text = raw.toString("utf8").trim();
            if (!text) req.body = {};
            else { try { req.body = JSON.parse(text); } catch { return res.status(400).json({ success: false, error: "Invalid JSON request body." }); } }
          } else req.body = parseUrlEncoded(raw);
        }
      }
    }
    return await selected(req, res);
  } catch (error) {
    if (res.headersSent) return;
    const status = error?.statusCode === 413 ? 413 : 500;
    console.error("VoiceAI API dispatcher error:", error?.message || error);
    return res.status(status).json({ success: false, error: status === 413 ? "Request body is too large." : "API request failed." });
  }
}
