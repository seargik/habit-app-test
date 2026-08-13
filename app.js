(() => {
  "use strict";

  const APP_VERSION = "3.0-public-safe";
  const STORE_KEY = "lifeTrackerData.v3";
  const LEGACY_KEYS = ["lifeTrackerData.v2", "lifeTrackerData.v1"];

  const DEFAULT_HABITS = [
    { id: "h1", name: "Habit 1", min: "Minimum version" },
    { id: "h2", name: "Habit 2", min: "Minimum version" },
    { id: "h3", name: "Habit 3", min: "Minimum version" },
    { id: "h4", name: "Habit 4", min: "Minimum version" },
    { id: "h5", name: "Habit 5", min: "Minimum version" },
    { id: "h6", name: "Habit 6", min: "Minimum version" },
    { id: "h7", name: "Habit 7", min: "Minimum version" },
    { id: "h8", name: "Habit 8", min: "Minimum version" }
  ];

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let data = loadData();
  let currentDate = todayStr();

  function todayStr() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 10);
  }

  function htmlEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[ch];
    });
  }

  function csvEscape(value) {
    const s = String(value ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return normalizeData(JSON.parse(raw));

      for (const key of LEGACY_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
          const migrated = normalizeData(JSON.parse(legacy));
          localStorage.setItem(STORE_KEY, JSON.stringify(migrated));
          return migrated;
        }
      }
    } catch (err) {
      console.warn("Failed to load local data", err);
    }

    return normalizeData({
      version: 3,
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      habits: DEFAULT_HABITS,
      entries: {}
    });
  }

  function normalizeData(obj) {
    const safe = obj && typeof obj === "object" ? obj : {};
    safe.version = 3;
    safe.appVersion = APP_VERSION;
    safe.createdAt = safe.createdAt || new Date().toISOString();
    safe.habits = Array.isArray(safe.habits) && safe.habits.length ? safe.habits : DEFAULT_HABITS;
    safe.entries = safe.entries && typeof safe.entries === "object" ? safe.entries : {};
    return safe;
  }

  function persist() {
    data.version = 3;
    data.appVersion = APP_VERSION;
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  function dateAdd(date, days) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function getEntry(date) {
    if (!data.entries[date]) {
      data.entries[date] = { date, metrics: {}, habits: {}, dayNote: "", updatedAt: null };
    }

    const entry = data.entries[date];
    entry.metrics = entry.metrics || {};
    entry.habits = entry.habits || {};

    for (const habit of data.habits) {
      if (!entry.habits[habit.id]) entry.habits[habit.id] = { status: "", comment: "" };
    }

    return entry;
  }

  function setDate(date) {
    currentDate = date;
    $("dateInput").value = currentDate;
    renderToday();
  }

  function saveCurrentFromUI(showStatus = true) {
    const entry = getEntry(currentDate);

    entry.metrics.sleep = $("sleep").value || "";
    entry.metrics.energy = $("energy").value || "";
    entry.metrics.stress = $("stress").value || "";
    entry.metrics.body = $("body").value || "";
    entry.dayNote = $("dayNote").value || "";

    for (const habit of data.habits) {
      const el = $("comment-" + habit.id);
      if (el) entry.habits[habit.id].comment = el.value || "";
    }

    entry.updatedAt = new Date().toISOString();
    persist();
    renderScore();

    if (showStatus) {
      $("saveStatus").textContent = "Saved: " + new Date().toLocaleTimeString();
    }
  }

  function renderToday() {
    const entry = getEntry(currentDate);

    $("sleep").value = entry.metrics.sleep || "";
    $("energy").value = entry.metrics.energy || "";
    $("stress").value = entry.metrics.stress || "";
    $("body").value = entry.metrics.body || "";
    $("dayNote").value = entry.dayNote || "";

    const container = $("habits");
    container.innerHTML = "";

    data.habits.forEach((habit, index) => {
      if (!entry.habits[habit.id]) entry.habits[habit.id] = { status: "", comment: "" };
      const status = entry.habits[habit.id].status || "";

      const div = document.createElement("div");
      div.className = "habit";
      div.innerHTML = `
        <div class="habitTop">
          <div class="habitName">${index + 1}. ${htmlEscape(habit.name)}</div>
          <span class="tag">${htmlEscape(habit.min || "min")}</span>
        </div>
        <div class="statusBtns">
          <button type="button" class="${status === "done" ? "active done" : ""}" data-habit="${htmlEscape(habit.id)}" data-status="done">Done</button>
          <button type="button" class="${status === "min" ? "active min" : ""}" data-habit="${htmlEscape(habit.id)}" data-status="min">Min</button>
          <button type="button" class="${status === "skip" ? "active skip" : ""}" data-habit="${htmlEscape(habit.id)}" data-status="skip">Skip</button>
          <button type="button" class="${status === "fail" ? "active fail" : ""}" data-habit="${htmlEscape(habit.id)}" data-status="fail">Fail</button>
        </div>
        <textarea id="comment-${htmlEscape(habit.id)}" placeholder="Comment">${htmlEscape(entry.habits[habit.id].comment || "")}</textarea>
      `;
      container.appendChild(div);
    });

    $$("button[data-habit]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const habitId = btn.dataset.habit;
        const nextStatus = btn.dataset.status;
        const e = getEntry(currentDate);
        e.habits[habitId].status = e.habits[habitId].status === nextStatus ? "" : nextStatus;
        saveCurrentFromUI(false);
        renderToday();
      });
    });

    renderScore();
  }

  function scoreEntry(entry) {
    let possible = 0;
    let score = 0;
    let done = 0;
    let min = 0;
    let fail = 0;
    let skip = 0;

    for (const habit of data.habits) {
      const status = entry.habits?.[habit.id]?.status || "";
      if (status === "skip") {
        skip += 1;
        continue;
      }

      possible += 1;

      if (status === "done") {
        score += 1;
        done += 1;
      } else if (status === "min") {
        score += 0.55;
        min += 1;
      } else if (status === "fail") {
        fail += 1;
      }
    }

    return {
      possible,
      score,
      done,
      min,
      fail,
      skip,
      rate: possible ? Math.round((score / possible) * 100) : 0
    };
  }

  function renderScore() {
    const s = scoreEntry(getEntry(currentDate));
    $("dayScorePill").textContent = `${s.rate}% · ${s.done} done · ${s.min} min`;
  }

  function renderProgress() {
    saveCurrentFromUI(false);

    const days = [];
    for (let i = 6; i >= 0; i -= 1) days.push(dateAdd(currentDate, -i));

    const totals = { done: 0, min: 0, fail: 0, skip: 0, possible: 0, score: 0 };
    const perHabit = {};
    for (const habit of data.habits) {
      perHabit[habit.id] = { name: habit.name, done: 0, min: 0, fail: 0, skip: 0, total: 0 };
    }

    for (const date of days) {
      const entry = data.entries[date];
      if (!entry) continue;

      const s = scoreEntry(entry);
      totals.done += s.done;
      totals.min += s.min;
      totals.fail += s.fail;
      totals.skip += s.skip;
      totals.possible += s.possible;
      totals.score += s.score;

      for (const habit of data.habits) {
        const status = entry.habits?.[habit.id]?.status || "";
        if (status && perHabit[habit.id][status] !== undefined) perHabit[habit.id][status] += 1;
        if (status !== "skip") perHabit[habit.id].total += 1;
      }
    }

    const rate = totals.possible ? Math.round((totals.score / totals.possible) * 100) : 0;
    $("statDone").textContent = totals.done;
    $("statMin").textContent = totals.min;
    $("statFail").textContent = totals.fail;
    $("statRate").textContent = rate + "%";

    const progressBox = $("habitProgress");
    progressBox.innerHTML = "";

    Object.values(perHabit).forEach((habit) => {
      const pct = habit.total ? Math.round(((habit.done + 0.55 * habit.min) / habit.total) * 100) : 0;
      const div = document.createElement("div");
      div.className = "habit";
      div.innerHTML = `
        <div class="habitTop">
          <div class="habitName">${htmlEscape(habit.name)}</div>
          <span class="tag">${pct}%</span>
        </div>
        <div class="progressLine"><div class="bar" style="width:${pct}%"></div></div>
        <div class="hint topSpace">Done ${habit.done} · Min ${habit.min} · Fail ${habit.fail} · Skip ${habit.skip}</div>
      `;
      progressBox.appendChild(div);
    });

    const insights = [];
    if (rate >= 75) insights.push("Strong week: keep the system simple and repeatable.");
    if (rate > 0 && rate < 45) insights.push("System may be too heavy. Reduce next week by 30–50%.");
    const weakest = Object.values(perHabit)
      .filter((h) => h.total > 0)
      .sort((a, b) => ((a.done + 0.55 * a.min) / a.total) - ((b.done + 0.55 * b.min) / b.total))[0];
    if (weakest) insights.push(`Weakest action: “${weakest.name}”. Make it easier or more obvious.`);
    if (totals.fail > totals.done) insights.push("More Fail than Done: reduce friction, not self-respect.");
    if (!insights.length) insights.push("Not enough data yet. Track 5–7 days, then export JSON for deeper analysis.");

    $("autoInsights").innerHTML = insights.map((x) => `<p>• ${htmlEscape(x)}</p>`).join("");
  }

  function renderSettings() {
    saveCurrentFromUI(false);

    const list = $("settingsList");
    list.innerHTML = "";

    data.habits.forEach((habit) => {
      const div = document.createElement("div");
      div.className = "habit";
      div.innerHTML = `
        <label>Action name</label>
        <input type="text" data-field="name" data-id="${htmlEscape(habit.id)}" value="${htmlEscape(habit.name)}">
        <label>Minimum version</label>
        <input type="text" data-field="min" data-id="${htmlEscape(habit.id)}" value="${htmlEscape(habit.min || "")}">
        <div class="row topSpace">
          <button type="button" data-move="${htmlEscape(habit.id)}" data-dir="-1">↑</button>
          <button type="button" data-move="${htmlEscape(habit.id)}" data-dir="1">↓</button>
          <button type="button" class="btnBad" data-remove="${htmlEscape(habit.id)}">Delete</button>
        </div>
      `;
      list.appendChild(div);
    });

    $$("input[data-field]", list).forEach((input) => {
      input.addEventListener("change", () => {
        const habit = data.habits.find((x) => x.id === input.dataset.id);
        if (!habit) return;
        habit[input.dataset.field] = input.value;
        persist();
        renderToday();
      });
    });

    $$("button[data-remove]", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("Delete action? Old backup entries remain in exported JSON.")) return;
        data.habits = data.habits.filter((h) => h.id !== btn.dataset.remove);
        persist();
        renderSettings();
        renderToday();
      });
    });

    $$("button[data-move]", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = data.habits.findIndex((h) => h.id === btn.dataset.move);
        const j = i + Number(btn.dataset.dir);
        if (i < 0 || j < 0 || j >= data.habits.length) return;
        const temp = data.habits[i];
        data.habits[i] = data.habits[j];
        data.habits[j] = temp;
        persist();
        renderSettings();
        renderToday();
      });
    });
  }

  function addHabit() {
    const name = prompt("Action name:");
    if (!name) return;
    data.habits.push({ id: "h_" + Date.now(), name, min: "Minimum version" });
    persist();
    renderSettings();
    renderToday();
  }

  function resetDefaults() {
    if (!confirm("Reset checklist to public defaults? Daily data is not deleted.")) return;
    data.habits = JSON.parse(JSON.stringify(DEFAULT_HABITS));
    persist();
    renderSettings();
    renderToday();
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function exportJson() {
    saveCurrentFromUI(false);
    const payload = {
      ...data,
      exportedAt: new Date().toISOString(),
      app: "Life Tracker PWA"
    };
    downloadFile(`life-tracker-full-${todayStr()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function exportConfig() {
    saveCurrentFromUI(false);
    const payload = {
      app: "Life Tracker PWA",
      type: "config-only",
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      habits: data.habits
    };
    downloadFile(`life-tracker-config-${todayStr()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function exportCsv() {
    saveCurrentFromUI(false);

    const rows = [["date", "habit_id", "habit_name", "status", "comment", "sleep", "energy", "stress", "metric", "day_note", "updated_at"]];
    const habitsById = Object.fromEntries(data.habits.map((habit) => [habit.id, habit]));

    Object.keys(data.entries).sort().forEach((date) => {
      const entry = data.entries[date];
      const ids = new Set([...Object.keys(entry.habits || {}), ...data.habits.map((h) => h.id)]);

      ids.forEach((id) => {
        const habit = habitsById[id] || { id, name: id };
        const item = entry.habits?.[id] || {};
        rows.push([
          date,
          id,
          habit.name || id,
          item.status || "",
          item.comment || "",
          entry.metrics?.sleep || "",
          entry.metrics?.energy || "",
          entry.metrics?.stress || "",
          entry.metrics?.body || "",
          entry.dayNote || "",
          entry.updatedAt || ""
        ]);
      });
    });

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    downloadFile(`life-tracker-${todayStr()}.csv`, csv, "text/csv;charset=utf-8");
  }

  function importPayload(imported) {
    if (!imported || typeof imported !== "object") throw new Error("Invalid JSON");

    if (imported.type === "config-only" || (imported.habits && !imported.entries)) {
      if (!Array.isArray(imported.habits)) throw new Error("Config JSON has no habits array");
      data.habits = imported.habits;
      persist();
      renderToday();
      renderSettings();
      return "Config imported";
    }

    if (!imported.entries && !imported.habits) throw new Error("JSON must contain habits or entries");

    const merge = confirm("OK = merge with current data. Cancel = replace everything.");
    if (merge) {
      if (imported.habits) data.habits = imported.habits;
      if (imported.entries) data.entries = { ...data.entries, ...imported.entries };
    } else {
      data = normalizeData({
        version: 3,
        appVersion: APP_VERSION,
        createdAt: imported.createdAt || new Date().toISOString(),
        habits: imported.habits || data.habits,
        entries: imported.entries || {}
      });
    }

    persist();
    renderToday();
    renderSettings();
    return "Full JSON imported";
  }

  function switchTab(tab) {
    saveCurrentFromUI(false);

    $$(".tabs button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    ["today", "progress", "export", "settings"].forEach((name) => {
      $("tab-" + name).classList.toggle("hidden", name !== tab);
    });

    if (tab === "progress") renderProgress();
    if (tab === "settings") renderSettings();
  }

  async function forceUpdate() {
    saveCurrentFromUI(false);

    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update()));
      }

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith("life-tracker")).map((k) => caches.delete(k)));
      }
    } catch (err) {
      console.warn("Update cache cleanup failed", err);
    }

    location.reload();
  }

  function wireEvents() {
    $("dateInput").value = currentDate;
    $("dateInput").addEventListener("change", (e) => setDate(e.target.value));
    $("prevDay").addEventListener("click", () => setDate(dateAdd(currentDate, -1)));
    $("nextDay").addEventListener("click", () => setDate(dateAdd(currentDate, 1)));

    $("saveBtn").addEventListener("click", () => saveCurrentFromUI(true));

    $("badDayBtn").addEventListener("click", () => {
      if (!confirm("Set all empty actions to Min today?")) return;
      const entry = getEntry(currentDate);
      data.habits.forEach((habit) => {
        if (!entry.habits[habit.id].status) entry.habits[habit.id].status = "min";
      });
      saveCurrentFromUI(false);
      renderToday();
    });

    $$(".tabs button").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    $("refreshProgress").addEventListener("click", renderProgress);
    $("exportJson").addEventListener("click", exportJson);
    $("exportCsv").addEventListener("click", exportCsv);
    $("exportConfig").addEventListener("click", exportConfig);
    $("addHabit").addEventListener("click", addHabit);
    $("resetDefaults").addEventListener("click", resetDefaults);
    $("forceUpdate").addEventListener("click", forceUpdate);

    $("helpBtn").addEventListener("click", () => $("helpModal").classList.remove("hidden"));
    $("closeHelp").addEventListener("click", () => $("helpModal").classList.add("hidden"));
    $("helpModal").addEventListener("click", (e) => {
      if (e.target.id === "helpModal") $("helpModal").classList.add("hidden");
    });

    $("importFile").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const result = importPayload(JSON.parse(await file.text()));
        alert(result);
      } catch (err) {
        alert("Import failed: " + err.message);
      } finally {
        e.target.value = "";
      }
    });

    $("importPasted").addEventListener("click", () => {
      const text = $("pasteImport").value.trim();
      if (!text) {
        alert("Paste JSON first");
        return;
      }
      try {
        const result = importPayload(JSON.parse(text));
        alert(result);
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    });

    $("clearPaste").addEventListener("click", () => {
      $("pasteImport").value = "";
    });

    window.addEventListener("beforeunload", () => saveCurrentFromUI(false));
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js?v=3").catch((err) => console.warn("SW register failed", err));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireEvents();
    renderToday();
    registerServiceWorker();
  });
})();
