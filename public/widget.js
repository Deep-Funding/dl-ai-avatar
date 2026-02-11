(function () {
  if (window.DeepAIWidgetLoaded) return;
  window.DeepAIWidgetLoaded = true;

  const config = window.DeepAIConfig || {};

  const POSITION = config.position === "left" ? "left" : "right";
  const COLOR = config.color || "linear-gradient(135deg,#3b82f6,#9333ea)";
  const FONT = config.font || "system-ui, sans-serif";
  const WIDTH = config.width || 400;
  const HEIGHT = config.height || 600;

  const WIDGET_URL =
    (config.baseUrl || "https://ai-avatar-updated-137748040614.us-central1.run.app") + "/embed";

  // -------------------------
  // Create iframe
  // -------------------------
  const iframe = document.createElement("iframe");
  iframe.src = WIDGET_URL;
  iframe.style.position = "fixed";
  iframe.style.bottom = "100px";
  iframe.style[POSITION] = "24px";
  iframe.style.width = WIDTH + "px";
  iframe.style.height = HEIGHT + "px";
  iframe.style.border = "none";
  iframe.style.borderRadius = "16px";
  iframe.style.boxShadow = "0 25px 60px rgba(0,0,0,0.4)";
  iframe.style.zIndex = "999998";
  iframe.style.opacity = "0";
  iframe.style.transform = "translateY(40px)";
  iframe.style.transition = "all 0.3s ease";
  iframe.style.pointerEvents = "none";
  iframe.allow = "clipboard-write";

  document.body.appendChild(iframe);

  // -------------------------
  // Create Bubble
  // -------------------------
  const button = document.createElement("div");
  button.innerHTML = config.label || "AI";
  button.style.position = "fixed";
  button.style.bottom = "24px";
  button.style[POSITION] = "24px";
  button.style.width = "60px";
  button.style.height = "60px";
  button.style.borderRadius = "50%";
  button.style.background = COLOR;
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.color = "white";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 0 25px rgba(0,0,0,0.35)";
  button.style.zIndex = "999999";
  button.style.fontFamily = FONT;
  button.style.fontWeight = "600";
  button.style.transition = "transform 0.2s ease";

  button.onmouseenter = () => {
    button.style.transform = "scale(1.08)";
  };

  button.onmouseleave = () => {
    button.style.transform = "scale(1)";
  };

  document.body.appendChild(button);

  let isOpen = false;

  function openWidget() {
    isOpen = true;
    iframe.style.opacity = "1";
    iframe.style.transform = "translateY(0)";
    iframe.style.pointerEvents = "auto";
    button.style.opacity = "0";
    button.style.pointerEvents = "none";
  }

  function closeWidget() {
    isOpen = false;
    iframe.style.opacity = "0";
    iframe.style.transform = "translateY(40px)";
    iframe.style.pointerEvents = "none";
    button.style.opacity = "1";
    button.style.pointerEvents = "auto";
  }

  button.onclick = function () {
    openWidget();
  };

  // -------------------------
  // Listen for postMessage from iframe
  // -------------------------
  window.addEventListener("message", function (event) {
    if (!event.data || typeof event.data !== "object") return;

    if (event.data.type === "DEEPAI_WIDGET_CLOSE") {
      closeWidget();
    }
  });
})();
