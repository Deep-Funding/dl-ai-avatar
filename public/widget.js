(function () {
  if (window.DeepAIWidgetLoaded) return;
  window.DeepAIWidgetLoaded = true;

  const WIDGET_URL = "https://your-domain.com/embed";

  // Create iframe
  const iframe = document.createElement("iframe");
  iframe.src = WIDGET_URL;
  iframe.style.position = "fixed";
  iframe.style.bottom = "24px";
  iframe.style.right = "24px";
  iframe.style.width = "400px";
  iframe.style.height = "600px";
  iframe.style.border = "none";
  iframe.style.borderRadius = "12px";
  iframe.style.boxShadow = "0 20px 50px rgba(0,0,0,0.4)";
  iframe.style.zIndex = "999999";
  iframe.style.display = "none";
  iframe.allow = "clipboard-write";

  document.body.appendChild(iframe);

  // Bubble button
  const button = document.createElement("div");
  button.innerHTML = "AI";
  button.style.position = "fixed";
  button.style.bottom = "24px";
  button.style.right = "24px";
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
  button.style.zIndex = "1000000";
  button.style.fontWeight = "bold";

  let isOpen = false;

  button.onclick = function () {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? "block" : "none";
  };

  document.body.appendChild(button);
})();
