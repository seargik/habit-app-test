(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.LifeTrackerGeneralGuard = api;
    if (root.document) api.install(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function isValidGeneral(value) {
    if (value === "") return true;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 10;
  }

  function storedGeneralForDate(storage, date) {
    if (!storage || !date) return "";
    try {
      const raw = storage.getItem("lifeTrackerData.v4");
      if (!raw) return "";
      const parsed = JSON.parse(raw);
      const value = parsed?.entries?.[date]?.metrics?.general;
      return value == null ? "" : String(value);
    } catch (_) {
      return "";
    }
  }

  function sanitizeGeneralInput(root, dateOverride) {
    const input = root?.document?.getElementById?.("general");
    if (!input || isValidGeneral(input.value)) return true;

    const dateInput = root.document.getElementById("dateInput");
    const date = dateOverride || dateInput?.value || "";
    input.value = storedGeneralForDate(root.localStorage, date);

    const status = root.document.getElementById("saveStatus");
    if (status) status.textContent = "General must be between 0 and 10. Invalid value was not saved.";
    return false;
  }

  function install(root) {
    if (!root?.document?.addEventListener) return;

    let focusedDate = "";

    root.document.addEventListener("focusin", (event) => {
      if (event.target?.id === "dateInput") focusedDate = event.target.value || "";
    }, true);

    root.document.addEventListener("click", (event) => {
      if (event.target?.closest?.("#saveBtn")) return; // app shows its explicit validation alert
      const date = root.document.getElementById("dateInput")?.value || "";
      sanitizeGeneralInput(root, date);
    }, true);

    root.document.addEventListener("change", (event) => {
      const date = event.target?.id === "dateInput"
        ? (focusedDate || event.target.value || "")
        : (root.document.getElementById("dateInput")?.value || "");
      sanitizeGeneralInput(root, date);
      if (event.target?.id === "dateInput") focusedDate = event.target.value || "";
    }, true);

    root.addEventListener?.("beforeunload", () => {
      const date = root.document.getElementById("dateInput")?.value || "";
      sanitizeGeneralInput(root, date);
    }, true);
  }

  return { isValidGeneral, storedGeneralForDate, sanitizeGeneralInput, install };
});
