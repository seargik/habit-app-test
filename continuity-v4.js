(() => {
  "use strict";
  const STORE_KEY = "lifeTrackerData.v4";
  const SCALE_5_START = "2026-08-13";
  const $ = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[ch]);
  }

  function readData() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeData(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      return true;
    } catch (_) {
      return false;
    }
  }

  function selectedDate() {
    return $("dateInput")?.value || new Date().toISOString().slice(0, 10);
  }

  function dateAdd(date, days) {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function generalMax(date = selectedDate()) {
    return date >= SCALE_5_START ? 5 : 10;
  }

  function convertOldGeneralValue(value) {
    if (value === "" || value == null) return value;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 5 || n > 10) return value;
    return String(Math.round((n / 2) * 10) / 10);
  }

  function normalizeScale5Compatibility() {
    const data = readData();
    if (!data?.entries) return false;
    let changed = false;
    Object.entries(data.entries).forEach(([date, entry]) => {
      if (date < SCALE_5_START || !entry?.metrics) return;
      const next = convertOldGeneralValue(entry.metrics.general);
      if (String(next ?? "") !== String(entry.metrics.general ?? "")) {
        entry.metrics.general = next;
        changed = true;
      }
    });
    if (changed) {
      data.settings = data.settings && typeof data.settings === "object" ? data.settings : {};
      data.settings.generalScale5CompatibilityApplied = true;
      writeData(data);
    }
    return changed;
  }

  function syncCurrentGeneralFromStorage() {
    const input = $("general");
    const date = selectedDate();
    if (!input || generalMax(date) !== 5) return;
    const stored = readData()?.entries?.[date]?.metrics?.general;
    const currentN = Number(input.value);
    if (input.value !== "" && Number.isFinite(currentN) && currentN > 5 && currentN <= 10) {
      input.value = String(stored ?? convertOldGeneralValue(input.value));
    }
  }

  function ensureCurrentDayLabel() {
    let label = $("currentDayLabel");
    if (label) return label;
    const row = document.querySelector(".dateRow");
    if (!row) return null;
    label = document.createElement("div");
    label.id = "currentDayLabel";
    label.className = "small topSpace";
    row.insertAdjacentElement("afterend", label);
    return label;
  }

  function refreshCurrentDayLabel() {
    const label = ensureCurrentDayLabel();
    const value = $("dateInput")?.value || "";
    if (!label) return;
    if (!value) {
      label.textContent = "Дата загружается…";
      return;
    }
    const [y, m, d] = value.split("-");
    const now = new Date();
    const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    label.textContent = `Открыт день: ${d}.${m}.${y}${value === localToday ? " · Сегодня" : ""}`;
  }

  function refreshGeneralDisplay() {
    syncCurrentGeneralFromStorage();
    const max = generalMax();
    const input = $("general");
    if (input) input.max = String(max);
    const label = document.querySelector('label[for="general"]');
    if (label) label.textContent = `General 0–${max}`;
    const pill = $("dayScorePill");
    if (pill && pill.textContent.includes("General")) {
      let next = pill.textContent.replace(/\/(5|10)\b/, `/${max}`);
      if (input?.value !== "") {
        next = next.replace(/^General\s+[^/]+\/(5|10)/, `General ${input.value}/${max}`);
      }
      if (next !== pill.textContent) pill.textContent = next;
    }
  }

  function taskByLink(data, link) {
    if (!link || !link.includes("|")) return null;
    const [date, id] = link.split("|");
    const task = (data.entries?.[date]?.planTasks || []).find((t) => t.id === id);
    return task ? { date, task } : null;
  }

  function ensureCard() {
    const section = $("tab-progress");
    if (!section || $("continuityProgressCard")) return;
    const card = document.createElement("div");
    card.id = "continuityProgressCard";
    card.className = "card";
    card.innerHTML = `
      <div class="sectionTitle"><h2>Continuity / previous endeavour</h2><span class="pill">7 days</span></div>
      <div class="hint">Связь задаётся в Daybook → План на день через dropdown «Продолжение предыдущего дела».</div>
      <div id="continuityProgressList" class="continuityProgressList"></div>
    `;
    section.appendChild(card);
  }

  function render() {
    ensureCard();
    const box = $("continuityProgressList");
    const data = readData();
    if (!box || !data) return;
    const end = selectedDate();
    const start = dateAdd(end, -6);
    const rows = [];

    Object.keys(data.entries || {})
      .filter((date) => date >= start && date <= end)
      .sort()
      .forEach((date) => {
        (data.entries[date]?.planTasks || []).forEach((task) => {
          if (!task?.text) return;
          rows.push({ date, task, parent: taskByLink(data, task.continuationOf) });
        });
      });

    box.innerHTML = rows.length ? "" : `<div class="hint topSpace">За последние 7 дней задач пока нет.</div>`;
    rows.reverse().forEach(({ date, task, parent }) => {
      const div = document.createElement("div");
      div.className = "continuityItem";
      div.innerHTML = `
        <div class="continuityHead"><strong>${escapeHtml(date)}</strong><span>${task.done ? "✓ done" : "open"}</span></div>
        <div>${escapeHtml(task.text)}</div>
        <div class="hint">${parent
          ? `↳ продолжение: ${escapeHtml(parent.date)} · ${escapeHtml(parent.task.text)}`
          : "новое дело / связь не указана"}</div>
      `;
      box.appendChild(div);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      normalizeScale5Compatibility();
      syncCurrentGeneralFromStorage();
      ensureCurrentDayLabel();
      refreshCurrentDayLabel();
      ensureCard();

      const pill = $("dayScorePill");
      if (pill) {
        const observer = new MutationObserver(refreshGeneralDisplay);
        observer.observe(pill, { childList: true, characterData: true, subtree: true });
      }

      document.querySelector('[data-tab="progress"]')?.addEventListener("click", () => setTimeout(render, 0));
      $("refreshProgress")?.addEventListener("click", () => setTimeout(render, 0));
      $("dateInput")?.addEventListener("change", () => setTimeout(() => {
        syncCurrentGeneralFromStorage();
        render();
        refreshGeneralDisplay();
        refreshCurrentDayLabel();
      }, 0));
      ["prevDay", "nextDay"].forEach((id) => $(id)?.addEventListener("click", () => setTimeout(() => {
        syncCurrentGeneralFromStorage();
        refreshGeneralDisplay();
        refreshCurrentDayLabel();
      }, 0)));
      $("saveBtn")?.addEventListener("click", () => setTimeout(refreshGeneralDisplay, 0));
      document.querySelectorAll(".tabs button").forEach((button) => {
        button.addEventListener("click", () => setTimeout(() => {
          syncCurrentGeneralFromStorage();
          refreshGeneralDisplay();
          refreshCurrentDayLabel();
        }, 0));
      });
      document.addEventListener("click", (event) => {
        if (event.target?.closest?.(".calendarDay")) setTimeout(refreshCurrentDayLabel, 0);
      });

      refreshGeneralDisplay();
    }, 0);
  });
})();