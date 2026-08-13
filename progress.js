(() => {
  "use strict";

  const STORE = "lifeTrackerData.v4";
  const $ = (id) => document.getElementById(id);
  const model = window.LifeTrackerMigrationV4;
  const state = { days: 7, offset: 0 };

  function read() {
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

  function shortDate(value) {
    const [, m, d] = value.split("-");
    return `${d}.${m}`;
  }

  function injectCss() {
    if ($("progressHistoryCss")) return;
    const style = document.createElement("style");
    style.id = "progressHistoryCss";
    style.textContent = `
      /* Calendar is navigation only; analytics moved to Progress. */
      #tab-calendar .calFill,#tab-calendar .calSummary{display:none!important}
      #tab-calendar .calendarDay{background:#0f1628!important}
      #tab-calendar .calInner{justify-content:flex-start!important}

      /* General accepts both 4.2 and 4,2. */
      #general{font-variant-numeric:tabular-nums}

      /* Save stays available while Daybook is open. */
      #saveBtn{
        position:fixed!important;
        left:50%;
        transform:translateX(-50%);
        bottom:calc(10px + env(safe-area-inset-bottom));
        width:min(calc(100% - 24px),856px)!important;
        z-index:120;
        box-shadow:0 10px 32px rgba(0,0,0,.48);
        border:1px solid rgba(255,255,255,.12);
        backdrop-filter:blur(12px);
      }
      body{padding-bottom:calc(78px + env(safe-area-inset-bottom))}
      #tab-today.hidden #saveBtn{display:none!important}

      .historyCard{overflow:hidden}
      .historyControls{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-top:10px}
      .historyPeriods{display:flex;justify-content:center;gap:6px}
      .historyPeriods button{padding:7px 10px;min-width:44px}
      .historyPeriods button.active{background:#1d4ed8;border-color:#3b82f6}
      .historyRange{text-align:center;margin-top:7px}
      .chartLegend{display:flex;flex-wrap:wrap;gap:10px 14px;margin:10px 0;font-size:11px;color:var(--muted)}
      .legendItem{display:flex;align-items:center;gap:5px}.legendDot{width:10px;height:10px;border-radius:3px;display:inline-block}
      .legendDone{background:#059669}.legendMin{background:#d97706}.legendSkip{background:#6b7280}.legendFail{background:#b91c1c}.legendStreak{background:#2563eb}
      .chartScroller{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;padding:4px 2px 10px;scrollbar-width:thin}
      .barChart{height:250px;display:flex;align-items:flex-end;gap:9px;min-width:max-content;padding:8px 4px 0;border-bottom:1px solid var(--line)}
      .dayBars{width:54px;flex:0 0 54px;height:220px;display:grid;grid-template-rows:1fr auto;gap:5px}
      .barArea{display:flex;gap:5px;align-items:flex-end;height:190px}
      .stackBar,.streakBar{width:22px;height:100%;display:flex;flex-direction:column-reverse;justify-content:flex-start;border-radius:7px 7px 3px 3px;overflow:hidden;background:rgba(255,255,255,.035);position:relative}
      .streakBar{justify-content:flex-start}
      .seg{width:100%;min-height:0}.segDone{background:#059669}.segMin{background:#d97706}.segSkip{background:#6b7280}.segFail{background:#b91c1c}.segStreak{background:#2563eb}
      .barValue{position:absolute;left:50%;transform:translateX(-50%);bottom:4px;font-size:9px;font-weight:800;color:#fff;text-shadow:0 1px 2px #000;z-index:2}
      .barDate{text-align:center;font-size:9px;color:var(--muted);white-space:nowrap}
      .chartEmpty{padding:18px 4px;color:var(--muted)}
      .historyHint{margin-top:8px}
      @media(max-width:520px){
        .historyControls{grid-template-columns:auto 1fr auto}
        .historyPeriods{gap:4px}.historyPeriods button{padding:7px 7px;min-width:38px;font-size:11px}
        .dayBars{width:48px;flex-basis:48px}.barArea{gap:4px}.stackBar,.streakBar{width:20px}
      }
    `;
    document.head.appendChild(style);
  }

  function setupGeneralComma() {
    const input = $("general");
    if (!input || input.dataset.commaReady === "1") return;
    input.dataset.commaReady = "1";
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.setAttribute("pattern", "[0-5]([\\.,][0-9]+)?");

    const normalize = () => {
      const next = String(input.value || "").replace(/,/g, ".").replace(/[^0-9.]/g, "");
      const firstDot = next.indexOf(".");
      input.value = firstDot < 0 ? next : next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, "");
    };
    input.addEventListener("input", normalize);
    input.addEventListener("change", normalize);
    input.addEventListener("blur", normalize);
  }

  function ensureCharts() {
    const section = $("tab-progress");
    if (!section || $("progressHistoryCharts")) return;

    const card = document.createElement("div");
    card.id = "progressHistoryCharts";
    card.className = "card historyCard";
    card.innerHTML = `
      <div class="sectionTitle"><h2>History charts</h2><span class="pill">status / day</span></div>
      <div class="historyControls">
        <button id="historyPrev" type="button" aria-label="Older period">‹</button>
        <div class="historyPeriods">
          <button type="button" data-history-days="7" class="active">7d</button>
          <button type="button" data-history-days="30">30d</button>
          <button type="button" data-history-days="90">90d</button>
        </div>
        <button id="historyNext" type="button" aria-label="Newer period">›</button>
      </div>
      <div id="historyRange" class="historyRange hint"></div>

      <div class="sep"></div>
      <h3>Done + Min</h3>
      <div class="chartLegend">
        <span class="legendItem"><i class="legendDot legendDone"></i>Done</span>
        <span class="legendItem"><i class="legendDot legendMin"></i>Min</span>
        <span class="legendItem"><i class="legendDot legendStreak"></i>3-day continuity</span>
      </div>
      <div id="positiveChartScroller" class="chartScroller"><div id="positiveChart" class="barChart"></div></div>

      <div class="sep"></div>
      <h3>Skip + Fail</h3>
      <div class="chartLegend">
        <span class="legendItem"><i class="legendDot legendSkip"></i>Skip</span>
        <span class="legendItem"><i class="legendDot legendFail"></i>Fail</span>
        <span class="legendItem"><i class="legendDot legendStreak"></i>3-day continuity</span>
      </div>
      <div id="negativeChartScroller" class="chartScroller"><div id="negativeChart" class="barChart"></div></div>
      <div class="hint historyHint">Blue = number of categories that are in the same positive/negative bucket today and were in that bucket on each of the previous 3 consecutive days.</div>`;

    section.insertAdjacentElement("afterbegin", card);

    card.querySelectorAll("[data-history-days]").forEach((button) => {
      button.addEventListener("click", () => {
        state.days = Number(button.dataset.historyDays) || 7;
        state.offset = 0;
        card.querySelectorAll("[data-history-days]").forEach((b) => b.classList.toggle("active", b === button));
        renderCharts(true);
      });
    });

    $("historyPrev").addEventListener("click", () => {
      state.offset += state.days;
      renderCharts(true);
    });
    $("historyNext").addEventListener("click", () => {
      state.offset = Math.max(0, state.offset - state.days);
      renderCharts(true);
    });
  }

  function statusFor(data, entryDate, habitId) {
    return data.entries?.[entryDate]?.habits?.[habitId]?.status || "";
  }

  function inBucket(status, type) {
    return type === "positive"
      ? status === "done" || status === "min"
      : status === "skip" || status === "fail";
  }

  function streakCount(data, entryDate, defs, type) {
    let count = 0;
    for (const habit of defs) {
      if (!inBucket(statusFor(data, entryDate, habit.id), type)) continue;
      let repeated = true;
      for (let back = 1; back <= 3; back += 1) {
        if (!inBucket(statusFor(data, addDate(entryDate, -back), habit.id), type)) {
          repeated = false;
          break;
        }
      }
      if (repeated) count += 1;
    }
    return count;
  }

  function dayStats(data, entryDate) {
    let defs = [];
    try { defs = model?.definitionsForDate(data, entryDate) || []; } catch (_) { defs = []; }
    const e = data.entries?.[entryDate] || {};
    const stats = { date: entryDate, total: Math.max(defs.length, 1), done: 0, min: 0, skip: 0, fail: 0, positiveStreak: 0, negativeStreak: 0 };
    for (const habit of defs) {
      const status = e.habits?.[habit.id]?.status || "";
      if (status === "done") stats.done += 1;
      else if (status === "min") stats.min += 1;
      else if (status === "skip") stats.skip += 1;
      else if (status === "fail") stats.fail += 1;
    }
    stats.positiveStreak = streakCount(data, entryDate, defs, "positive");
    stats.negativeStreak = streakCount(data, entryDate, defs, "negative");
    return stats;
  }

  function makeDayBars(stats, maxTotal, type) {
    const group = document.createElement("div");
    group.className = "dayBars";
    const area = document.createElement("div");
    area.className = "barArea";

    const stack = document.createElement("div");
    stack.className = "stackBar";
    const streak = document.createElement("div");
    streak.className = "streakBar";

    const first = type === "positive" ? stats.done : stats.skip;
    const second = type === "positive" ? stats.min : stats.fail;
    const streakValue = type === "positive" ? stats.positiveStreak : stats.negativeStreak;
    const firstClass = type === "positive" ? "segDone" : "segSkip";
    const secondClass = type === "positive" ? "segMin" : "segFail";

    const a = document.createElement("div");
    a.className = `seg ${firstClass}`;
    a.style.height = `${(first / maxTotal) * 100}%`;
    a.title = `${first}`;
    const b = document.createElement("div");
    b.className = `seg ${secondClass}`;
    b.style.height = `${(second / maxTotal) * 100}%`;
    b.title = `${second}`;
    stack.append(a, b);

    const totalValue = first + second;
    if (totalValue) {
      const value = document.createElement("span");
      value.className = "barValue";
      value.textContent = String(totalValue);
      stack.append(value);
    }

    const blue = document.createElement("div");
    blue.className = "seg segStreak";
    blue.style.height = `${(streakValue / maxTotal) * 100}%`;
    blue.title = `${streakValue}`;
    streak.append(blue);
    if (streakValue) {
      const value = document.createElement("span");
      value.className = "barValue";
      value.textContent = String(streakValue);
      streak.append(value);
    }

    area.append(stack, streak);
    const label = document.createElement("div");
    label.className = "barDate";
    label.textContent = shortDate(stats.date);
    group.append(area, label);
    return group;
  }

  function renderCharts(scrollRight = false) {
    ensureCharts();
    const data = read();
    const positive = $("positiveChart");
    const negative = $("negativeChart");
    if (!data || !positive || !negative) return;

    const anchor = addDate(localToday(), -state.offset);
    const start = addDate(anchor, -(state.days - 1));
    const stats = [];
    for (let i = 0; i < state.days; i += 1) stats.push(dayStats(data, addDate(start, i)));
    const maxTotal = Math.max(1, ...stats.map((item) => item.total));

    positive.innerHTML = "";
    negative.innerHTML = "";
    for (const item of stats) {
      positive.append(makeDayBars(item, maxTotal, "positive"));
      negative.append(makeDayBars(item, maxTotal, "negative"));
    }

    $("historyRange").textContent = `${start} → ${anchor}`;
    $("historyNext").disabled = state.offset === 0;

    if (scrollRight) {
      requestAnimationFrame(() => {
        for (const id of ["positiveChartScroller", "negativeChartScroller"]) {
          const scroller = $(id);
          if (scroller) scroller.scrollLeft = scroller.scrollWidth;
        }
      });
    }
  }

  function init() {
    injectCss();
    setupGeneralComma();
    ensureCharts();

    const progressTab = document.querySelector('[data-tab="progress"]');
    progressTab?.addEventListener("click", () => setTimeout(() => renderCharts(true), 40));
    $("refreshProgress")?.addEventListener("click", () => setTimeout(() => renderCharts(false), 20));
    $("saveBtn")?.addEventListener("click", () => setTimeout(() => renderCharts(false), 20));

    renderCharts(true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
