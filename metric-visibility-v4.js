(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && root.document) root.addEventListener("DOMContentLoaded", () => api.install(root));
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STORE_KEY = "lifeTrackerData.v4";
  const DEFAULT_METRICS = ["general", "sleep", "energy", "stress", "body"];
  const LABELS = {
    general: "General 0–10",
    sleep: "Sleep",
    energy: "Energy",
    stress: "Stress",
    body: "Body / metric"
  };

  function normalizeVisibleMetrics(value) {
    if (!Array.isArray(value)) return DEFAULT_METRICS.slice();
    const allowed = new Set(DEFAULT_METRICS);
    return value.filter((id, index) => allowed.has(id) && value.indexOf(id) === index);
  }

  function readData(storage) {
    try {
      const raw = storage?.getItem?.(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeVisibleMetrics(storage, visibleMetrics) {
    const data = readData(storage);
    if (!data) return false;
    data.settings = data.settings && typeof data.settings === "object" ? data.settings : {};
    data.settings.visibleMetrics = normalizeVisibleMetrics(visibleMetrics);
    storage.setItem(STORE_KEY, JSON.stringify(data));
    return true;
  }

  function applyVisibility(root, visibleMetrics) {
    const visible = new Set(normalizeVisibleMetrics(visibleMetrics));
    DEFAULT_METRICS.forEach((id) => {
      const input = root.document.getElementById(id);
      const box = input?.closest?.(".metricBox");
      if (box) box.classList.toggle("hidden", !visible.has(id));
    });
  }

  function renderSettings(root, visibleMetrics) {
    const section = root.document.getElementById("tab-settings");
    if (!section || root.document.getElementById("metricVisibilityCard")) return;

    const card = root.document.createElement("div");
    card.className = "card";
    card.id = "metricVisibilityCard";
    card.innerHTML = `
      <h2>Visible day metrics</h2>
      <p class="hint">Choose which metrics appear in the Day block. Hidden metrics stay in historical data and exports.</p>
      <div id="metricVisibilityOptions" class="metricVisibilityOptions"></div>
    `;

    const firstCard = section.querySelector(".card");
    if (firstCard?.nextSibling) section.insertBefore(card, firstCard.nextSibling);
    else section.appendChild(card);

    const visible = new Set(normalizeVisibleMetrics(visibleMetrics));
    const options = card.querySelector("#metricVisibilityOptions");
    DEFAULT_METRICS.forEach((id) => {
      const label = root.document.createElement("label");
      label.className = "metricToggle";
      label.innerHTML = `<input type="checkbox" value="${id}" ${visible.has(id) ? "checked" : ""}> <span>${LABELS[id]}</span>`;
      options.appendChild(label);
    });

    options.addEventListener("change", () => {
      const selected = Array.from(options.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
      if (writeVisibleMetrics(root.localStorage, selected)) root.location.reload();
    });
  }

  function install(root) {
    const data = readData(root.localStorage);
    const visibleMetrics = normalizeVisibleMetrics(data?.settings?.visibleMetrics);
    applyVisibility(root, visibleMetrics);
    renderSettings(root, visibleMetrics);
  }

  return {
    STORE_KEY,
    DEFAULT_METRICS: DEFAULT_METRICS.slice(),
    normalizeVisibleMetrics,
    readData,
    writeVisibleMetrics,
    applyVisibility,
    install
  };
});
