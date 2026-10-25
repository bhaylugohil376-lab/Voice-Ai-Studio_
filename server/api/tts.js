import { requireAuth } from "./_lib/auth.js";
import { checkAndUseAI } from "./_lib/usage.js";
import { sendError, requireMethod, parseJsonBody } from "./_lib/response.js";

const MAX_TEXT_LENGTH = 5000;

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const body = parseJsonBody(req);
    if (!body || typeof body !== "object") return sendError(res, 400, "Invalid JSON request body.");

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voiceId = typeof body.voice_id === "string" ? body.voice_id.trim() : "";
    const modelId = typeof body.model_id === "string" && body.model_id.trim() ? body.model_id.trim() : "eleven_multilingual_v2";
    const outputFormat = typeof body.output_format === "string" && body.output_format.trim() ? body.output_format.trim() : "mp3_44100_128";
    const allowedOutputFormats = new Set(["mp3_44100_128", "mp3_22050_32", "pcm_16000", "pcm_22050", "pcm_24000", "pcm_44100"]);
    if (!text) return sendError(res, 400, "Text is required.");
    if (text.length > MAX_TEXT_LENGTH) return sendError(res, 400, `Text must be ${MAX_TEXT_LENGTH} characters or fewer.`);
    if (!voiceId || !/^[a-zA-Z0-9_-]{1,100}$/.test(voiceId)) return sendError(res, 400, "A valid voice_id is required.");
    const allowedModels = new Set(["eleven_multilingual_v2", "eleven_flash_v2_5", "eleven_turbo_v2_5"]);
    if (!allowedModels.has(modelId)) return sendError(res, 400, "Unsupported TTS model.");
    if (!allowedOutputFormats.has(outputFormat)) return sendError(res, 400, "Unsupported audio output format.");

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return sendError(res, 503, "Text-to-Speech provider is not configured.");
    const usage = await checkAndUseAI(user, "tts");
    if (!usage.allowed) return sendError(res, usage.status || 503, usage.error || "Unable to verify AI usage.");

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: outputFormat.startsWith("pcm_") ? "audio/pcm" : "audio/mpeg"
      },
      body: JSON.stringify({ text, model_id: modelId }),
      signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) {
      const details = await response.text();
      console.error("ElevenLabs TTS error:", response.status, details.slice(0, 1000));
      return sendError(res, response.status === 429 ? 429 : 502, response.status === 429 ? "ElevenLabs quota or rate limit reached." : "Text-to-Speech generation failed.");
    }
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    if (!audioBuffer.length) return sendError(res, 502, "The provider returned empty audio.");
    res.setHeader("Content-Type", outputFormat.startsWith("pcm_") ? "audio/pcm" : "audio/mpeg");
    res.setHeader("Content-Length", String(audioBuffer.length));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(audioBuffer);
  } catch (error) {
    console.error("TTS endpoint error:", error?.message || error);
    return sendError(res, 502, "Text-to-Speech service failed. Please try again.");
  }
}
