(() => {
  "use strict";
  const STORE_KEY = "lifeTrackerData.v4";
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

  function selectedDate() {
    return $("dateInput")?.value || new Date().toISOString().slice(0, 10);
  }

  function dateAdd(date, days) {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
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
      ensureCard();
      document.querySelector('[data-tab="progress"]')?.addEventListener("click", () => setTimeout(render, 0));
      $("refreshProgress")?.addEventListener("click", () => setTimeout(render, 0));
      $("dateInput")?.addEventListener("change", () => setTimeout(render, 0));
    }, 0);
  });
})();