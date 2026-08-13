(() => {
  "use strict";
  const src = "./ux-fixes-v7.js?v=7";

  function cleanCopy() {
    document.getElementById("exportSelectedPhoto")?.remove();
    document.getElementById("photoExportCard")?.remove();

    const categoriesHint = document.querySelector("#tab-today #habits")?.previousElementSibling;
    if (categoriesHint?.classList.contains("hint")) {
      categoriesHint.textContent = "MIN и MAX видны прямо на карточке. Persistent Notes открываются через ⓘ / 📝.";
    }

    const exportHint = document.querySelector("#tab-export .card p.hint");
    if (exportHint) {
      exportHint.textContent = "Full JSON содержит текстовые данные Daybook, definitions, plan и photo metadata. Сами Photo of the Day остаются локально на устройстве.";
    }

    const helpItems = document.querySelectorAll("#helpModal li");
    if (helpItems[1]) helpItems[1].textContent = "MIN / MAX видны на карточке; большие Persistent Notes открываются через ⓘ / 📝.";
    if (helpItems[3]) helpItems[3].textContent = "Перед переносом в production делай Full JSON backup.";
  }

  if (!document.querySelector(`script[src="${src}"]`)) {
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.addEventListener("load", () => setTimeout(cleanCopy, 80));
    document.head.appendChild(script);
  } else {
    setTimeout(cleanCopy, 80);
  }
})();