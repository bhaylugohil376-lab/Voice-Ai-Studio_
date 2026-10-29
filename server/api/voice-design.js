import { requireUser } from "./_lib/auth.js";
import { checkAndUseAI } from "./_lib/usage.js";
import { requireMethod, sendError } from "./_lib/response.js";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return sendError(res, 503, "Voice Design provider is not configured. Add ELEVENLABS_API_KEY to the server environment.");

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const description = typeof body.description === "string" ? body.description.trim() : typeof body.prompt === "string" ? body.prompt.trim() : "";
    const previewText = typeof body.preview_text === "string" ? body.preview_text.trim() : "";
    if (!description || description.length > 1000) return sendError(res, 400, "Voice description is required and must be 1,000 characters or fewer.");
    if (!previewText || previewText.length > 1000) return sendError(res, 400, "Preview text must be between 1 and 1,000 characters.");

    const usage = await checkAndUseAI(user, "voice_design");
    if (!usage.allowed) return sendError(res, usage.status || 429, usage.error || "Voice Design usage limit reached.");

    // The official Text-to-Voice preview endpoint returns temporary audio previews.
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-voice/preview`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ voice_description: description, text: previewText }),
      signal: AbortSignal.timeout(60000)
    });

    const raw = await response.text();
    let result = {};
    try { result = raw ? JSON.parse(raw) : {}; } catch { result = {}; }
    if (!response.ok) {
      const detail = result.detail || result.error || result.message;
      const message = typeof detail === "string" ? detail : detail?.message || "Voice provider rejected the preview request.";
      console.error("Voice Design provider error:", response.status, message);
      if (response.status === 401 || response.status === 403) return sendError(res, 403, "Voice provider key or account does not have access to Voice Design previews.");
      if (response.status === 429) return sendError(res, 429, "Voice provider quota or rate limit reached. Check your plan and try again later.");
      return sendError(res, 502, message.slice(0, 400));
    }

    const previews = Array.isArray(result.previews) ? result.previews
      .filter(p => p && typeof p.audio_base64 === "string" && p.audio_base64.length > 0)
      .map(p => ({
        generated_voice_id: p.generated_voice_id || null,
        audio_base64: p.audio_base64,
        media_type: p.media_type || "audio/mpeg",
        duration_secs: p.duration_secs ?? null
      })) : [];
    if (!previews.length) return sendError(res, 502, "The provider returned no playable voice previews.");

    return res.status(200).json({
      success: true,
      previews,
      message: "Voice preview generated. This is a temporary preview; it does not save or clone a voice.",
      remaining: usage.remaining
    });
  } catch (error) {
    console.error("Voice Design API error:", error?.message || error);
    return sendError(res, 500, "Unexpected Voice Design error. Please try again.");
  }
}
