(function () {
  "use strict";

  // GitHub Pages is static hosting; route supported VoiceAI endpoints to Supabase Edge Functions.
  if (window.__VOICEAI_API_FETCH_PATCHED__) return;

  const supabaseFunctions = "https://axeqcbavupmpijhaaite.supabase.co/functions/v1";
  const supabasePublishableKey = "sb_publishable_ktNCPoHwVtaMYfKTHTEODA_qEDo-8pp";
  const originalFetch = window.fetch.bind(window);

  function rewriteApiUrl(rawUrl) {
    const url = new URL(rawUrl, window.location.href);
    if (url.origin !== window.location.origin) return rawUrl;

    const path = url.pathname.replace(/\/$/, "");
    const routes = {
      "/api/voices": "/voiceai-voices",
      "/api/tts": "/voiceai-tts",
      "/api/voice-design": "/voiceai-tts",
      "/api/health": "/voiceai-health",
      "/api/voice-changer": "/voiceai-voice-changer",
      "/api/voice-isolator": "/voiceai-voice-isolator",
      "/api/voice-clone": "/voiceai-clone"
    };
    if (routes[path]) {
      return supabaseFunctions + routes[path] + url.search + url.hash;
    }
    return rawUrl;
  }

  function withSupabaseKey(initHeaders, requestHeaders) {
    const headers = new Headers(requestHeaders || undefined);
    if (initHeaders) new Headers(initHeaders).forEach((value, key) => headers.set(key, value));
    if (!headers.has("apikey")) headers.set("apikey", supabasePublishableKey);
    return headers;
  }

  window.fetch = function (input, init) {
    if (typeof input === "string" || input instanceof URL) {
      const raw = String(input);
      const target = rewriteApiUrl(raw);
      if (target !== raw) return originalFetch(target, { ...(init || {}), headers: withSupabaseKey(init && init.headers) });
    }
    if (input instanceof Request) {
      const target = rewriteApiUrl(input.url);
      if (target !== input.url) return originalFetch(target, { ...(init || {}), headers: withSupabaseKey(init && init.headers, input.headers) });
    }
    return originalFetch(input, init);
  };

  window.__VOICEAI_API_FETCH_PATCHED__ = true;
})();