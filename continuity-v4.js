(() => {
  "use strict";
  const src = "./ux-fixes-v7.js?v=7";
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement("script");
  script.src = src;
  script.defer = true;
  document.head.appendChild(script);
})();