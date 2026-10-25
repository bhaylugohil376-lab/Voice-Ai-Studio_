/* VoiceAI adapter registry: shared endpoint contract for the 24 product sections.
 * Provider secrets remain server-side. Adapters never accept or store API keys in the browser.
 * A section is only marked live when its endpoint returns a successful response.
 */
(function (root) {
  "use strict";
  const definitions = [
    ["tts","Text to Speech","/api/tts","POST","elevenlabs"],
    ["voice-library","Voice Library","/api/voices","GET","elevenlabs"],
    ["voice-cloning","Voice Cloning","/api/clone","POST","elevenlabs"],
    ["voice-design","Voice Design","/api/voice-design","POST","elevenlabs"],
    ["voice-changer","Voice Changer","/api/voice-changer","POST","elevenlabs"],
    ["voice-isolator","Voice Isolator","/api/voice-isolator","POST","elevenlabs"],
    ["video-voice-transfer","Video Voice Transfer","/api/video-voice-transfer","POST","video-provider"],
    ["video-dubbing","Video Dubbing","/api/dubbing","POST","elevenlabs"],
    ["stt","Speech to Text","/api/stt","POST","openai-or-elevenlabs"],
    ["captions","Captions","/api/captions","POST","openai-or-elevenlabs"],
    ["music-generation","Music Generation","/api/music","POST","music-provider"],
    ["sound-effects","Sound Effects","/api/sound-effects","POST","elevenlabs"],
    ["image-generation","Image Generation","/api/image","POST","image-provider"],
    ["ai-assistant","AI Assistant","/api/assistant","POST","llm-provider"],
    ["dialogue","Dialogue","/api/dialogue","POST","llm-provider"],
    ["ai-agents","AI Agents","/api/agents","POST","llm-provider"],
    ["studio","Studio","/api/generate","POST","voiceai"],
    ["projects","Projects","/api/projects","GET","supabase"],
    ["favorites","Favorites","/api/favorites","GET","supabase"],
    ["profile","Profile","/api/profile","GET","supabase"],
    ["usage-limits","Usage Limits","/api/usage","GET","supabase"],
    ["subscription-billing","Subscription & Billing","/api/stripe-checkout","POST","stripe"],
    ["contact","Contact","/api/contact","POST","supabase"],
    ["login-signup","Login & Signup","/api/auth","POST","supabase-auth"]
  ];
  const adapters = Object.freeze(definitions.map(([id, name, endpoint, method, provider]) =>
    Object.freeze({ id, name, endpoint, method, provider })
  ));

  async function request(id, options) {
    const adapter = adapters.find((item) => item.id === id);
    if (!adapter) throw new Error("Unknown VoiceAI adapter: " + id);
    const opts = options && typeof options === "object" ? options : {};
    const session = root.supabaseClient && root.supabaseClient.auth
      ? await root.supabaseClient.auth.getSession()
      : null;
    const accessToken = session && session.data && session.data.session
      ? session.data.session.access_token : "";
    const headers = new Headers(opts.headers || {});
    if (accessToken) headers.set("Authorization", "Bearer " + accessToken);
    if (opts.body != null && !(opts.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await root.fetch(adapter.endpoint, {
      method: opts.method || adapter.method,
      headers,
      body: opts.body == null ? undefined :
        (typeof opts.body === "string" || opts.body instanceof FormData ? opts.body : JSON.stringify(opts.body)),
      signal: opts.signal
    });
    const type = response.headers.get("content-type") || "";
    if (!response.ok) {
      let message = "Request failed (" + response.status + ")";
      try {
        const detail = type.includes("json") ? await response.json() : await response.text();
        message = detail && (detail.error || detail.message) || message;
      } catch (_) {}
      throw new Error(message);
    }
    return type.includes("json") ? response.json() : response;
  }

  root.VoiceAIAdapters = Object.freeze({
    list: () => adapters.slice(),
    get: (id) => adapters.find((item) => item.id === id) || null,
    request
  });
})(window);
