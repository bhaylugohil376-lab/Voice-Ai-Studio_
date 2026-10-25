document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('a[href="#"]').forEach((link) => {
    link.addEventListener("click", (event) => event.preventDefault());
  });
  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  // Load the shared section adapter registry on pages using the common site script.
  if (!window.VoiceAIAdapters && !document.querySelector('script[data-voiceai-adapters]')) {
    const adapterScript = document.createElement("script");
    adapterScript.src = new URL("./adapters/registry.js", document.currentScript?.src || window.location.href).href;
    adapterScript.dataset.voiceaiAdapters = "true";
    adapterScript.async = true;
    document.head.appendChild(adapterScript);
  }
});
