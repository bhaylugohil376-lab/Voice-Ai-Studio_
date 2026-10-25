import { requireUser } from "./_lib/auth.js";
import { checkAndUseAI } from "./_lib/usage.js";
import { requireMethod, sendError } from "./_lib/response.js";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MIME_TYPES = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a", "audio/webm", "audio/ogg", "audio/flac"]);

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return sendError(res, 503, "Voice changer provider is not configured.");
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const voiceId = typeof body.voice_id === "string" ? body.voice_id.trim() : "";
    const encoded = typeof body.audio_base64 === "string" ? body.audio_base64.replace(/^data:[^;]+;base64,/, "") : "";
    const mimeType = typeof body.mime_type === "string" ? body.mime_type.toLowerCase().trim() : "audio/mpeg";
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(voiceId)) return sendError(res, 400, "A valid voice_id is required.");
    if (!encoded || encoded.length > Math.ceil(MAX_AUDIO_BYTES * 4 / 3) + 16) return sendError(res, 400, "Provide audio_base64 no larger than 20 MB.");
    if (!MIME_TYPES.has(mimeType)) return sendError(res, 400, "Unsupported audio MIME type.");
    const audio = Buffer.from(encoded, "base64");
    if (!audio.length || audio.length > MAX_AUDIO_BYTES) return sendError(res, 400, "Audio file is empty or exceeds the 20 MB limit.");
    const usage = await checkAndUseAI(user, "voice_changer");
    if (!usage.allowed) return sendError(res, usage.status || 503, usage.error || "Unable to verify AI usage.");
    const form = new FormData();
    form.append("audio", new Blob([audio], { type: mimeType }), mimeType.includes("wav") ? "input.wav" : "input-audio");
    const upstream = await fetch("https://api.elevenlabs.io/v1/voice-changer/" + encodeURIComponent(voiceId), {
      method: "POST", headers: { "xi-api-key": apiKey, Accept: "audio/mpeg" }, body: form, signal: AbortSignal.timeout(60000)
    });
    if (!upstream.ok) {
      const details = await upstream.text();
      console.error("ElevenLabs voice changer error:", upstream.status, details.slice(0, 800));
      return sendError(res, upstream.status === 429 ? 429 : 502, upstream.status === 429 ? "ElevenLabs quota or rate limit reached." : "Voice conversion failed at the provider.");
    }
    const output = Buffer.from(await upstream.arrayBuffer());
    if (!output.length) return sendError(res, 502, "The provider returned empty audio.");
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Content-Length", String(output.length));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(output);
  } catch (error) {
    console.error("Voice changer API error:", error?.message || error);
    return sendError(res, 502, "Voice changer service failed. Check the audio input and try again.");
  }
}
