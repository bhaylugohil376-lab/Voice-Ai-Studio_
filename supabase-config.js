(function () {
  "use strict";

  const SUPABASE_URL = "https://axeqcbavupmpijhaaite.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ktNCPoHwVtaMYfKTHTEODA_qEDo-8pp";

  // API routing is centralized in api-config.js. Do not patch fetch here:
  // this file loads first on many pages and used to lock requests to a deleted Vercel backend.
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase SDK not loaded. Load @supabase/supabase-js before supabase-config.js");
    return;
  }

  const safeStorage = {
    getItem(key) {
      try { return window.localStorage.getItem(key); } catch (_) { return null; }
    },
    setItem(key, value) {
      try { window.localStorage.setItem(key, value); } catch (_) {
        console.warn("Supabase session persistence is unavailable in this browser.");
      }
    },
    removeItem(key) {
      try { window.localStorage.removeItem(key); } catch (_) {}
    }
  };

  try {
    window.supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: safeStorage
        }
      }
    );
    console.info("Supabase client initialized.");
  } catch (error) {
    console.error("Supabase client initialization failed:", error);
  }
})();
