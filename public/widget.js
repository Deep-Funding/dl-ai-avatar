(function () {
  if (window.DeepAIWidgetLoaded) return;
  window.DeepAIWidgetLoaded = true;

  const WIDGET_URL = "https://ai-avatar-updated-137748040614.us-central1.run.app/embed";

  // Create container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.bottom = "24px";
  container.style.right = "24px";
  container.style.zIndex = "999999";
  container.style.fontFamily = "sans-serif";

  // Create bubble button
  const button = document.createElement("div");
  button.innerHTML = "AI";
  button.style.width = "60px";
  button.style.height = "60px";
  button.style.borderRadius = "50%";
  button.style.background = "linear-gradient(135deg, #3b82f6, #9333ea)";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.color = "white";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 0 20px rgba(0,0,0,0.3)";
  button.style.fontWeight = "bold";

  // Create iframe
  const iframe = document.createElement("iframe");
  iframe.src = WIDGET_URL;
  iframe.style.width = "400px";
  iframe.style.height = "600px";
  iframe.style.border = "none";
  iframe.style.borderRadius = "12px";
  iframe.style.boxShadow = "0 20px 50px rgba(0,0,0,0.4)";
  iframe.style.display = "none";
  iframe.style.marginBottom = "16px";
  iframe.allow = "clipboard-write";

  let isOpen = false;

  button.onclick = function () {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? "block" : "none";
  };

  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);
})();
