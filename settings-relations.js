(() => {
  "use strict";

  const STORE = "lifeTrackerData.v4";
  const $ = (id) => document.getElementById(id);

  function read() {
    try {
      const raw = localStorage.getItem(STORE);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function definitionKey(habit) {
    return `${habit.id}|${habit.startDate || ""}`;
  }

  function endedTopics(data, current) {
    return (data?.habits || [])
      .filter((candidate) => candidate !== current && Boolean(candidate.endDate))
      .sort((a, b) =>
        String(b.endDate || "").localeCompare(String(a.endDate || "")) ||
        Number(a.order || 0) - Number(b.order || 0) ||
        String(a.name || a.id).localeCompare(String(b.name || b.id))
      );
  }

  function syncRelationSelects() {
    const data = read();
    const list = $("settingsList");
    if (!data || !list) return;

    for (const select of list.querySelectorAll("select[data-definition-relation]")) {
      const currentKey = select.dataset.definitionRelation || "";
      const current = (data.habits || []).find((habit) => definitionKey(habit) === currentKey);
      if (!current) continue;

      const candidates = endedTopics(data, current);
      const selectedKey = candidates.some((habit) => definitionKey(habit) === current.previousDefinitionKey)
        ? current.previousDefinitionKey
        : "";

      const desired = [
        { value: "", text: "— new independent topic —" },
        ...candidates.map((habit) => ({
          value: definitionKey(habit),
          text: `${habit.endDate} · ${habit.name}`
        }))
      ];

      const currentOptions = Array.from(select.options).map((option) => ({
        value: option.value,
        text: option.textContent || ""
      }));
      const isSame = currentOptions.length === desired.length && currentOptions.every((option, index) =>
        option.value === desired[index].value && option.text === desired[index].text
      );

      if (!isSame) {
        select.replaceChildren(...desired.map((item) => {
          const option = document.createElement("option");
          option.value = item.value;
          option.textContent = item.text;
          return option;
        }));
      }

      if (select.value !== selectedKey) select.value = selectedKey;
    }
  }

  function scheduleSync() {
    setTimeout(syncRelationSelects, 60);
    setTimeout(syncRelationSelects, 180);
  }

  function init() {
    document.querySelector('[data-tab="settings"]')?.addEventListener("click", scheduleSync);
    $("settingsList")?.addEventListener("change", (event) => {
      if (event.target?.matches?.('[data-field="endDate"],[data-field="startDate"]')) scheduleSync();
    });
    scheduleSync();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();