import { sendError, requireMethod, parseJsonBody } from "./_lib/response.js";

const MAX_TEXT_LENGTH = 2000;
const FREE_ANONYMOUS_TEXT_LIMIT = 500;

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  try {
    const body = parseJsonBody(req);
    if (!body || typeof body !== "object") return sendError(res, 400, "Invalid JSON request body.");

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voiceId = typeof body.voice_id === "string" ? body.voice_id.trim() : "";
    const modelId = typeof body.model_id === "string" && body.model_id.trim() ? body.model_id.trim() : "eleven_multilingual_v2";
    const outputFormat = typeof body.output_format === "string" && body.output_format.trim() ? body.output_format.trim() : "mp3_44100_128";
    const allowedOutputFormats = new Set(["mp3_44100_128", "mp3_22050_32", "pcm_16000", "pcm_22050", "pcm_24000", "pcm_44100"]);
    if (!text) return sendError(res, 400, "Text is required.");
    if (text.length > MAX_TEXT_LENGTH) return sendError(res, 400, `Text must be ${MAX_TEXT_LENGTH} characters or fewer.`);
    if (body.provider === "ttsai" && !process.env.TTS_AI_API_KEY && text.length > FREE_ANONYMOUS_TEXT_LIMIT) {
      return sendError(res, 400, `Anonymous Free TTS supports up to ${FREE_ANONYMOUS_TEXT_LIMIT} characters per request. To generate up to ${MAX_TEXT_LENGTH} characters, configure TTS_AI_API_KEY in the server environment (a free TTS.ai account supports up to 5,000 characters per request).`);
    }
    if (!voiceId || !/^[a-zA-Z0-9_-]{1,100}$/.test(voiceId)) return sendError(res, 400, "A valid voice_id is required.");

    // Free TTS.ai provider: does not depend on ElevenLabs credentials or credits.
    if (body.provider === "ttsai") {
      const freeModels = new Set(["kokoro", "piper", "vits", "melotts"]);
      const freeModel = typeof body.model_id === "string" && freeModels.has(body.model_id) ? body.model_id : "kokoro";
      const languageMap = { hindi: "hi", gujarati: "gu", english: "en" };
      const language = languageMap[body.language] || (typeof body.language === "string" && /^[a-z]{2,3}$/.test(body.language) ? body.language : "");
      const ttsHeaders = { "Content-Type": "application/json", Accept: "application/json" };
      if (process.env.TTS_AI_API_KEY) ttsHeaders.Authorization = "Bearer " + process.env.TTS_AI_API_KEY;
      // Free testing bypasses the app subscription/credit counter. The provider applies its own anonymous free-tier limits.
      try {
        const submit = await fetch("https://api.tts.ai/v1/tts/", {
          method: "POST",
          headers: ttsHeaders,
          body: JSON.stringify({ model: freeModel, text, voice: voiceId, format: "mp3", ...(language ? { language } : {}) }),
          signal: AbortSignal.timeout(30000)
        });
        const job = await submit.json().catch(() => ({}));
        if (!submit.ok || !job.uuid) {
          console.error("TTS.ai submit error:", submit.status, JSON.stringify(job).slice(0, 1000));
          return sendError(res, submit.status === 429 ? 429 : 502, job.error || job.message || "Free TTS provider could not accept this request.");
        }
        let result = null;
        for (let attempt = 0; attempt < 24; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const poll = await fetch("https://api.tts.ai/v1/speech/results/?uuid=" + encodeURIComponent(job.uuid), {
            headers: process.env.TTS_AI_API_KEY ? { Authorization: "Bearer " + process.env.TTS_AI_API_KEY, Accept: "application/json" } : { Accept: "application/json" },
            signal: AbortSignal.timeout(15000)
          });
          result = await poll.json().catch(() => ({}));
          if (!poll.ok) return sendError(res, 502, result.error || "Could not check free TTS generation status.");
          if (result.status === "completed" && result.result_url) break;
          if (result.status === "failed") return sendError(res, 502, result.error || "Free TTS generation failed.");
          result = null;
        }
        if (!result?.result_url) return sendError(res, 504, "Free TTS generation timed out. Please try again.");
        const audioResponse = await fetch(result.result_url, { signal: AbortSignal.timeout(30000) });
        if (!audioResponse.ok) return sendError(res, 502, "Could not download generated audio from free TTS provider.");
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        if (!audioBuffer.length) return sendError(res, 502, "Free TTS provider returned empty audio.");
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", String(audioBuffer.length));
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.status(200).send(audioBuffer);
      } catch (error) {
        console.error("TTS.ai generation error:", error?.message || error);
        return sendError(res, 502, "Free TTS service failed. Please try again.");
      }
    }
    const allowedModels = new Set(["eleven_multilingual_v2", "eleven_flash_v2_5", "eleven_turbo_v2_5"]);
    if (!allowedModels.has(modelId)) return sendError(res, 400, "Unsupported TTS model.");
    if (!allowedOutputFormats.has(outputFormat)) return sendError(res, 400, "Unsupported audio output format.");

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return sendError(res, 503, "Text-to-Speech provider is not configured.");

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
      let providerCode = "";
      let providerMessage = "";
      try {
        const payload = JSON.parse(details);
        const detail = payload.detail || payload.error || payload.message || {};
        if (typeof detail === "string") providerMessage = detail;
        else {
          providerCode = String(detail.status || detail.code || "");
          providerMessage = String(detail.message || detail.detail || "");
        }
      } catch {
        providerMessage = details;
      }
      const diagnostic = (providerCode + " " + providerMessage).toLowerCase();
      if (response.status === 429 || /insufficient[_ ]credits|quota_exceeded|credit.*(limit|insufficient)|rate.?limit/.test(diagnostic)) {
        return sendError(res, 429, /insufficient[_ ]credits|quota_exceeded|credit.*(limit|insufficient)/.test(diagnostic)
          ? "ElevenLabs credits are insufficient for this request. Switch to Free TTS or check your ElevenLabs plan quota."
          : "ElevenLabs rate limit reached. Please wait and try again.");
      }
      if (response.status === 401 || response.status === 403 || /subscription_required|feature_not_available|plan.*(required|access)|permission_denied/.test(diagnostic)) {
        return sendError(res, 403, "ElevenLabs API key or plan does not have access to this feature. Check your ElevenLabs account and API key, or switch to Free TTS.");
      }
      return sendError(res, 502, "ElevenLabs speech generation failed. Check provider access and try again.");
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
