(() => {
  "use strict";

  const model = window.LifeTrackerMigrationV4;
  if (!model) throw new Error("LifeTrackerMigrationV4 must be loaded before app-v4.js");

  const APP_VERSION = model.APP_VERSION;
  const STORE_KEY = "lifeTrackerData.v4";
  const V3_STORE_KEY = "lifeTrackerData.v3";

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let data = loadData();
  let currentDate = todayStr();
  let openHabitId = null;

  function todayStr() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 10);
  }

  function htmlEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[ch]);
  }

  function csvEscape(value) {
    const s = String(value ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createFreshData() {
    return model.migrateV3ToV4({
      version: 3,
      appVersion: "3.0-public-safe",
      createdAt: new Date().toISOString(),
      habits: [],
      entries: {}
    });
  }

  function loadData() {
    try {
      const loaded = model.loadOrMigrateStorage(localStorage);
      if (loaded) return loaded;
    } catch (err) {
      console.error("Failed to load/migrate local data", err);
      const v3Raw = localStorage.getItem(V3_STORE_KEY);
      if (v3Raw) {
        alert("Life Tracker could not safely migrate your v3 data. The original v3 storage was left untouched. Export/backup it before continuing.");
        throw err;
      }
      const v4Raw = localStorage.getItem(STORE_KEY);
      if (v4Raw) {
        alert("Life Tracker found v4 data but could not read it safely. It will not overwrite that data.");
        throw err;
      }
    }
    return createFreshData();
  }

  function persist() {
    data.version = model.SCHEMA_VERSION;
    data.appVersion = APP_VERSION;
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  function dateAdd(date, days) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function definitionsForDate(date) {
    return model.definitionsForDate(data, date);
  }

  function getDefinition(id, date = currentDate) {
    return definitionsForDate(date).find((habit) => habit.id === id)
      || data.habits.find((habit) => habit.id === id)
      || null;
  }

  function emptyEntry(date) {
    return { date, metrics: {}, habits: {}, dayNote: "", updatedAt: null };
  }

  function getEntry(date, create = false) {
    const existing = data.entries?.[date];
    if (existing) return existing;
    if (!create) return emptyEntry(date);
    const entry = emptyEntry(date);
    if (!data.entries || typeof data.entries !== "object") data.entries = {};
    data.entries[date] = entry;
    return entry;
  }

  function readHabitRecord(entry, habitId) {
    const item = entry?.habits?.[habitId];
    return item && typeof item === "object" ? item : { status: "", comment: "", notes: "" };
  }

  function ensureHabitRecord(entry, habitId) {
    if (!entry.habits || typeof entry.habits !== "object") entry.habits = {};
    if (!entry.habits[habitId] || typeof entry.habits[habitId] !== "object") {
      entry.habits[habitId] = { status: "", comment: "" };
    }
    return entry.habits[habitId];
  }

  function normalizedText(value) {
    return value == null ? "" : String(value);
  }

  function setDate(date) {
    saveCurrentFromUI(false);
    currentDate = date;
    $("dateInput").value = currentDate;
    renderToday();
  }

  function saveCurrentFromUI(showStatus = true, forceChanged = false) {
    const existing = data.entries?.[currentDate] || null;
    const view = existing || emptyEntry(currentDate);
    const proposedMetrics = {
      general: $("general")?.value || "",
      sleep: $("sleep")?.value || "",
      energy: $("energy")?.value || "",
      stress: $("stress")?.value || "",
      body: $("body")?.value || ""
    };
    const proposedDayNote = $("dayNote")?.value || "";
    const commentChanges = [];
    const metricChanges = [];

    Object.entries(proposedMetrics).forEach(([key, value]) => {
      const oldValue = normalizedText(view.metrics?.[key]);
      if (oldValue !== value) metricChanges.push([key, value]);
    });

    for (const habit of definitionsForDate(currentDate)) {
      const el = $("comment-" + habit.id);
      if (!el) continue;
      const oldValue = normalizedText(view.habits?.[habit.id]?.comment);
      const nextValue = el.value || "";
      if (oldValue !== nextValue) commentChanges.push([habit.id, nextValue]);
    }

    const dayNoteChanged = normalizedText(view.dayNote) !== proposedDayNote;
    const changed = forceChanged || metricChanges.length > 0 || commentChanges.length > 0 || dayNoteChanged;

    if (changed) {
      const entry = getEntry(currentDate, true);
      if (!entry.metrics || typeof entry.metrics !== "object") entry.metrics = {};

      metricChanges.forEach(([key, value]) => { entry.metrics[key] = value; });
      commentChanges.forEach(([habitId, value]) => {
        ensureHabitRecord(entry, habitId).comment = value;
      });
      if (dayNoteChanged) entry.dayNote = proposedDayNote;

      entry.updatedAt = new Date().toISOString();
      persist();
    }

    renderScore();
    if (showStatus && $("saveStatus")) {
      $("saveStatus").textContent = changed
        ? "Saved: " + new Date().toLocaleTimeString()
        : "No changes";
    }
    return changed;
  }

  function renderMetrics(entry) {
    $("general").value = entry.metrics?.general ?? "";
    $("sleep").value = entry.metrics?.sleep ?? "";
    $("energy").value = entry.metrics?.energy ?? "";
    $("stress").value = entry.metrics?.stress ?? "";
    $("body").value = entry.metrics?.body ?? "";
  }

  function renderToday() {
    const entry = getEntry(currentDate, false);
    renderMetrics(entry);
    $("dayNote").value = entry.dayNote || "";

    const habits = definitionsForDate(currentDate);
    const container = $("habits");
    container.innerHTML = "";

    habits.forEach((habit, index) => {
      const item = readHabitRecord(entry, habit.id);
      const status = item.status || "";
      const hasNotes = Boolean(item.notes || habit.contextNotes);
      const minText = habit.minDescription || habit.min || "Minimum";

      const div = document.createElement("div");
      div.className = "habit";
      div.innerHTML = `
        <div class="habitTop">
          <div class="habitName">${index + 1}. ${htmlEscape(habit.name)}</div>
          <button type="button" class="notesBtn" data-details="${htmlEscape(habit.id)}" aria-label="Open details and notes">${hasNotes ? "📝" : "ⓘ"}</button>
        </div>
        <div class="hint habitMin">MIN: ${htmlEscape(minText)}</div>
        <div class="statusBtns">
          <button type="button" class="${status === "done" ? "active done" : ""}" data-habit="${htmlEscape(habit.id)}" data-status="done">Done</button>
          <button type="button" class="${status === "min" ? "active min" : ""}" data-habit="${htmlEscape(habit.id)}" data-status="min">Min</button>
          <button type="button" class="${status === "skip" ? "active skip" : ""}" data-habit="${htmlEscape(habit.id)}" data-status="skip">Skip</button>
          <button type="button" class="${status === "fail" ? "active fail" : ""}" data-habit="${htmlEscape(habit.id)}" data-status="fail">Fail</button>
        </div>
        <textarea id="comment-${htmlEscape(habit.id)}" placeholder="Quick comment">${htmlEscape(item.comment || "")}</textarea>
      `;
      container.appendChild(div);
    });

    $$("button[data-habit]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const e = getEntry(currentDate, true);
        const item = ensureHabitRecord(e, btn.dataset.habit);
        const nextStatus = btn.dataset.status;
        item.status = item.status === nextStatus ? "" : nextStatus;
        saveCurrentFromUI(false, true);
        renderToday();
      });
    });

    $$("button[data-details]", container).forEach((btn) => {
      btn.addEventListener("click", () => openHabitDetails(btn.dataset.details));
    });

    renderScore();
  }

  function statusSummary(entry, date) {
    const summary = { done: 0, min: 0, fail: 0, skip: 0, empty: 0 };
    for (const habit of definitionsForDate(date)) {
      const status = entry.habits?.[habit.id]?.status || "";
      if (status && summary[status] !== undefined) summary[status] += 1;
      else summary.empty += 1;
    }
    return summary;
  }

  function renderScore() {
    const entry = getEntry(currentDate, false);
    const s = statusSummary(entry, currentDate);
    const general = entry.metrics?.general;
    $("dayScorePill").textContent = general !== "" && general != null
      ? `General ${general}/10 · ${s.done} done · ${s.min} min`
      : `${s.done} done · ${s.min} min · ${s.skip} skip`;
  }

  function renderProgress() {
    saveCurrentFromUI(false);
    const days = [];
    for (let i = 6; i >= 0; i -= 1) days.push(dateAdd(currentDate, -i));

    const totals = { done: 0, min: 0, fail: 0, skip: 0 };
    const perHabit = {};

    for (const date of days) {
      const entry = data.entries[date];
      if (!entry) continue;
      const habits = definitionsForDate(date);
      const s = statusSummary(entry, date);
      totals.done += s.done;
      totals.min += s.min;
      totals.fail += s.fail;
      totals.skip += s.skip;

      for (const habit of habits) {
        if (!perHabit[habit.id]) {
          perHabit[habit.id] = { name: habit.name, done: 0, min: 0, fail: 0, skip: 0, tracked: 0 };
        }
        const status = entry.habits?.[habit.id]?.status || "";
        if (status && perHabit[habit.id][status] !== undefined) perHabit[habit.id][status] += 1;
        if (status) perHabit[habit.id].tracked += 1;
      }
    }

    $("statDone").textContent = totals.done;
    $("statMin").textContent = totals.min;
    $("statFail").textContent = totals.fail;
    $("statRate").textContent = totals.skip;
    const rateLabel = $("statRate")?.nextElementSibling;
    if (rateLabel?.classList.contains("lbl")) rateLabel.textContent = "skip";

    const progressBox = $("habitProgress");
    progressBox.innerHTML = "";
    Object.values(perHabit).forEach((habit) => {
      const div = document.createElement("div");
      div.className = "habit";
      div.innerHTML = `
        <div class="habitTop"><div class="habitName">${htmlEscape(habit.name)}</div></div>
        <div class="hint topSpace">Done ${habit.done} · Min ${habit.min} · Fail ${habit.fail} · Skip ${habit.skip}</div>
      `;
      progressBox.appendChild(div);
    });

    const insights = [];
    if (!Object.keys(perHabit).length) insights.push("Not enough data in this 7-day window yet.");
    if (totals.fail) insights.push(`${totals.fail} fail status(es) in this window — review context rather than treating it as an overall score.`);
    if (totals.skip) insights.push(`${totals.skip} planned skip status(es); SKIP is not treated as failure.`);
    if (!insights.length) insights.push("Use the topic history/notes to reflect on continuity rather than chasing a single productivity score.");
    $("autoInsights").innerHTML = insights.map((x) => `<p>• ${htmlEscape(x)}</p>`).join("");
  }

  function openHabitDetails(habitId) {
    saveCurrentFromUI(false);
    const habit = getDefinition(habitId, currentDate);
    if (!habit) return;
    const entry = getEntry(currentDate, false);
    const item = readHabitRecord(entry, habitId);
    openHabitId = habitId;

    $("habitDetailTitle").textContent = habit.name;
    $("habitDetailDescription").textContent = habit.description || "";
    $("habitDetailMin").textContent = habit.minDescription || habit.min || "";
    $("habitDetailDone").textContent = habit.doneDescription || "";
    $("habitContextNotes").value = habit.contextNotes || "";
    $("habitDailyNotes").value = item.notes || "";
    $("habitDetailDate").textContent = currentDate;
    $("habitDetailModal").classList.remove("hidden");
  }

  function saveHabitDetails() {
    if (!openHabitId) return;
    const habit = getDefinition(openHabitId, currentDate);
    if (!habit) return;

    const existingEntry = getEntry(currentDate, false);
    const existingItem = readHabitRecord(existingEntry, openHabitId);
    const nextContextNotes = $("habitContextNotes").value || "";
    const nextDailyNotes = $("habitDailyNotes").value || "";
    const contextChanged = normalizedText(habit.contextNotes) !== nextContextNotes;
    const dailyChanged = normalizedText(existingItem.notes) !== nextDailyNotes;

    if (contextChanged) habit.contextNotes = nextContextNotes;
    if (dailyChanged) {
      const entry = getEntry(currentDate, true);
      ensureHabitRecord(entry, openHabitId).notes = nextDailyNotes;
      entry.updatedAt = new Date().toISOString();
    }
    if (contextChanged || dailyChanged) persist();

    $("habitDetailModal").classList.add("hidden");
    openHabitId = null;
    renderToday();
  }

  function renderSettings() {
    saveCurrentFromUI(false);
    const list = $("settingsList");
    list.innerHTML = "";

    const definitions = model.definitionsForSettings(data, todayStr());
    definitions.forEach((habit) => {
      const currentlyValid = model.isDefinitionValidOn(habit, todayStr());
      const div = document.createElement("div");
      div.className = "habit";
      div.innerHTML = `
        <div class="habitTop">
          <div class="habitName">${htmlEscape(habit.name)}</div>
          <span class="tag">${currentlyValid ? "current" : (habit.endDate ? `ended ${htmlEscape(habit.endDate)}` : "inactive")}</span>
        </div>
        <label>Action name</label>
        <input type="text" data-field="name" data-id="${htmlEscape(habit.id)}" data-start="${htmlEscape(habit.startDate || "")}" value="${htmlEscape(habit.name)}">
        <label>Description</label>
        <textarea data-field="description" data-id="${htmlEscape(habit.id)}" data-start="${htmlEscape(habit.startDate || "")}">${htmlEscape(habit.description || "")}</textarea>
        <label>MIN definition</label>
        <textarea data-field="minDescription" data-id="${htmlEscape(habit.id)}" data-start="${htmlEscape(habit.startDate || "")}">${htmlEscape(habit.minDescription || habit.min || "")}</textarea>
        <label>DONE definition</label>
        <textarea data-field="doneDescription" data-id="${htmlEscape(habit.id)}" data-start="${htmlEscape(habit.startDate || "")}">${htmlEscape(habit.doneDescription || "")}</textarea>
        <label>Persistent topic Notes / Context</label>
        <textarea data-field="contextNotes" data-id="${htmlEscape(habit.id)}" data-start="${htmlEscape(habit.startDate || "")}">${htmlEscape(habit.contextNotes || "")}</textarea>
        <details class="topSpace">
          <summary class="hint">Validity / history settings</summary>
          <div class="settingsDates">
            <label>Start date<input type="date" data-field="startDate" data-id="${htmlEscape(habit.id)}" data-start="${htmlEscape(habit.startDate || "")}" value="${htmlEscape(habit.startDate || "")}"></label>
            <label>End date<input type="date" data-field="endDate" data-id="${htmlEscape(habit.id)}" data-start="${htmlEscape(habit.startDate || "")}" value="${htmlEscape(habit.endDate || "")}"></label>
          </div>
        </details>
        <div class="row topSpace">
          <button type="button" data-move="${htmlEscape(habit.id)}" data-start="${htmlEscape(habit.startDate || "")}" data-dir="-1">↑</button>
          <button type="button" data-move="${htmlEscape(habit.id)}" data-start="${htmlEscape(habit.startDate || "")}" data-dir="1">↓</button>
          ${currentlyValid ? `<button type="button" class="btnBad" data-end="${htmlEscape(habit.id)}" data-start="${htmlEscape(habit.startDate || "")}">End</button>` : ""}
        </div>
      `;
      list.appendChild(div);
    });

    $$('[data-field]', list).forEach((input) => {
      input.addEventListener("change", () => {
        const habit = findDefinitionVersion(input.dataset.id, input.dataset.start);
        if (!habit) return;
        const field = input.dataset.field;
        habit[field] = input.value || (field === "endDate" ? null : "");
        if (field === "minDescription") habit.min = input.value || "";
        persist();
        renderToday();
        renderSettings();
      });
    });

    $$("button[data-end]", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        const habit = findDefinitionVersion(btn.dataset.end, btn.dataset.start);
        if (!habit) return;
        if (!confirm(`End “${habit.name}” from today? Historical entries will remain unchanged.`)) return;
        habit.endDate = dateAdd(todayStr(), -1);
        persist();
        renderSettings();
        renderToday();
      });
    });

    $$("button[data-move]", list).forEach((btn) => {
      btn.addEventListener("click", () => moveDefinition(btn.dataset.move, btn.dataset.start, Number(btn.dataset.dir)));
    });
  }

  function findDefinitionVersion(id, startDate) {
    return data.habits.find((habit) => habit.id === id && String(habit.startDate || "") === String(startDate || ""));
  }

  function moveDefinition(id, startDate, direction) {
    const habit = findDefinitionVersion(id, startDate);
    if (!habit) return;
    const sameSet = data.habits
      .filter((h) => h.definitionSetId === habit.definitionSetId)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    const i = sameSet.indexOf(habit);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= sameSet.length) return;
    const other = sameSet[j];
    const tmp = habit.order;
    habit.order = other.order;
    other.order = tmp;
    persist();
    renderSettings();
    renderToday();
  }

  function addHabit() {
    const name = prompt("Action name:");
    if (!name) return;
    const current = definitionsForDate(todayStr());
    const maxOrder = current.reduce((max, h) => Math.max(max, Number(h.order || 0)), 0);
    data.habits.push({
      id: "h_" + Date.now(),
      name,
      description: "",
      min: "Minimum version",
      minDescription: "Minimum version",
      doneDescription: "",
      contextNotes: "",
      active: true,
      order: maxOrder + 1,
      definitionSetId: "custom_v4",
      startDate: todayStr(),
      endDate: null
    });
    persist();
    renderSettings();
    renderToday();
  }

  function resetDefaults() {
    if (!confirm("Reset only the current v4 category definitions? Historical v3 definitions and all daily entries will remain untouched.")) return;
    data.habits = data.habits.filter((h) => h.definitionSetId !== "life_v4");
    data.habits.push(...model.migrateV3ToV4({ version: 3, habits: [], entries: {} }).habits.filter((h) => h.definitionSetId === "life_v4"));
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
    const payload = { ...data, exportedAt: new Date().toISOString(), app: "Life Tracker PWA" };
    downloadFile(`life-tracker-full-${todayStr()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function exportConfig() {
    saveCurrentFromUI(false);
    const payload = {
      app: "Life Tracker PWA",
      type: "config-only",
      version: model.SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      habits: data.habits,
      settings: data.settings || {}
    };
    downloadFile(`life-tracker-config-${todayStr()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function exportCsv() {
    saveCurrentFromUI(false);
    const rows = [["date", "habit_id", "habit_name", "status", "comment", "notes", "general", "sleep", "energy", "stress", "body", "day_note", "updated_at"]];

    Object.keys(data.entries).sort().forEach((date) => {
      const entry = data.entries[date];
      const datedDefs = definitionsForDate(date);
      const datedById = Object.fromEntries(datedDefs.map((habit) => [habit.id, habit]));
      const ids = new Set([...Object.keys(entry.habits || {}), ...datedDefs.map((h) => h.id)]);
      ids.forEach((id) => {
        const habit = datedById[id] || getDefinition(id, date) || { id, name: id };
        const item = entry.habits?.[id] || {};
        rows.push([
          date, id, habit.name || id, item.status || "", item.comment || "", item.notes || "",
          entry.metrics?.general || "", entry.metrics?.sleep || "", entry.metrics?.energy || "",
          entry.metrics?.stress || "", entry.metrics?.body || "", entry.dayNote || "", entry.updatedAt || ""
        ]);
      });
    });

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    downloadFile(`life-tracker-${todayStr()}.csv`, csv, "text/csv;charset=utf-8");
  }

  function normalizeImported(imported) {
    if (Number(imported.version) === 4) return model.normalizeV4(imported);
    if (Number(imported.version) === 3 || (imported.entries && imported.habits)) return model.migrateV3ToV4(imported);
    throw new Error("Unsupported full JSON schema. Expected version 3 or 4.");
  }

  function importPayload(imported) {
    if (!imported || typeof imported !== "object") throw new Error("Invalid JSON");

    if (imported.type === "config-only" || (imported.habits && !imported.entries)) {
      if (!Array.isArray(imported.habits)) throw new Error("Config JSON has no habits array");
      if (Number(imported.version) === 4) {
        data.habits = clone(imported.habits);
        if (imported.settings) data.settings = { ...(data.settings || {}), ...clone(imported.settings) };
      } else {
        const endYesterday = dateAdd(todayStr(), -1);
        data.habits.forEach((habit) => {
          if (model.isDefinitionValidOn(habit, todayStr())) habit.endDate = endYesterday;
        });
        imported.habits.forEach((habit, index) => data.habits.push({
          ...clone(habit),
          minDescription: habit.minDescription || habit.min || "",
          doneDescription: habit.doneDescription || "",
          contextNotes: habit.contextNotes || "",
          active: true,
          order: index + 1,
          definitionSetId: "imported_config",
          startDate: todayStr(),
          endDate: null
        }));
      }
      persist();
      renderToday();
      renderSettings();
      return "Config imported";
    }

    const incoming = normalizeImported(imported);
    const merge = confirm("OK = merge with current data. Cancel = replace v4 data. Your original lifeTrackerData.v3 key is never deleted by this operation.");
    if (merge) {
      const byVersionKey = new Map(data.habits.map((h) => [`${h.id}|${h.startDate || ""}|${h.endDate || ""}`, h]));
      incoming.habits.forEach((h) => byVersionKey.set(`${h.id}|${h.startDate || ""}|${h.endDate || ""}`, h));
      data.habits = Array.from(byVersionKey.values());
      data.entries = { ...data.entries, ...incoming.entries };
      data.settings = { ...(data.settings || {}), ...(incoming.settings || {}) };
    } else {
      data = incoming;
    }

    persist();
    renderToday();
    renderSettings();
    return `Full JSON v${imported.version || 3} imported`;
  }

  function switchTab(tab) {
    saveCurrentFromUI(false);
    $$(".tabs button").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
    ["today", "progress", "export", "settings"].forEach((name) => $("tab-" + name).classList.toggle("hidden", name !== tab));
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

  function validateGeneral(value) {
    if (value === "") return true;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 10;
  }

  function wireEvents() {
    $("dateInput").value = currentDate;
    $("dateInput").addEventListener("change", (e) => setDate(e.target.value));
    $("prevDay").addEventListener("click", () => setDate(dateAdd(currentDate, -1)));
    $("nextDay").addEventListener("click", () => setDate(dateAdd(currentDate, 1)));
    $("saveBtn").addEventListener("click", () => {
      if (!validateGeneral($("general").value)) {
        alert("General rating must be between 0 and 10.");
        return;
      }
      saveCurrentFromUI(true);
    });

    $("badDayBtn").addEventListener("click", () => {
      if (!confirm("Set all empty current-date categories to Min?")) return;
      let changed = false;
      let entry = data.entries?.[currentDate] || null;
      definitionsForDate(currentDate).forEach((habit) => {
        const existingStatus = entry?.habits?.[habit.id]?.status || "";
        if (existingStatus) return;
        if (!entry) entry = getEntry(currentDate, true);
        ensureHabitRecord(entry, habit.id).status = "min";
        changed = true;
      });
      if (changed) saveCurrentFromUI(false, true);
      renderToday();
    });

    $$(".tabs button").forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
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

    $("closeHabitDetail").addEventListener("click", () => $("habitDetailModal").classList.add("hidden"));
    $("saveHabitDetail").addEventListener("click", saveHabitDetails);
    $("habitDetailModal").addEventListener("click", (e) => {
      if (e.target.id === "habitDetailModal") $("habitDetailModal").classList.add("hidden");
    });

    $("importFile").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try { alert(importPayload(JSON.parse(await file.text()))); }
      catch (err) { alert("Import failed: " + err.message); }
      finally { e.target.value = ""; }
    });

    $("importPasted").addEventListener("click", () => {
      const text = $("pasteImport").value.trim();
      if (!text) return alert("Paste JSON first");
      try { alert(importPayload(JSON.parse(text))); }
      catch (err) { alert("Import failed: " + err.message); }
    });
    $("clearPaste").addEventListener("click", () => { $("pasteImport").value = ""; });
    window.addEventListener("beforeunload", () => saveCurrentFromUI(false));
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js?v=4").catch((err) => console.warn("SW register failed", err));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireEvents();
    renderToday();
    registerServiceWorker();
  });
})();
