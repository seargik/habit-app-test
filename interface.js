(() => {
  "use strict";

  const LANG_KEY = "habitAppTest.uiLanguage";
  const $ = (id) => document.getElementById(id);

  const pairs = [
    ["Daybook", "Дневник"], ["Progress", "Прогресс"], ["Export", "Экспорт"], ["Settings", "Настройки"],
    ["Day", "День"], ["General 0–5", "Общая оценка 0–5"], ["Sleep", "Сон"], ["Energy 1–5", "Энергия 1–5"], ["Stress 1–5", "Стресс 1–5"],
    ["Day note", "Заметка дня"], ["Life categories", "Основные темы"], ["Bad day", "Плохой день"], ["Save day", "Сохранить день"],
    ["Done", "Выполнено"], ["Min", "Минимум"], ["Skip", "Пропуск"], ["Fail", "Провал"],
    ["done", "выполнено"], ["min", "минимум"], ["skip", "пропуск"], ["fail", "провал"],
    ["Refresh", "Обновить"], ["Auto-insights", "Авто-выводы"], ["History charts", "Графики истории"],
    ["Done + Min", "Выполнено + Минимум"], ["Skip + Fail", "Пропуск + Провал"], ["3-day continuity", "3 дня подряд"],
    ["Export / backup", "Экспорт / резервная копия"], ["Full JSON", "Полный JSON"], ["Config only JSON", "Только настройки JSON"],
    ["Import JSON file", "Импорт JSON-файла"], ["Import by paste", "Импорт вставкой"], ["Import pasted JSON", "Импортировать JSON"], ["Clear", "Очистить"],
    ["Migration safety", "Безопасность миграции"], ["Category definitions", "Настройки основных тем"], ["+ Add", "+ Добавить"],
    ["Reset current v4 defaults", "Сбросить текущие настройки v4"], ["Reload test app update", "Перезагрузить тестовое приложение"], ["Privacy rule", "Правило приватности"],
    ["How to use", "Как пользоваться"], ["Close", "Закрыть"], ["Category", "Тема"], ["Persistent topic Notes / Context", "Постоянные заметки / контекст темы"], ["Save notes", "Сохранить заметки"],
    ["Day plan", "План на день"], ["Plan → tomorrow", "План → завтра"], ["Focus / general plan", "Фокус / общий план"], ["New task", "Новая задача"],
    ["No tasks yet. Add one with ＋.", "Пока задач нет. Добавь задачу через ＋."], ["Calendar", "Календарь"],
    ["Photo journal", "Фотодневник"], ["＋ Add photos", "＋ Добавить фото"],
    ["Multiple photos can be added for one day. Comment and tag are stored separately for every photo.", "Можно добавить несколько фото на один день. Комментарий и тэг сохраняются отдельно для каждого фото."],
    ["Media / filtered export", "Медиа / фильтрованный экспорт"], ["Period", "Период"], ["All history", "Вся история"],
    ["Last 7 days", "Последние 7 дней"], ["Last 30 days", "Последние 30 дней"], ["Last 90 days", "Последние 90 дней"], ["Last X days", "Последние X дней"],
    ["Tag", "Тэг"], ["All tags", "Все тэги"], ["What to export", "Что экспортировать"], ["Photos only", "Только фото"],
    ["Photos + comment + tag", "Фото + комментарий + тэг"], ["Photos + comment", "Фото + комментарий"],
    ["Text only — all topics", "Только текст — все темы"], ["Text only — selected topics", "Только текст — выбранные темы"], ["Everything", "Всё всё всё"],
    ["Topics for text export", "Темы для текстового экспорта"], ["Preview content", "Предпросмотр"], ["Preview filter", "Предпросмотр фильтра"],
    ["Export album HTML", "Экспорт HTML-альбома"], ["Export package", "Экспорт пакета"], ["Backup JSON", "Резервный JSON"],
    ["Save photo files / Share", "Сохранить фото / Поделиться"], ["Import media package", "Импорт media package"],
    ["Interface language", "Язык интерфейса"], ["Language", "Язык"], ["Selected period", "Выбранный период"],
    ["Linked to previous topic", "Связана с предыдущей темой"], ["— new independent topic —", "— новая независимая тема —"],
    ["Validity / history settings", "Период действия / история"], ["Open details and notes", "Открыть детали и заметки"],
    ["Quick comment", "Короткий комментарий"], ["Photo comment", "Комментарий к фото"],
    ["Tag, e.g. son, trip, summer", "Тэг, например: son, trip, summer"], ["Choose files", "Выбрать файлы"],
    ["No changes", "Нет изменений"], ["Older period", "Более ранний период"], ["Newer period", "Более новый период"],
    ["status / day", "статусы / день"], ["MIN", "МИНИМУМ"], ["DONE", "ВЫПОЛНЕНО"]
  ];

  const longPairs = [
    ["local-first · test copy · private data stays on this device", "local-first · тестовая копия · личные данные остаются на этом устройстве"],
    ["Description is shown under each category name. MIN / DONE and Persistent Notes open via ⓘ / 📝.", "Под названием каждой категории показано description. MIN / DONE и постоянные заметки открываются через ⓘ / 📝."],
    ["Definitions are dated. Current definitions are shown first; older definitions remain for historical dates. Start/end dates are under “Validity / history settings”.", "Настройки тем имеют даты действия. Сначала показаны текущие; старые сохраняются для истории. Даты начала/окончания находятся в «Период действия / история»."],
    ["Persistent Notes are intentionally compact here; the large editor is in Daybook → category details.", "Постоянные заметки здесь показаны компактно; большой редактор находится в Дневник → детали темы."],
    ["Public GitHub = app code only. Private checklist/progress/photos = local device storage + exported backups.", "Публичный GitHub = только код приложения. Личные отметки/прогресс/фото = локальное хранилище устройства + экспортированные резервные копии."],
    ["Full JSON contains Daybook text data, definitions, plan and photo metadata. Photo files remain local on the device.", "Полный JSON содержит текстовые данные дневника, настройки тем, план и metadata фото. Сами фото остаются локально на устройстве."],
    ["Blue = number of categories that are in the same positive/negative bucket today and were in that bucket on each of the previous 3 consecutive days.", "Синий = количество тем, которые сегодня находятся в той же положительной/отрицательной группе и были в ней каждый из трёх предыдущих дней подряд."],
    ["A new main topic can be linked to an ended topic that it continues.", "Для новой основной темы можно указать завершённую тему, продолжением которой она является."],
    ["Save photo files / Share creates separate image files plus manifest.csv and captions.txt for future collage/video use.", "Сохранить фото / Поделиться создаёт отдельные изображения плюс manifest.csv и captions.txt для будущего коллажа или видео."],
    ["The HTML album is a readable self-contained export with embedded photos and selected text. Backup JSON is intended for restoring data back into Life Tracker.", "HTML-альбом — читаемый самодостаточный экспорт со встроенными фото и выбранным текстом. Backup JSON предназначен для восстановления данных обратно в Life Tracker."]
  ];

  const allPairs = [...pairs, ...longPairs];

  function initialLanguage() {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "ru" || saved === "en") return saved;
    return /^en\b/i.test(navigator.language || "") ? "en" : "ru";
  }

  let language = initialLanguage();
  let scheduled = false;

  function pairFor(text) {
    const value = String(text || "").trim();
    return allPairs.find(([en, ru]) => value === en || value === ru) || null;
  }

  function dynamicText(value) {
    const text = String(value || "").trim();
    let m;
    if ((m = /^(\d+) days$/.exec(text)) || (m = /^(\d+) дней$/.exec(text))) return language === "ru" ? `${m[1]} дней` : `${m[1]} days`;
    if ((m = /^(\d+) фото$/.exec(text)) || (m = /^(\d+) photos?$/.exec(text))) return language === "ru" ? `${m[1]} фото` : `${m[1]} photos`;
    if ((m = /^Selected period · (\d+) days$/.exec(text)) || (m = /^Выбранный период · (\d+) дней$/.exec(text))) return language === "ru" ? `Выбранный период · ${m[1]} дней` : `Selected period · ${m[1]} days`;
    if ((m = /^(\d+) days on chart$/.exec(text)) || (m = /^(\d+) дней на графике$/.exec(text))) return language === "ru" ? `${m[1]} дней на графике` : `${m[1]} days on chart`;
    if ((m = /^Saved: (.+)$/.exec(text)) || (m = /^Сохранено: (.+)$/.exec(text))) return language === "ru" ? `Сохранено: ${m[1]}` : `Saved: ${m[1]}`;
    if ((m = /^Done (\d+) · Min (\d+) · Fail (\d+) · Skip (\d+)$/.exec(text)) || (m = /^Выполнено (\d+) · Минимум (\d+) · Провал (\d+) · Пропуск (\d+)$/.exec(text))) {
      return language === "ru" ? `Выполнено ${m[1]} · Минимум ${m[2]} · Провал ${m[3]} · Пропуск ${m[4]}` : `Done ${m[1]} · Min ${m[2]} · Fail ${m[3]} · Skip ${m[4]}`;
    }
    if ((m = /^(\d+) done · (\d+) min · (\d+) skip$/.exec(text)) || (m = /^(\d+) выполнено · (\d+) минимум · (\d+) пропуск$/.exec(text))) {
      return language === "ru" ? `${m[1]} выполнено · ${m[2]} минимум · ${m[3]} пропуск` : `${m[1]} done · ${m[2]} min · ${m[3]} skip`;
    }
    if ((m = /^General (.+)\/(5|10) · (\d+) done · (\d+) min$/.exec(text)) || (m = /^Общая (.+)\/(5|10) · (\d+) выполнено · (\d+) минимум$/.exec(text))) {
      return language === "ru" ? `Общая ${m[1]}/${m[2]} · ${m[3]} выполнено · ${m[4]} минимум` : `General ${m[1]}/${m[2]} · ${m[3]} done · ${m[4]} min`;
    }
    if ((m = /^(.+) · (\d+) days\.$/.exec(text)) || (m = /^(.+) · (\d+) дней\.$/.exec(text))) return language === "ru" ? `${m[1]} · ${m[2]} дней.` : `${m[1]} · ${m[2]} days.`;
    if ((m = /^Positive statuses: (\d+) \((\d+) Done \+ (\d+) Min\)\.$/.exec(text)) || (m = /^Положительные статусы: (\d+) \((\d+) Выполнено \+ (\d+) Минимум\)\.$/.exec(text))) return language === "ru" ? `Положительные статусы: ${m[1]} (${m[2]} Выполнено + ${m[3]} Минимум).` : `Positive statuses: ${m[1]} (${m[2]} Done + ${m[3]} Min).`;
    if ((m = /^Negative \/ skipped statuses: (\d+) \((\d+) Fail \+ (\d+) Skip\)\.$/.exec(text)) || (m = /^Отрицательные \/ пропуски: (\d+) \((\d+) Провал \+ (\d+) Пропуск\)\.$/.exec(text))) return language === "ru" ? `Отрицательные / пропуски: ${m[1]} (${m[2]} Провал + ${m[3]} Пропуск).` : `Negative / skipped statuses: ${m[1]} (${m[2]} Fail + ${m[3]} Skip).`;
    if ((m = /^Most positive: (.+) · (\d+)\.$/.exec(text)) || (m = /^Самая позитивная тема: (.+) · (\d+)\.$/.exec(text))) return language === "ru" ? `Самая позитивная тема: ${m[1]} · ${m[2]}.` : `Most positive: ${m[1]} · ${m[2]}.`;
    if ((m = /^Most friction: (.+) · (\d+)\.$/.exec(text)) || (m = /^Больше всего сложностей: (.+) · (\d+)\.$/.exec(text))) return language === "ru" ? `Больше всего сложностей: ${m[1]} · ${m[2]}.` : `Most friction: ${m[1]} · ${m[2]}.`;
    return null;
  }

  function isUserContent(el) {
    if (!el) return true;
    if (["habitDetailDescription", "habitDetailMin", "habitDetailDone"].includes(el.id)) return true;
    if (el.closest(".habitDescription,.habitName,.mediaItemFooter,#mediaTopicFilters")) return true;
    if (el.matches("#mediaTagFilter option:not([value=''])")) return true;
    return false;
  }

  function translateElement(el) {
    if (!el || isUserContent(el)) return;
    const current = String(el.textContent || "").trim();
    if (!current) return;
    const pair = pairFor(current);
    const next = pair ? (language === "ru" ? pair[1] : pair[0]) : dynamicText(current);
    if (next && next !== current) el.textContent = next;
  }

  const placeholderPairs = [
    ["Narrative note for the whole day", "Заметка о дне"], ["Quick comment", "Короткий комментарий"],
    ["Plan only for the selected day", "План только для выбранного дня"], ["Новая задача", "New task"],
    ["Комментарий к фото", "Photo comment"], ["Тэг, например: son, trip, summer", "Tag, e.g. son, trip, summer"],
    ["Paste JSON here, then press Import pasted JSON", "Вставь JSON сюда, затем нажми «Импортировать JSON»"],
    ["Principles, strategy, reference notes, checklists...", "Принципы, стратегия, справочные заметки, чек-листы..."]
  ];

  function translateAttributes() {
    document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach((el) => {
      if (el.value) return;
      const p = placeholderPairs.find(([en, ru]) => el.placeholder === en || el.placeholder === ru);
      if (p) el.placeholder = language === "ru" ? p[1] : p[0];
    });
    const titlePairs = [["Copy only this task to the next day", "Скопировать только эту задачу на следующий день"], ["Delete this photo", "Удалить это фото"], ["Open details and notes", "Открыть детали и заметки"]];
    document.querySelectorAll("[title],[aria-label]").forEach((el) => {
      for (const attr of ["title", "aria-label"]) {
        const value = el.getAttribute(attr);
        const p = titlePairs.find(([en, ru]) => value === en || value === ru);
        if (p) el.setAttribute(attr, language === "ru" ? p[1] : p[0]);
      }
    });
  }

  function ensureLanguageCard() {
    const section = $("tab-settings");
    if (!section || $("uiLanguageCard")) return;
    const card = document.createElement("div");
    card.id = "uiLanguageCard";
    card.className = "card";
    card.innerHTML = `<div class="sectionTitle"><h2>Interface language</h2></div><label>Language<select id="uiLanguage"><option value="ru">Русский</option><option value="en">English</option></select></label><div class="hint topSpace" id="uiLanguageHint">Only the application interface is translated. Your topic names, descriptions, comments, notes, plans and tags stay exactly as entered.</div>`;
    section.insertAdjacentElement("afterbegin", card);
    $("uiLanguage").value = language;
    $("uiLanguage").addEventListener("change", () => {
      language = $("uiLanguage").value === "en" ? "en" : "ru";
      localStorage.setItem(LANG_KEY, language);
      applyLanguage();
      window.dispatchEvent(new CustomEvent("lifeTracker:languageChanged", { detail: { language } }));
    });
  }

  function translateSpecialHints() {
    const hint = $("uiLanguageHint");
    if (hint) hint.textContent = language === "ru"
      ? "Переводится только интерфейс приложения. Твои названия тем, descriptions, комментарии, заметки, планы и тэги остаются ровно такими, как ты их ввёл."
      : "Only the application interface is translated. Your topic names, descriptions, comments, notes, plans and tags stay exactly as entered.";
  }

  function applyLanguage() {
    ensureLanguageCard();
    document.documentElement.lang = language;
    if ($("uiLanguage")) $("uiLanguage").value = language;
    const selector = ".tabs button,button,h1,h2,h3,label,.hint,.small,.pill,.lbl,.quote,#helpModal li,option";
    document.querySelectorAll(selector).forEach(translateElement);
    translateAttributes();
    translateSpecialHints();
  }

  function scheduleLanguage() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      applyLanguage();
    }, 20);
  }

  function applyProgressDensity(days, resetScroll) {
    const count = Number(days) || Number(document.querySelector("[data-history-days].active")?.dataset.historyDays) || 7;
    const scroller = $("positiveChartScroller");
    const available = Math.max(280, scroller?.clientWidth || 320);
    const gap = count <= 7 ? 9 : count <= 30 ? 5 : 3;
    const width = count <= 7 ? Math.max(36, Math.min(54, Math.floor((available - 8 - (count - 1) * gap) / count))) : count <= 30 ? 28 : 18;
    const barWidth = Math.max(7, Math.min(22, Math.floor((width - 5) / 2)));
    for (const chart of [$("positiveChart"), $("negativeChart")].filter(Boolean)) {
      chart.style.gap = `${gap}px`;
      chart.querySelectorAll(".dayBars").forEach((group) => { group.style.width = `${width}px`; group.style.flexBasis = `${width}px`; });
      chart.querySelectorAll(".stackBar,.streakBar").forEach((bar) => { bar.style.width = `${barWidth}px`; });
    }
    let label = $("historyScaleLabel");
    if (!label && $("historyRange")) {
      label = document.createElement("div");
      label.id = "historyScaleLabel";
      label.className = "small historyRange";
      $("historyRange").insertAdjacentElement("afterend", label);
    }
    if (label) label.textContent = language === "ru" ? `${count} дней на графике` : `${count} days on chart`;
    if (resetScroll) {
      for (const id of ["positiveChartScroller", "negativeChartScroller"]) {
        const el = $(id);
        if (el) el.scrollLeft = 0;
      }
    }
  }

  function init() {
    ensureLanguageCard();
    applyLanguage();
    setTimeout(() => applyProgressDensity(7, false), 120);

    const observer = new MutationObserver(scheduleLanguage);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    document.addEventListener("click", (event) => {
      const period = event.target?.closest?.("[data-history-days]");
      if (period) {
        const days = Number(period.dataset.historyDays) || 7;
        setTimeout(() => { applyProgressDensity(days, true); applyLanguage(); }, 80);
        setTimeout(() => applyProgressDensity(days, true), 220);
      } else if (event.target?.closest?.("#historyPrev,#historyNext")) {
        const days = Number(document.querySelector("[data-history-days].active")?.dataset.historyDays) || 7;
        setTimeout(() => applyProgressDensity(days, false), 100);
      } else if (event.target?.closest?.('[data-tab="progress"]')) {
        const days = Number(document.querySelector("[data-history-days].active")?.dataset.historyDays) || 7;
        setTimeout(() => applyProgressDensity(days, false), 120);
      }
    });

    window.addEventListener("resize", () => {
      const days = Number(document.querySelector("[data-history-days].active")?.dataset.historyDays) || 7;
      setTimeout(() => applyProgressDensity(days, false), 100);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
