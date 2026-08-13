(() => {
  "use strict";

  const model = window.LifeTrackerMigrationV4;
  if (!model) throw new Error("LifeTrackerMigrationV4 must be loaded before daybook-v4.js");

  const STORE_KEY = "lifeTrackerData.v4";
  const GENERAL_5_START = "2026-08-13";
  const PHOTO_DB = "habitAppTestPhotosV1";
  const PHOTO_STORE = "photos";
  const TEST_CACHE_PREFIX = "habit-app-test-";

  const RU = {
    ai_engineering: {
      min: "Минимум: не менее ~15 минут конкретного прогресса — AI API, Python, агент, MCP, RAG, eval, Cloud Run AI-сервис, data/AI-интеграция, технический эксперимент или чтение с конкретной заметкой о том, что применить.",
      done: "Сделано: примерно 45–90+ минут содержательной проектной работы или завершённый технический результат."
    },
    metaforge_product: {
      min: "Минимум: один осязаемый шаг — полезный вопрос разработчикам, гипотеза измерения, идея по воронке, аналитический запрос, оформленная продуктовая идея, задача на внедрение или содержательное обсуждение.",
      done: "Сделано: существенный прогресс — аудит аналитики, анализ воронки, tracking design, dashboard/data model, предложение эксперимента, внедрение, кейс или измеримый продуктовый результат."
    },
    trading_investing: {
      min: "Минимум: анализ/журнал/разбор позиции/checklist сетапа ИЛИ review портфеля и аллокации, запланированная инвестиция или обновление инвестиционного плана. Сам факт сделки не считается.",
      done: "Сделано: для трейдинга — анализ + сетап + checklist + риск/стоп + журнал (+ пост-анализ, когда применимо); либо содержательное запланированное действие/review по инвестициям."
    },
    career_income: {
      min: "Минимум: одно конкретное карьерное действие — посмотреть подходящую вакансию, улучшить CV/LinkedIn, написать человеку, зафиксировать достижение или продвинуть важную карьерную задачу.",
      done: "Сделано: значимый результат — отклик, интервью, существенное обновление CV/портфолио, важное рабочее достижение, разговор о роли/доходе или внешняя возможность заработка."
    },
    body_nutrition: {
      min: "Минимум: осмысленная физическая активность и в целом контролируемое питание.",
      done: "Сделано: хорошая тренировка/движение плюс в целом качественное питание."
    },
    son_connection: {
      min: "Минимум: 5–10 минут звонка/видеозвонка, голосовое, фото, короткий содержательный обмен, спросить о его дне или поделиться чем-то из папиного дня.",
      done: "Сделано: более длинное качественное общение, совместная онлайн-активность, планирование/подготовка следующей встречи, содержательная удалённая активность или качественное время вместе."
    },
    people_contact: {
      min: "Минимум: один содержательный контакт с человеком — звонок, разговор, кофе, прогулка, встреча, социальная активность или хорошее общение с коллегой/другом/родными.",
      done: "Сделано: заметный живой/социальный опыт, который дал энергию или ощущение связи."
    },
    money: {
      min: "Минимум: записать/проверить расходы, избежать очевидной импульсивной покупки или посмотреть ближайшие траты.",
      done: "Сделано: осознанное планирование расходов, review cash-flow/бюджета, распределение сбережений или более крупное финансовое решение."
    },
    recovery_tomorrow: {
      min: "Минимум: подготовить или проверить план на завтра, сделать базовую подготовку и принять разумное решение по сну/восстановлению.",
      done: "Сделано: завтра спланирован, полезная подготовка выполнена, ориентир по сну соблюдён и восстановление не проигнорировано."
    },
    life_experience: {
      min: "Минимум: один намеренный опыт вне рутины — новый маршрут/прогулка, велосипед, кино, кафе, культурное событие, плавание, новое место, активность, встреча или небольшая вылазка. Пассивный отдых дома не считается.",
      done: "Сделано: более заметный опыт — мини-поездка, концерт, театр, событие, новый город/место, содержательная активность или что-то, что хочется запомнить."
    }
  };

  const OLD_EN = {
    ai_engineering: [
      "At least ~15 minutes of concrete progress: AI API, Python, agent, MCP, RAG, eval, Cloud Run AI service, data/AI integration, technical experiment, or reading followed by a concrete implementation note.",
      "Approximately 45–90+ minutes of meaningful project work or a completed technical deliverable."
    ],
    metaforge_product: [
      "One tangible step: useful developer question, measurement hypothesis, funnel idea, analytics query, documented product idea, implementation task, or meaningful discussion.",
      "Substantial progress such as analytics audit, funnel analysis, tracking design, dashboard/data model, experiment proposal, implementation, case-study work, or measurable product outcome."
    ],
    trading_investing: [
      "Trading analysis/journal/position review/setup-checklist OR portfolio/allocation review, planned investment, or investment-plan update. Executing a trade alone does not count.",
      "Trading: analysis + setup + checklist + risk/stop + journal (+ post-analysis when applicable), or a meaningful planned investing action/review."
    ],
    career_income: [
      "One small concrete career action: inspect a vacancy, improve CV/LinkedIn, contact someone, document an accomplishment, or move an important career task.",
      "Meaningful result: application, interview, significant CV/portfolio update, major current-work achievement, salary/career discussion, or external income opportunity."
    ],
    body_nutrition: [
      "Meaningful movement and reasonably controlled nutrition.",
      "Strong training/movement day plus generally good nutrition."
    ],
    son_connection: [
      "5–10 minute call/video call, voice message, photo, short meaningful exchange, ask about his day, or share something from dad’s day.",
      "Longer quality conversation, shared online activity, planning/preparing the next meeting, meaningful remote activity, or actual quality time together."
    ],
    people_contact: [
      "One meaningful human interaction: real call, conversation, coffee, walk, meeting, social activity, or meaningful interaction with colleague/friend/family.",
      "A substantial live/social experience that gives energy or connection."
    ],
    money: [
      "Record/check spending, avoid an obvious impulse purchase, or review upcoming spending.",
      "Planned spending, budget/cash-flow review, savings allocation, or a larger financial decision made deliberately."
    ],
    recovery_tomorrow: [
      "Prepare or review tomorrow’s plan, basic preparation, and a reasonable bedtime/recovery decision.",
      "Tomorrow planned; useful preparation completed; bedtime target respected; useful recovery."
    ],
    life_experience: [
      "One deliberate experience outside routine: new walk/route, bicycle, cinema, café, cultural event, swimming, new place, activity, meeting, or small outing. Passive entertainment at home does not count.",
      "A more substantial experience: mini-trip, concert, theatre, event, new city/place, meaningful activity, or something worth remembering."
    ]
  };

  const baseDefinitionsForDate = model.definitionsForDate.bind(model);
  model.definitionsForDate = function definitionsForDateWithCarryover(data, date) {
    const base = baseDefinitionsForDate(data, date);
    const entry = data?.entries?.[date];
    if (!entry?.habits) return base;
    const seen = new Set(base.map((h) => h.id));
    const extras = (data.habits || [])
      .filter((h) => h?.definitionSetId === "legacy_v3" && h.endDate && date > h.endDate)
      .filter((h) => {
        const record = entry.habits[h.id];
        return record && [record.status, record.comment, record.notes]
          .some((v) => v != null && String(v).trim() !== "");
      })
      .filter((h) => !seen.has(h.id))
      .map((h) => ({ ...h, name: `Legacy carryover · ${h.name}`, _legacyCarryover: true }));
    return [...base, ...extras];
  };

  function applyRussianDefaults(data) {
    if (!data || !Array.isArray(data.habits)) return data;
    data.habits.forEach((habit) => {
      if (habit?.definitionSetId !== "life_v4" || !RU[habit.id]) return;
      const old = OLD_EN[habit.id] || [];
      const currentMin = String(habit.minDescription || habit.min || "");
      const currentDone = String(habit.doneDescription || "");
      if (!currentMin || currentMin === old[0]) {
        habit.minDescription = RU[habit.id].min;
        habit.min = RU[habit.id].min;
      }
      if (!currentDone || currentDone === old[1]) {
        habit.doneDescription = RU[habit.id].done;
      }
    });
    return data;
  }

  const baseNormalize = model.normalizeV4.bind(model);
  model.normalizeV4 = (source) => applyRussianDefaults(baseNormalize(source));
  const baseMigrate = model.migrateV3ToV4.bind(model);
  model.migrateV3ToV4 = (source) => applyRussianDefaults(baseMigrate(source));
  const baseLoad = model.loadOrMigrateStorage.bind(model);
  model.loadOrMigrateStorage = function loadOrMigrateStorageWithDaybook(storage) {
    const loaded = baseLoad(storage);
    if (!loaded) return loaded;
    applyRussianDefaults(loaded);
    storage.setItem(STORE_KEY, JSON.stringify(loaded));
    return loaded;
  };

  function selectedDate() {
    return document.getElementById("dateInput")?.value || new Date().toISOString().slice(0, 10);
  }

  function dateAdd(date, days) {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
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
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  function ensureEntry(data, date) {
    data.entries = data.entries && typeof data.entries === "object" ? data.entries : {};
    if (!data.entries[date]) {
      data.entries[date] = { date, metrics: {}, habits: {}, dayNote: "", updatedAt: null };
    }
    return data.entries[date];
  }

  function storedGeneral(date) {
    const data = readData();
    const value = data?.entries?.[date]?.metrics?.general;
    return value == null ? "" : String(value);
  }

  function generalMax(date) {
    return date >= GENERAL_5_START ? 5 : 10;
  }

  function validGeneral(value, date) {
    if (value === "") return true;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= generalMax(date);
  }

  function sanitizeGeneral(showMessage = true, dateOverride = "") {
    const input = document.getElementById("general");
    if (!input) return true;
    const date = dateOverride || selectedDate();
    if (validGeneral(input.value, date)) return true;
    input.value = storedGeneral(date);
    const status = document.getElementById("saveStatus");
    if (showMessage && status) {
      status.textContent = `General должен быть от 0 до ${generalMax(date)}. Неверное значение не сохранено.`;
    }
    return false;
  }

  function updateGeneralUi() {
    const input = document.getElementById("general");
    if (!input) return;
    const max = generalMax(selectedDate());
    input.max = String(max);
    input.placeholder = max === 5 ? "3.5" : "7.5";
    const label = document.querySelector('label[for="general"]');
    if (label) label.textContent = `General 0–${max}`;
    const pill = document.getElementById("dayScorePill");
    if (pill && pill.textContent.includes("General")) {
      pill.textContent = pill.textContent.replace(/\/10\b/, `/${max}`);
    }
  }

  function guardNavigation(event) {
    const target = event.target?.closest?.("button, input");
    if (!target) return;
    const needsGuard =
      target.id === "saveBtn" ||
      target.id === "prevDay" ||
      target.id === "nextDay" ||
      target.id === "dateInput" ||
      Boolean(target.closest(".tabs"));
    if (needsGuard && !sanitizeGeneral(true)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  let dateBeforeChange = "";
  let lastAppDate = "";
  document.addEventListener("focusin", (event) => {
    if (event.target?.id === "dateInput") dateBeforeChange = event.target.value || "";
  }, true);

  document.addEventListener("click", guardNavigation, true);
  document.addEventListener("change", (event) => {
    if (event.target?.id === "dateInput") {
      if (!sanitizeGeneral(true, dateBeforeChange || lastAppDate || selectedDate())) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      dateBeforeChange = event.target.value || "";
      lastAppDate = event.target.value || "";
      setTimeout(() => {
        updateGeneralUi();
        renderPlan();
        renderPhoto();
        postProcessHabits();
      }, 0);
    }
  }, true);
  window.addEventListener("beforeunload", () => sanitizeGeneral(false), true);

  async function testForceUpdate(event) {
    const button = event.target?.closest?.("#forceUpdate");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        const mine = regs.filter((r) => r.scope.includes("/habit-app-test/"));
        await Promise.all(mine.map((r) => r.update()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith(TEST_CACHE_PREFIX)).map((k) => caches.delete(k)));
      }
    } finally {
      location.reload();
    }
  }
  document.addEventListener("click", testForceUpdate, true);

  function postProcessHabits() {
    const data = readData();
    const date = selectedDate();
    if (!data) return;
    const defs = model.definitionsForDate(data, date);
    const byName = new Map(defs.map((h) => [h.name, h]));
    document.querySelectorAll("#habits .habit").forEach((card) => {
      const nameEl = card.querySelector(".habitName");
      const hint = card.querySelector(".habitMin");
      if (!nameEl || !hint) return;
      const cleanName = nameEl.textContent.replace(/^\d+\.\s*/, "");
      const def = byName.get(cleanName) || defs.find((h) => cleanName.endsWith(h.name));
      hint.textContent = def?.description || "";
      hint.classList.add("habitDescription");
    });
    updateGeneralUi();
  }

  function installHabitObserver() {
    const container = document.getElementById("habits");
    if (!container) return;
    const observer = new MutationObserver(() => postProcessHabits());
    observer.observe(container, { childList: true, subtree: true });
    postProcessHabits();
  }

  function previousTaskOptions(data, date, currentTask) {
    const options = [];
    Object.keys(data.entries || {})
      .filter((d) => d < date && d >= dateAdd(date, -60))
      .sort().reverse()
      .forEach((d) => {
        (data.entries[d]?.planTasks || []).forEach((task) => {
          if (!task?.text) return;
          options.push({
            value: `${d}|${task.id}`,
            label: `${d} · ${task.text}${task.done ? " ✓" : ""}`
          });
        });
      });
    const selected = currentTask?.continuationOf || "";
    return `<option value="">— не связано —</option>` +
      options.map((o) => `<option value="${escapeAttr(o.value)}" ${o.value === selected ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[ch]);
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function ensurePlanCard() {
    if (document.getElementById("dayPlanCard")) return;
    const todaySection = document.getElementById("tab-today");
    const cards = todaySection?.querySelectorAll(":scope > .card");
    if (!todaySection || !cards?.length) return;
    const card = document.createElement("div");
    card.id = "dayPlanCard";
    card.className = "card";
    card.innerHTML = `
      <div class="sectionTitle">
        <h2>План на день</h2>
        <button id="copyOpenPlan" type="button">Открытые → завтра</button>
      </div>
      <label for="planNote">Фокус / общий план</label>
      <textarea id="planNote" class="planNote" placeholder="Главный фокус, подготовка, важные мысли на этот день..."></textarea>
      <div class="planAddRow topSpace">
        <input id="newPlanTask" type="text" placeholder="Новая задача">
        <button id="addPlanTask" class="btnGood" type="button">＋</button>
      </div>
      <div id="planTasks" class="planTasks"></div>
    `;
    cards[0].insertAdjacentElement("afterend", card);

    document.getElementById("planNote").addEventListener("change", savePlanNote);
    document.getElementById("addPlanTask").addEventListener("click", addPlanTask);
    document.getElementById("newPlanTask").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addPlanTask(); }
    });
    document.getElementById("copyOpenPlan").addEventListener("click", copyOpenPlanToTomorrow);
  }

  function savePlanNote() {
    const data = readData();
    if (!data) return;
    const date = selectedDate();
    const entry = ensureEntry(data, date);
    entry.planNote = document.getElementById("planNote")?.value || "";
    entry.updatedAt = new Date().toISOString();
    writeData(data);
  }

  function addPlanTask() {
    const input = document.getElementById("newPlanTask");
    const text = input?.value.trim();
    if (!text) return;
    const data = readData();
    if (!data) return;
    const entry = ensureEntry(data, selectedDate());
    entry.planTasks = Array.isArray(entry.planTasks) ? entry.planTasks : [];
    entry.planTasks.push({
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      done: false,
      continuationOf: "",
      createdAt: new Date().toISOString()
    });
    entry.updatedAt = new Date().toISOString();
    writeData(data);
    input.value = "";
    renderPlan();
  }

  function updateTask(taskId, patch) {
    const data = readData();
    if (!data) return;
    const entry = ensureEntry(data, selectedDate());
    entry.planTasks = Array.isArray(entry.planTasks) ? entry.planTasks : [];
    const task = entry.planTasks.find((t) => t.id === taskId);
    if (!task) return;
    Object.assign(task, patch);
    entry.updatedAt = new Date().toISOString();
    writeData(data);
    renderPlan();
  }

  function deleteTask(taskId) {
    const data = readData();
    if (!data) return;
    const entry = ensureEntry(data, selectedDate());
    entry.planTasks = (entry.planTasks || []).filter((t) => t.id !== taskId);
    entry.updatedAt = new Date().toISOString();
    writeData(data);
    renderPlan();
  }

  function copyTaskToTomorrow(taskId) {
    const data = readData();
    if (!data) return;
    const date = selectedDate();
    const source = data.entries?.[date]?.planTasks?.find((t) => t.id === taskId);
    if (!source) return;
    const nextDate = dateAdd(date, 1);
    const target = ensureEntry(data, nextDate);
    target.planTasks = Array.isArray(target.planTasks) ? target.planTasks : [];
    target.planTasks.push({
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: source.text,
      done: false,
      continuationOf: `${date}|${source.id}`,
      createdAt: new Date().toISOString()
    });
    target.updatedAt = new Date().toISOString();
    writeData(data);
    const status = document.getElementById("saveStatus");
    if (status) status.textContent = `Задача скопирована на ${nextDate}.`;
  }

  function copyOpenPlanToTomorrow() {
    const data = readData();
    if (!data) return;
    const date = selectedDate();
    const open = (data.entries?.[date]?.planTasks || []).filter((t) => !t.done && t.text);
    if (!open.length) return;
    const nextDate = dateAdd(date, 1);
    const target = ensureEntry(data, nextDate);
    target.planTasks = Array.isArray(target.planTasks) ? target.planTasks : [];
    const existingKeys = new Set(target.planTasks.map((t) => t.continuationOf));
    open.forEach((task) => {
      const link = `${date}|${task.id}`;
      if (existingKeys.has(link)) return;
      target.planTasks.push({
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text: task.text,
        done: false,
        continuationOf: link,
        createdAt: new Date().toISOString()
      });
    });
    target.updatedAt = new Date().toISOString();
    writeData(data);
    const status = document.getElementById("saveStatus");
    if (status) status.textContent = `Открытые задачи скопированы на ${nextDate}.`;
  }

  function renderPlan() {
    ensurePlanCard();
    const box = document.getElementById("planTasks");
    const note = document.getElementById("planNote");
    if (!box || !note) return;
    const data = readData();
    if (!data) return;
    const date = selectedDate();
    const entry = data.entries?.[date] || {};
    note.value = entry.planNote || "";
    const tasks = Array.isArray(entry.planTasks) ? entry.planTasks : [];
    box.innerHTML = tasks.length ? "" : `<div class="hint topSpace">Пока задач нет. Добавь одну через ＋.</div>`;

    tasks.forEach((task) => {
      const row = document.createElement("div");
      row.className = `planTask ${task.done ? "planTaskDone" : ""}`;
      row.innerHTML = `
        <div class="planTaskMain">
          <input class="planTaskText" type="text" value="${escapeAttr(task.text || "")}" aria-label="Task text">
          <button class="${task.done ? "" : "btnGood"}" data-action="done" type="button">${task.done ? "↩" : "✓"}</button>
        </div>
        <label class="planLinkLabel">Продолжение предыдущего дела
          <select class="planLink">${previousTaskOptions(data, date, task)}</select>
        </label>
        <div class="planTaskActions">
          <button data-action="tomorrow" type="button">→ завтра</button>
          <button data-action="delete" class="btnBad" type="button">Удалить</button>
        </div>
      `;
      const text = row.querySelector(".planTaskText");
      text.addEventListener("change", () => updateTask(task.id, { text: text.value.trim() }));
      const link = row.querySelector(".planLink");
      link.addEventListener("change", () => updateTask(task.id, { continuationOf: link.value }));
      row.querySelector('[data-action="done"]').addEventListener("click", () => updateTask(task.id, { done: !task.done }));
      row.querySelector('[data-action="tomorrow"]').addEventListener("click", () => copyTaskToTomorrow(task.id));
      row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteTask(task.id));
      box.appendChild(row);
    });
  }

  function ensureCalendarTab() {
    if (document.querySelector('[data-tab="calendar"]')) return;
    const tabs = document.querySelector(".tabs");
    const main = document.querySelector("main");
    if (!tabs || !main) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.tab = "calendar";
    button.textContent = "Calendar";
    tabs.appendChild(button);

    const section = document.createElement("section");
    section.id = "tab-calendar";
    section.className = "hidden";
    section.innerHTML = `
      <div class="card">
        <div class="sectionTitle">
          <button id="calendarPrev" type="button">‹</button>
          <input id="calendarMonth" type="month">
          <button id="calendarNext" type="button">›</button>
        </div>
        <div class="hint">Показывает записи Life Tracker: заметки, план, статусы и Photo of the Day. Системный iPhone Calendar потребует отдельного native iOS-доступа.</div>
        <div class="calendarWeekdays"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div>
        <div id="calendarGrid" class="calendarGrid"></div>
      </div>
    `;
    main.appendChild(section);

    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      switchToCalendar();
    });
    document.getElementById("calendarPrev").addEventListener("click", () => shiftCalendarMonth(-1));
    document.getElementById("calendarNext").addEventListener("click", () => shiftCalendarMonth(1));
    document.getElementById("calendarMonth").addEventListener("change", renderCalendar);
  }

  function switchToCalendar() {
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === "calendar"));
    ["today", "progress", "export", "settings"].forEach((name) => {
      document.getElementById(`tab-${name}`)?.classList.add("hidden");
    });
    document.getElementById("tab-calendar")?.classList.remove("hidden");
    const month = document.getElementById("calendarMonth");
    if (month && !month.value) month.value = selectedDate().slice(0, 7);
    renderCalendar();
  }

  function shiftCalendarMonth(delta) {
    const input = document.getElementById("calendarMonth");
    if (!input) return;
    const [y, m] = (input.value || selectedDate().slice(0, 7)).split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    input.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    renderCalendar();
  }

  function dayHasContent(entry) {
    if (!entry) return false;
    if ((entry.dayNote || "").trim() || (entry.planNote || "").trim()) return true;
    if ((entry.planTasks || []).length) return true;
    if (entry.photo?.present) return true;
    return Object.values(entry.habits || {}).some((h) => h && [h.status, h.comment, h.notes].some((v) => v && String(v).trim()));
  }

  function renderCalendar() {
    const grid = document.getElementById("calendarGrid");
    const input = document.getElementById("calendarMonth");
    if (!grid || !input) return;
    if (!input.value) input.value = selectedDate().slice(0, 7);
    const [year, month] = input.value.split("-").map(Number);
    const first = new Date(year, month - 1, 1);
    const days = new Date(year, month, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const data = readData() || { entries: {} };
    grid.innerHTML = "";
    for (let i = 0; i < offset; i += 1) {
      const blank = document.createElement("div");
      blank.className = "calendarBlank";
      grid.appendChild(blank);
    }
    for (let day = 1; day <= days; day += 1) {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const entry = data.entries?.[date];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `calendarDay ${date === selectedDate() ? "calendarSelected" : ""} ${dayHasContent(entry) ? "calendarHasData" : ""}`;
      const taskCount = (entry?.planTasks || []).length;
      btn.innerHTML = `<strong>${day}</strong><span>${entry?.photo?.present ? "📷" : ""}${taskCount ? ` · ${taskCount} задач` : ""}</span>`;
      btn.addEventListener("click", () => {
        const dateInput = document.getElementById("dateInput");
        dateInput.value = date;
        dateInput.dispatchEvent(new Event("change", { bubbles: true }));
        const daybook = document.querySelector('[data-tab="today"]');
        daybook?.click();
      });
      grid.appendChild(btn);
    }
  }

  function openPhotoDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(PHOTO_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE, { keyPath: "date" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function photoGet(date) {
    const db = await openPhotoDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, "readonly");
      const req = tx.objectStore(PHOTO_STORE).get(date);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function photoPut(record) {
    const db = await openPhotoDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, "readwrite");
      tx.objectStore(PHOTO_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function photoDelete(date) {
    const db = await openPhotoDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, "readwrite");
      tx.objectStore(PHOTO_STORE).delete(date);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function photoAll() {
    const db = await openPhotoDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, "readonly");
      const req = tx.objectStore(PHOTO_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  function ensurePhotoCard() {
    if (document.getElementById("photoDayCard")) return;
    const plan = document.getElementById("dayPlanCard");
    if (!plan) return;
    const card = document.createElement("div");
    card.id = "photoDayCard";
    card.className = "card";
    card.innerHTML = `
      <div class="sectionTitle"><h2>Photo of the Day</h2><span id="photoStatus" class="pill">нет фото</span></div>
      <div id="photoPreviewWrap" class="photoPreviewWrap hidden"><img id="photoPreview" alt="Photo of the day"></div>
      <input id="photoInput" class="fileInput" type="file" accept="image/*">
      <div class="footerBtns topSpace">
        <button id="exportSelectedPhoto" type="button">Export photo</button>
        <button id="removePhoto" class="btnBad" type="button">Удалить</button>
      </div>
      <div class="hint topSpace">Фото хранится локально в IndexedDB этого test app, отдельно от JSON. Для полного backup используй Export → Photos backup.</div>
    `;
    plan.insertAdjacentElement("afterend", card);
    document.getElementById("photoInput").addEventListener("change", saveSelectedPhoto);
    document.getElementById("removePhoto").addEventListener("click", removeSelectedPhoto);
    document.getElementById("exportSelectedPhoto").addEventListener("click", exportSelectedPhoto);
  }

  let previewUrl = "";
  async function renderPhoto() {
    ensurePhotoCard();
    const status = document.getElementById("photoStatus");
    const wrap = document.getElementById("photoPreviewWrap");
    const img = document.getElementById("photoPreview");
    if (!status || !wrap || !img) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    const record = await photoGet(selectedDate()).catch(() => null);
    if (!record?.blob) {
      status.textContent = "нет фото";
      wrap.classList.add("hidden");
      img.removeAttribute("src");
      return;
    }
    previewUrl = URL.createObjectURL(record.blob);
    img.src = previewUrl;
    wrap.classList.remove("hidden");
    status.textContent = `${Math.round((record.size || record.blob.size || 0) / 1024)} KB`;
  }

  async function saveSelectedPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const date = selectedDate();
    await photoPut({
      date,
      blob: file,
      name: file.name || `photo-${date}`,
      type: file.type || "application/octet-stream",
      size: file.size || 0,
      updatedAt: new Date().toISOString()
    });
    const data = readData();
    if (data) {
      const entry = ensureEntry(data, date);
      entry.photo = { present: true, name: file.name || "", type: file.type || "", size: file.size || 0, updatedAt: new Date().toISOString() };
      entry.updatedAt = new Date().toISOString();
      writeData(data);
    }
    event.target.value = "";
    await renderPhoto();
  }

  async function removeSelectedPhoto() {
    const date = selectedDate();
    await photoDelete(date);
    const data = readData();
    if (data?.entries?.[date]) {
      delete data.entries[date].photo;
      data.entries[date].updatedAt = new Date().toISOString();
      writeData(data);
    }
    await renderPhoto();
  }

  function downloadBlob(filename, blob) {
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

  async function exportSelectedPhoto() {
    const record = await photoGet(selectedDate());
    if (!record?.blob) return;
    const ext = (record.name || "").includes(".") ? "" : ".jpg";
    downloadBlob(record.name || `photo-${record.date}${ext}`, record.blob);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const [head, body] = dataUrl.split(",");
    const mime = /data:([^;]+)/.exec(head)?.[1] || "application/octet-stream";
    const bytes = atob(body);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  async function exportPhotosBackup() {
    const photos = await photoAll();
    const items = [];
    for (const photo of photos) {
      items.push({
        date: photo.date,
        name: photo.name,
        type: photo.type,
        updatedAt: photo.updatedAt,
        dataUrl: await blobToDataUrl(photo.blob)
      });
    }
    const payload = {
      app: "Life Tracker PWA",
      type: "photos-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      photos: items
    };
    downloadBlob(`life-tracker-photos-${selectedDate()}.json`, new Blob([JSON.stringify(payload)], { type: "application/json" }));
  }

  async function importPhotosBackup(file) {
    const parsed = JSON.parse(await file.text());
    if (parsed?.type !== "photos-backup" || !Array.isArray(parsed.photos)) throw new Error("Not a Life Tracker photos backup");
    const data = readData();
    for (const photo of parsed.photos) {
      if (!photo?.date || !photo.dataUrl) continue;
      const blob = dataUrlToBlob(photo.dataUrl);
      await photoPut({
        date: photo.date,
        blob,
        name: photo.name || `photo-${photo.date}`,
        type: photo.type || blob.type,
        size: blob.size,
        updatedAt: photo.updatedAt || new Date().toISOString()
      });
      if (data) {
        const entry = ensureEntry(data, photo.date);
        entry.photo = { present: true, name: photo.name || "", type: photo.type || blob.type, size: blob.size, updatedAt: photo.updatedAt || new Date().toISOString() };
      }
    }
    if (data) writeData(data);
    await renderPhoto();
  }

  function ensurePhotoExport() {
    const exportTab = document.getElementById("tab-export");
    if (!exportTab || document.getElementById("photoExportCard")) return;
    const card = document.createElement("div");
    card.id = "photoExportCard";
    card.className = "card";
    card.innerHTML = `
      <h2>Photos backup</h2>
      <p class="hint">Отдельный backup всех Photo of the Day. JSON содержит сами изображения, поэтому файл может быть большим.</p>
      <div class="footerBtns">
        <button id="exportPhotosBackup" class="btnGood" type="button">Export photos</button>
        <label class="photoImportLabel">Import photos<input id="importPhotosBackup" type="file" accept=".json,application/json"></label>
      </div>
    `;
    exportTab.appendChild(card);
    document.getElementById("exportPhotosBackup").addEventListener("click", exportPhotosBackup);
    document.getElementById("importPhotosBackup").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await importPhotosBackup(file);
        alert("Photos backup imported.");
      } catch (err) {
        alert(`Photo import failed: ${err.message}`);
      } finally {
        e.target.value = "";
      }
    });
  }

  function ensureMetricSettings() {
    const section = document.getElementById("tab-settings");
    if (!section || document.getElementById("metricVisibilityCard")) return;
    const card = document.createElement("div");
    card.id = "metricVisibilityCard";
    card.className = "card";
    card.innerHTML = `
      <h2>Visible day metrics</h2>
      <p class="hint">Body / metric убран. Выбери, какие оставшиеся метрики показывать в Daybook.</p>
      <div id="metricVisibilityOptions" class="metricVisibilityOptions"></div>
    `;
    section.appendChild(card);
    const labels = { general: "General", sleep: "Sleep", energy: "Energy", stress: "Stress" };
    const data = readData();
    const allowed = Object.keys(labels);
    let visible = (data?.settings?.visibleMetrics || allowed).filter((x) => allowed.includes(x));
    if (!visible.length) visible = allowed.slice();
    const options = card.querySelector("#metricVisibilityOptions");
    allowed.forEach((id) => {
      const label = document.createElement("label");
      label.className = "metricToggle";
      label.innerHTML = `<input type="checkbox" value="${id}" ${visible.includes(id) ? "checked" : ""}> <span>${labels[id]}</span>`;
      options.appendChild(label);
    });
    options.addEventListener("change", () => {
      const selected = Array.from(options.querySelectorAll('input[type="checkbox"]:checked')).map((x) => x.value);
      if (!selected.length) {
        const changed = options.querySelector('input[type="checkbox"]:not(:checked)');
        if (changed) changed.checked = true;
        return;
      }
      const latest = readData();
      if (!latest) return;
      latest.settings = latest.settings || {};
      latest.settings.visibleMetrics = selected;
      writeData(latest);
      applyMetricVisibility();
    });
    applyMetricVisibility();
  }

  function applyMetricVisibility() {
    const data = readData();
    const allowed = ["general", "sleep", "energy", "stress"];
    let visible = (data?.settings?.visibleMetrics || allowed).filter((x) => allowed.includes(x));
    if (!visible.length) visible = allowed.slice();
    allowed.forEach((id) => {
      document.getElementById(id)?.closest(".metricBox")?.classList.toggle("hidden", !visible.includes(id));
    });
    document.getElementById("body")?.closest(".metricBox")?.classList.add("hidden");
  }

  function hideExtendedDailyNote() {
    const input = document.getElementById("habitDailyNotes");
    if (!input) return;
    input.classList.add("hidden");
    const label = document.querySelector('label[for="habitDailyNotes"]');
    label?.classList.add("hidden");
  }

  function init() {
    lastAppDate = selectedDate();
    const daybookTab = document.querySelector('[data-tab="today"]');
    if (daybookTab) daybookTab.textContent = "Daybook";
    ensurePlanCard();
    ensurePhotoCard();
    ensureCalendarTab();
    ensurePhotoExport();
    ensureMetricSettings();
    hideExtendedDailyNote();
    applyMetricVisibility();
    installHabitObserver();
    renderPlan();
    renderPhoto();
    updateGeneralUi();

    document.querySelectorAll('.tabs button:not([data-tab="calendar"])').forEach((button) => {
      button.addEventListener("click", () => {
        document.getElementById("tab-calendar")?.classList.add("hidden");
      });
    });

    const dateInput = document.getElementById("dateInput");
    dateInput?.addEventListener("change", () => {
      setTimeout(() => {
        renderPlan();
        renderPhoto();
        updateGeneralUi();
        postProcessHabits();
      }, 0);
    });
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(init, 0));
})();