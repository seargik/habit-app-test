(() => {
  "use strict";

  const SCALE_5_START = "2026-08-13";

  function selectedDate() {
    return document.getElementById("dateInput")?.value || new Date().toISOString().slice(0, 10);
  }

  function refreshGeneralDisplay() {
    const max = selectedDate() >= SCALE_5_START ? 5 : 10;
    const input = document.getElementById("general");
    if (input) input.max = String(max);
    const label = document.querySelector('label[for="general"]');
    if (label) label.textContent = `General 0–${max}`;
    const pill = document.getElementById("dayScorePill");
    if (pill && pill.textContent.includes("General")) {
      pill.textContent = pill.textContent.replace(/\/(5|10)\b/, `/${max}`);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const pill = document.getElementById("dayScorePill");
    if (pill) {
      const observer = new MutationObserver(refreshGeneralDisplay);
      observer.observe(pill, { childList: true, characterData: true, subtree: true });
    }
    document.getElementById("dateInput")?.addEventListener("change", () => setTimeout(refreshGeneralDisplay, 0));
    document.getElementById("saveBtn")?.addEventListener("click", () => setTimeout(refreshGeneralDisplay, 0));
    document.querySelectorAll(".tabs button").forEach((button) => {
      button.addEventListener("click", () => setTimeout(refreshGeneralDisplay, 0));
    });
    refreshGeneralDisplay();
  });
})();