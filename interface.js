(() => {
  "use strict";

  const KEY = "habitAppTest.uiLanguage";
  const LANGS = ["ru","en","de","lt","es","fr"];
  const NAMES = { ru:"Русский", en:"English", de:"Deutsch", lt:"Lietuvių", es:"Español", fr:"Français" };
  const $ = (id) => document.getElementById(id);
  let lang = (() => {
    const saved = localStorage.getItem(KEY);
    if (LANGS.includes(saved)) return saved;
    const detected = String(navigator.language || "en").slice(0,2).toLowerCase();
    return LANGS.includes(detected) ? detected : "en";
  })();
  let dict = { en:{} };
  let reverse = new Map();
  let scheduled = false;

  async function loadDictionaries() {
    const codes = ["ru","de","lt","es","fr"];
    await Promise.all(codes.map(async (code) => {
      try {
        const response = await fetch(`./i18n-${code}.json?v=15`, { cache:"no-store" });
        if (response.ok) dict[code] = await response.json();
      } catch (err) {
        console.warn(`i18n ${code} failed`, err);
        dict[code] = {};
      }
    }));
    rebuildReverse();
  }

  function rebuildReverse() {
    reverse = new Map();
    const keys = new Set(Object.values(dict).flatMap((d) => Object.keys(d || {})));
    for (const key of keys) {
      reverse.set(key, key);
      for (const code of Object.keys(dict)) {
        const value = dict[code]?.[key];
        if (value) reverse.set(String(value).trim(), key);
      }
    }
  }

  function tr(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    const key = reverse.get(text);
    if (key) return lang === "en" ? key : (dict[lang]?.[key] || key);
    return dynamic(text);
  }

  function words() {
    return {
      en:{days:"days",photos:"photos",chart:"days on chart",selected:"Selected period",saved:"Saved",ended:"ended",done:"Done",min:"Min",fail:"Fail",skip:"Skip",general:"General"},
      ru:{days:"дней",photos:"фото",chart:"дней на графике",selected:"Выбранный период",saved:"Сохранено",ended:"завершена",done:"Выполнено",min:"Минимум",fail:"Провал",skip:"Пропуск",general:"Общая"},
      de:{days:"Tage",photos:"Fotos",chart:"Tage im Diagramm",selected:"Ausgewählter Zeitraum",saved:"Gespeichert",ended:"beendet",done:"Erledigt",min:"Minimum",fail:"Fehler",skip:"Übersprungen",general:"Gesamt"},
      lt:{days:"dienų",photos:"nuotraukų",chart:"dienų grafike",selected:"Pasirinktas laikotarpis",saved:"Išsaugota",ended:"baigta",done:"Atlikta",min:"Minimumas",fail:"Nesėkmė",skip:"Praleista",general:"Bendra"},
      es:{days:"días",photos:"fotos",chart:"días en el gráfico",selected:"Periodo seleccionado",saved:"Guardado",ended:"finalizada",done:"Hecho",min:"Mínimo",fail:"Fallo",skip:"Omitido",general:"General"},
      fr:{days:"jours",photos:"photos",chart:"jours sur le graphique",selected:"Période sélectionnée",saved:"Enregistré",ended:"terminé",done:"Fait",min:"Minimum",fail:"Échec",skip:"Ignoré",general:"Général"}
    }[lang];
  }

  function dynamic(v) {
    const w = words();
    let m;
    if ((m = /^(\d+) (?:days|дней|Tage|dienų|días|jours)$/.exec(v))) return `${m[1]} ${w.days}`;
    if ((m = /^(\d+) (?:photos?|фото|Fotos|nuotraukų|fotos|photos)$/.exec(v))) return `${m[1]} ${w.photos}`;
    if ((m = /^(\d+) (?:days on chart|дней на графике|Tage im Diagramm|dienų grafike|días en el gráfico|jours sur le graphique)$/.exec(v))) return `${m[1]} ${w.chart}`;
    if ((m = /^(?:Selected period|Выбранный период|Ausgewählter Zeitraum|Pasirinktas laikotarpis|Periodo seleccionado|Période sélectionnée) · (\d+) (?:days|дней|Tage|dienų|días|jours)$/.exec(v))) return `${w.selected} · ${m[1]} ${w.days}`;
    if ((m = /^(?:Saved|Сохранено|Gespeichert|Išsaugota|Guardado|Enregistré): (.+)$/.exec(v))) return `${w.saved}: ${m[1]}`;
    if ((m = /^(?:ended|завершена|beendet|baigta|finalizada|terminé) (\d{4}-\d{2}-\d{2})$/.exec(v))) return `${w.ended} ${m[1]}`;
    if ((m = /^(?:Done|Выполнено|Erledigt|Atlikta|Hecho|Fait) (\d+) · (?:Min|Минимум|Minimum|Minimumas|Mínimo) (\d+) · (?:Fail|Провал|Fehler|Nesėkmė|Fallo|Échec) (\d+) · (?:Skip|Пропуск|Übersprungen|Praleista|Omitido|Ignoré) (\d+)$/.exec(v))) return `${w.done} ${m[1]} · ${w.min} ${m[2]} · ${w.fail} ${m[3]} · ${w.skip} ${m[4]}`;
    if ((m = /^General (.+)\/(5|10) · (\d+) done · (\d+) min$/.exec(v)) || (m = /^Общая (.+)\/(5|10) · (\d+) выполнено · (\d+) минимум$/.exec(v))) return `${w.general} ${m[1]}/${m[2]} · ${m[3]} ${w.done.toLowerCase()} · ${m[4]} ${w.min.toLowerCase()}`;
    return null;
  }

  function userContent(el) {
    return !el || ["habitDetailTitle","habitDetailDescription","habitDetailMin","habitDetailDone","habitContextNotes","habitDailyNotes"].includes(el.id) || Boolean(el.closest(".habitDescription,.habitName,.mediaItemFooter,#mediaTopicFilters,.previewTextTopic h4,.previewComment,.previewTags")) || el.matches("#mediaTagFilter option:not([value='']),#uiLanguage option");
  }

  function translateElement(el) {
    if (userContent(el)) return;
    const current = String(el.textContent || "").trim();
    const next = tr(current);
    if (next && next !== current) el.textContent = next;
  }

  function translateCompound() {
    document.querySelectorAll("label").forEach((label) => {
      if (userContent(label)) return;
      const node = Array.from(label.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && String(n.textContent || "").trim());
      if (!node) return;
      const current = String(node.textContent || "").trim();
      const next = tr(current);
      if (next && next !== current) node.textContent = node.textContent.replace(current, next);
    });
    document.querySelectorAll("summary,.tag,b").forEach(translateElement);
  }

  function translateAttrs() {
    document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach((el) => {
      if (userContent(el)) return;
      const next = tr(el.placeholder);
      if (next) el.placeholder = next;
    });
    document.querySelectorAll("[title],[aria-label]").forEach((el) => {
      for (const attr of ["title","aria-label"]) {
        const current = el.getAttribute(attr);
        const next = tr(current);
        if (next) el.setAttribute(attr, next);
      }
    });
  }

  function ensureLanguageCard() {
    const section = $("tab-settings");
    if (!section || $("uiLanguageCard")) return;
    const card = document.createElement("div");
    card.id = "uiLanguageCard";
    card.className = "card";
    card.innerHTML = `<div class="sectionTitle"><h2>Interface language</h2></div><label>Language<select id="uiLanguage">${LANGS.map((code) => `<option value="${code}">${NAMES[code]}</option>`).join("")}</select></label><div class="hint topSpace">Only the application interface is translated. Your topic names, descriptions, comments, notes, plans and tags stay exactly as entered.</div>`;
    section.insertAdjacentElement("afterbegin", card);
    $("uiLanguage").value = lang;
    $("uiLanguage").addEventListener("change", () => {
      lang = LANGS.includes($("uiLanguage").value) ? $("uiLanguage").value : "en";
      localStorage.setItem(KEY, lang);
      apply();
    });
  }

  function apply() {
    ensureLanguageCard();
    document.documentElement.lang = lang;
    if ($("uiLanguage") && $("uiLanguage").value !== lang) $("uiLanguage").value = lang;
    document.querySelectorAll(".testBanner,.tabs button,button,h1,h2,h3,h4,.hint,.small,.pill,.lbl,.quote,#helpModal li,option").forEach(translateElement);
    translateCompound();
    translateAttrs();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; apply(); }, 25);
  }

  function progressDensity(days, resetScroll) {
    const count = Number(days) || Number(document.querySelector("[data-history-days].active")?.dataset.historyDays) || 7;
    const scroller = $("positiveChartScroller");
    const available = Math.max(280, scroller?.clientWidth || 320);
    const gap = count <= 7 ? 9 : count <= 30 ? 5 : 3;
    const width = count <= 7 ? Math.max(36, Math.min(54, Math.floor((available - 8 - (count - 1) * gap) / count))) : count <= 30 ? 28 : 18;
    const barWidth = Math.max(7, Math.min(22, Math.floor((width - 5) / 2)));
    for (const chart of [$("positiveChart"),$("negativeChart")].filter(Boolean)) {
      chart.style.gap = `${gap}px`;
      chart.querySelectorAll(".dayBars").forEach((g) => { g.style.width = `${width}px`; g.style.flexBasis = `${width}px`; });
      chart.querySelectorAll(".stackBar,.streakBar").forEach((b) => { b.style.width = `${barWidth}px`; });
    }
    let label = $("historyScaleLabel");
    if (!label && $("historyRange")) {
      label = document.createElement("div");
      label.id = "historyScaleLabel";
      label.className = "small historyRange";
      $("historyRange").insertAdjacentElement("afterend", label);
    }
    if (label) label.textContent = `${count} ${words().chart}`;
    if (resetScroll) ["positiveChartScroller","negativeChartScroller"].forEach((id) => { const el = $(id); if (el) el.scrollLeft = 0; });
  }

  async function init() {
    await loadDictionaries();
    ensureLanguageCard();
    apply();
    setTimeout(() => progressDensity(Number(document.querySelector("[data-history-days].active")?.dataset.historyDays) || 7, false), 140);
    new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true, characterData:true });
    document.addEventListener("click", (event) => {
      const period = event.target?.closest?.("[data-history-days]");
      if (period) {
        const days = Number(period.dataset.historyDays) || 7;
        setTimeout(() => { progressDensity(days, true); apply(); }, 90);
        setTimeout(() => progressDensity(days, true), 240);
      } else if (event.target?.closest?.("#historyPrev,#historyNext,[data-tab='progress']")) {
        const days = Number(document.querySelector("[data-history-days].active")?.dataset.historyDays) || 7;
        setTimeout(() => progressDensity(days, false), 120);
      }
    });
    window.addEventListener("resize", () => {
      const days = Number(document.querySelector("[data-history-days].active")?.dataset.historyDays) || 7;
      setTimeout(() => progressDensity(days, false), 100);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
