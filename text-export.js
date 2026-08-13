(() => {
  "use strict";

  const STORE = "lifeTrackerData.v4";
  const $ = (id) => document.getElementById(id);
  const model = window.LifeTrackerMigrationV4;

  function readData() {
    try {
      const raw = localStorage.getItem(STORE);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function localToday() {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function addDate(value, days) {
    const d = new Date(`${value}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function rangeStart() {
    const mode = $("mediaRangeMode")?.value || "all";
    if (mode === "all") return "0000-01-01";
    const custom = Math.max(1, Number($("mediaCustomDays")?.value || 30));
    const days = mode === "custom" ? custom : Math.max(1, Number(mode) || 1);
    return addDate(localToday(), -(days - 1));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[ch]);
  }

  function text(value) {
    return esc(value).replace(/\n/g, "<br>");
  }

  function definitions(data, date) {
    let dated = [];
    try { dated = model?.definitionsForDate(data, date) || []; } catch (_) { dated = []; }
    const seen = new Set(dated.map((h) => h.id));
    const entryIds = Object.keys(data.entries?.[date]?.habits || {});
    for (const id of entryIds) {
      if (seen.has(id)) continue;
      const fallback = (data.habits || []).find((h) => h.id === id);
      dated.push(fallback || { id, name: id, order: 9999 });
      seen.add(id);
    }
    return dated.slice().sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999) || String(a.name || a.id).localeCompare(String(b.name || b.id)));
  }

  function collect() {
    const data = readData();
    if (!data) return [];
    const start = rangeStart();
    const end = localToday();
    const out = [];

    for (const date of Object.keys(data.entries || {}).sort()) {
      if (date < start || date > end) continue;
      const entry = data.entries[date] || {};
      const topics = [];
      for (const habit of definitions(data, date)) {
        const record = entry.habits?.[habit.id] || {};
        const status = record.status || "";
        const comment = record.comment || "";
        const notes = record.notes || "";
        if (!status && !String(comment).trim() && !String(notes).trim()) continue;
        topics.push({ name: habit.name || habit.id, status, comment, notes });
      }
      const hasDay = String(entry.dayNote || "").trim() || String(entry.planNote || "").trim() || (entry.planTasks || []).length || topics.length;
      if (!hasDay) continue;
      out.push({
        date,
        metrics: entry.metrics || {},
        dayNote: entry.dayNote || "",
        planNote: entry.planNote || "",
        planTasks: (entry.planTasks || []).map((t) => ({ text: t.text || "", done: Boolean(t.done) })),
        topics
      });
    }
    return out;
  }

  function metricLine(metrics) {
    const parts = [];
    if (metrics?.general !== undefined && String(metrics.general).trim() !== "") parts.push(`General ${esc(metrics.general)}`);
    if (metrics?.sleep !== undefined && String(metrics.sleep).trim() !== "") parts.push(`Sleep ${esc(metrics.sleep)}`);
    if (metrics?.energy !== undefined && String(metrics.energy).trim() !== "") parts.push(`Energy ${esc(metrics.energy)}`);
    if (metrics?.stress !== undefined && String(metrics.stress).trim() !== "") parts.push(`Stress ${esc(metrics.stress)}`);
    return parts.join(" · ");
  }

  function dayHtml(day, prefix) {
    const metrics = metricLine(day.metrics);
    return `<article class="${prefix}TextDay">
      <h3>${esc(day.date)}</h3>
      ${metrics ? `<div class="${prefix}Metrics">${metrics}</div>` : ""}
      ${day.dayNote ? `<section><h4>Day note</h4><div class="${prefix}Body">${text(day.dayNote)}</div></section>` : ""}
      ${day.planNote ? `<section><h4>Plan</h4><div class="${prefix}Body">${text(day.planNote)}</div></section>` : ""}
      ${day.planTasks?.length ? `<section><h4>Tasks</h4><ul>${day.planTasks.map((t) => `<li>${t.done ? "✓" : "○"} ${esc(t.text)}</li>`).join("")}</ul></section>` : ""}
      ${day.topics.map((topic) => `<section class="${prefix}TextTopic"><h4>${esc(topic.name)}${topic.status ? ` <span>${esc(topic.status)}</span>` : ""}</h4>${topic.comment ? `<div><b>Comment:</b> ${text(topic.comment)}</div>` : ""}${topic.notes ? `<div><b>Notes:</b> ${text(topic.notes)}</div>` : ""}</section>`).join("")}
    </article>`;
  }

  function ensureCss() {
    if ($("textExportCss")) return;
    const style = document.createElement("style");
    style.id = "textExportCss";
    style.textContent = `
      .previewTextDay{border:1px solid var(--line);border-radius:12px;background:#0b1220;padding:11px;margin:10px 0}
      .previewTextDay h3{margin:0 0 8px}.previewMetrics{color:#93c5fd;font-size:11px;margin-bottom:8px}
      .previewTextDay h4{margin:9px 0 4px}.previewBody{white-space:pre-wrap}.previewTextTopic{border-top:1px solid var(--line);padding-top:8px;margin-top:8px}.previewTextTopic h4 span{font-size:10px;color:#93c5fd;text-transform:uppercase}
    `;
    document.head.appendChild(style);
  }

  function previewAllTopics(event) {
    if ($("mediaExportMode")?.value !== "text_all") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const box = $("mediaPreviewBox");
    if (!box) return;
    const days = collect();
    box.innerHTML = `<div class="previewSummary"><b>Text only — all topics</b> · ${days.length} days</div>${days.length ? days.map((d) => dayHtml(d, "preview")).join("") : `<div class="hint">No text in current filter.</div>`}`;
    box.classList.remove("hidden");
  }

  function exportAllTopics(event) {
    if ($("mediaExportMode")?.value !== "text_all") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const days = collect();
    const css = `:root{color-scheme:dark;background:#0b1020;color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;padding:20px;background:#0b1020;color:#f3f4f6;line-height:1.5}main{max-width:900px;margin:auto}.albumTextDay{border:1px solid #273244;border-radius:16px;background:#111827;padding:15px;margin:14px 0}.albumTextDay h3{margin:0 0 8px}.albumMetrics{color:#93c5fd;font-size:13px;margin-bottom:10px}.albumTextDay h4{margin:10px 0 5px}.albumBody{white-space:pre-wrap}.albumTextTopic{border-top:1px solid #273244;padding-top:9px;margin-top:9px}.albumTextTopic h4 span{font-size:11px;color:#93c5fd;text-transform:uppercase}@media print{body{background:#fff;color:#111}.albumTextDay{background:#fff;border-color:#ddd;break-inside:avoid}.albumMetrics{color:#333}}`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Life Tracker text ${localToday()}</title><style>${css}</style></head><body><main><h1>Life Tracker — all topics</h1>${days.map((d) => dayHtml(d, "album")).join("") || "<p>No text in current filter.</p>"}</main></body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-tracker-text-all-${localToday()}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function init() {
    ensureCss();
    document.addEventListener("click", (event) => {
      if (event.target?.closest?.("#mediaPreviewBtn")) previewAllTopics(event);
      else if (event.target?.closest?.("#mediaExportHtmlBtn")) exportAllTopics(event);
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
