export async function transferVideoVoice({ videoUrl, audioUrl, apiUrl, apiKey }) {
  if (!apiUrl || !apiKey) throw new Error("Video voice transfer provider is not configured.");
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ video_url: videoUrl, audio_url: audioUrl }),
    signal: AbortSignal.timeout(90000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Provider request failed (${response.status}).`);
  return data;
}
