(function () {
  "use strict";

  // GitHub Pages is static hosting; route supported VoiceAI endpoints to Supabase Edge Functions.
  if (window.__VOICEAI_API_FETCH_PATCHED__) return;

  const supabaseFunctions = "https://axeqcbavupmpijhaaite.supabase.co/functions/v1";
  const originalFetch = window.fetch.bind(window);

  function rewriteApiUrl(rawUrl) {
    const url = new URL(rawUrl, window.location.href);
    if (url.origin !== window.location.origin) return rawUrl;

    const path = url.pathname.replace(/\/$/, "");
    const routes = {
      "/api/voices": "/voiceai-voices",
      "/api/tts": "/voiceai-tts",
      "/api/health": "/voiceai-health"
    };
    if (routes[path]) {
      return supabaseFunctions + routes[path] + url.search + url.hash;
    }
    return rawUrl;
  }

  window.fetch = function (input, init) {
    if (typeof input === "string" || input instanceof URL) {
      return originalFetch(rewriteApiUrl(String(input)), init);
    }
    if (input instanceof Request) {
      const target = rewriteApiUrl(input.url);
      if (target !== input.url) return originalFetch(new Request(target, input), init);
    }
    return originalFetch(input, init);
  };

  window.__VOICEAI_API_FETCH_PATCHED__ = true;
})();