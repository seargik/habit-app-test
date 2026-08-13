(() => {
  "use strict";

  const STORE = "lifeTrackerData.v4";
  const $ = (id) => document.getElementById(id);
  const model = window.LifeTrackerMigrationV4;

  function read() {
    try {
      const raw = localStorage.getItem(STORE);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function addDate(value, days) {
    const d = new Date(`${value}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function parseRange() {
    const text = $("historyRange")?.textContent || "";
    const match = /(\d{4}-\d{2}-\d{2})\s*→\s*(\d{4}-\d{2}-\d{2})/.exec(text);
    return match ? { start: match[1], end: match[2] } : null;
  }

  function rangeDates(start, end) {
    const dates = [];
    let cursor = start;
    let guard = 0;
    while (cursor <= end && guard < 400) {
      dates.push(cursor);
      cursor = addDate(cursor, 1);
      guard += 1;
    }
    return dates;
  }

  function htmlEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[ch]);
  }

  function renderRangeSummary() {
    const range = parseRange();
    const data = read();
    if (!range || !data || !model) return;

    const dates = rangeDates(range.start, range.end);
    const totals = { done: 0, min: 0, fail: 0, skip: 0 };
    const perHabit = new Map();

    for (const date of dates) {
      const entry = data.entries?.[date];
      let defs = [];
      try { defs = model.definitionsForDate(data, date) || []; } catch (_) { defs = []; }
      for (const habit of defs) {
        const status = entry?.habits?.[habit.id]?.status || "";
        if (!perHabit.has(habit.id)) {
          perHabit.set(habit.id, { id: habit.id, name: habit.name || habit.id, done: 0, min: 0, fail: 0, skip: 0, tracked: 0 });
        }
        const row = perHabit.get(habit.id);
        row.name = habit.name || row.name;
        if (status && Object.prototype.hasOwnProperty.call(totals, status)) {
          totals[status] += 1;
          row[status] += 1;
          row.tracked += 1;
        }
      }
    }

    if ($("statDone")) $("statDone").textContent = String(totals.done);
    if ($("statMin")) $("statMin").textContent = String(totals.min);
    if ($("statFail")) $("statFail").textContent = String(totals.fail);
    if ($("statRate")) $("statRate").textContent = String(totals.skip);

    const firstCard = $("tab-progress")?.querySelector(":scope > .card:not(.historyCard)");
    const title = firstCard?.querySelector("h2");
    if (title) title.textContent = `Selected period · ${dates.length} days`;

    const progress = $("habitProgress");
    if (progress) {
      progress.innerHTML = "";
      const rows = Array.from(perHabit.values()).sort((a, b) => (b.done + b.min + b.fail + b.skip) - (a.done + a.min + a.fail + a.skip) || a.name.localeCompare(b.name));
      if (!rows.length) {
        progress.innerHTML = `<div class="hint">Нет отмеченных статусов в выбранном периоде.</div>`;
      } else {
        for (const habit of rows) {
          const div = document.createElement("div");
          div.className = "habit";
          div.innerHTML = `
            <div class="habitTop"><div class="habitName">${htmlEscape(habit.name)}</div></div>
            <div class="hint topSpace">Done ${habit.done} · Min ${habit.min} · Fail ${habit.fail} · Skip ${habit.skip}</div>`;
          progress.appendChild(div);
        }
      }
    }

    const insights = $("autoInsights");
    if (insights) {
      const positive = totals.done + totals.min;
      const negative = totals.fail + totals.skip;
      const lines = [
        `${range.start} → ${range.end} · ${dates.length} days.`,
        `Positive statuses: ${positive} (${totals.done} Done + ${totals.min} Min).`,
        `Negative / skipped statuses: ${negative} (${totals.fail} Fail + ${totals.skip} Skip).`
      ];
      const activeRows = Array.from(perHabit.values()).filter((h) => h.tracked > 0);
      if (activeRows.length) {
        const strongest = activeRows.slice().sort((a, b) => (b.done + b.min) - (a.done + a.min))[0];
        const friction = activeRows.slice().sort((a, b) => (b.fail + b.skip) - (a.fail + a.skip))[0];
        if (strongest && strongest.done + strongest.min > 0) lines.push(`Most positive: ${strongest.name} · ${strongest.done + strongest.min}.`);
        if (friction && friction.fail + friction.skip > 0) lines.push(`Most friction: ${friction.name} · ${friction.fail + friction.skip}.`);
      }
      insights.innerHTML = lines.map((line) => `<p>• ${htmlEscape(line)}</p>`).join("");
    }
  }

  function init() {
    const range = $("historyRange");
    if (range) {
      new MutationObserver(() => setTimeout(renderRangeSummary, 10)).observe(range, { childList: true, characterData: true, subtree: true });
    }
    document.querySelector('[data-tab="progress"]')?.addEventListener("click", () => setTimeout(renderRangeSummary, 100));
    $("refreshProgress")?.addEventListener("click", () => setTimeout(renderRangeSummary, 80));
    document.addEventListener("click", (event) => {
      if (event.target?.closest?.("[data-history-days],#historyPrev,#historyNext")) setTimeout(renderRangeSummary, 80);
    });
    setTimeout(renderRangeSummary, 150);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
