(() => {
  "use strict";

  const model = window.LifeTrackerMigrationV4;
  if (!model) throw new Error("migration-v4.js must load before daybook.js");

  const STORE = "lifeTrackerData.v4";
  const PHOTO_DB = "habitAppTestPhotosV1";
  const PHOTO_STORE = "photos";
  const $ = (id) => document.getElementById(id);

  const RU = {
    ai_engineering: [
      "Развивать технические навыки для Analytics Engineering, Data/AI Solutions и AI Automation.",
      "Хотя бы ~15 минут конкретного прогресса: AI API, Python, агент, MCP, RAG, eval, Cloud Run AI-сервис, интеграция данных/AI, технический эксперимент или чтение с конкретной заметкой о применении.",
      "Примерно 45–90+ минут содержательной работы над проектом или завершённый технический результат."
    ],
    metaforge_product: [
      "Развивать реальный опыт продукта, роста и данных вне основной зарплатной работы.",
      "Один конкретный шаг: полезный вопрос разработчикам, гипотеза измерения, идея по воронке, аналитический запрос, оформленная продуктовая идея, задача внедрения или содержательное обсуждение.",
      "Существенный прогресс: аудит аналитики, анализ воронки, дизайн tracking, dashboard/data model, предложение эксперимента, внедрение, работа над case study или измеримый продуктовый результат."
    ],
    trading_investing: [
      "Относиться к трейдингу как к дисциплинированному эксперименту, а не развлечению или азартной игре; не терять из вида долгосрочные инвестиции.",
      "Анализ трейда, журнал, review позиции или checklist сетапа; либо review портфеля/аллокации, плановая инвестиция или обновление инвестиционного плана. Сам факт сделки не считается.",
      "Трейдинг: анализ + сетап + checklist + риск/stop + журнал (+ post-analysis, когда применимо); либо содержательное запланированное инвестиционное действие/review."
    ],
    career_income: [
      "Повышать профессиональную рыночную ценность и не застревать в комфортной текущей роли.",
      "Одно небольшое конкретное карьерное действие: посмотреть вакансию, улучшить CV/LinkedIn, связаться с человеком, зафиксировать достижение или продвинуть важную карьерную задачу.",
      "Значимый результат: отклик, интервью, существенное обновление CV/portfolio, важное достижение на текущей работе, разговор о зарплате/карьере или возможность внешнего дохода."
    ],
    body_nutrition: [
      "Здоровье, физическое состояние и ежедневная энергия.",
      "Осмысленная физическая активность и достаточно контролируемое питание.",
      "Хорошая тренировка/активность плюс в целом качественное питание."
    ],
    son_connection: [
      "Поддерживать стабильную связь отец–сын несмотря на расстояние.",
      "5–10 минут звонка/видеосвязи, голосовое сообщение, фото, короткий содержательный обмен, вопрос о его дне или рассказ о папином дне.",
      "Более длинное качественное общение, совместная онлайн-активность, планирование/подготовка следующей встречи, содержательная удалённая активность или настоящее качественное время вместе."
    ],
    people_contact: [
      "Не позволять жизни превращаться только в работу, спортзал, компьютер и телевизор.",
      "Один содержательный контакт с человеком: настоящий звонок, разговор, кофе, прогулка, встреча, социальная активность или качественное общение с коллегой/другом/семьёй.",
      "Существенный живой/социальный опыт, который дал энергию или чувство связи."
    ],
    money: [
      "Поддерживать свободу осознанным контролем cash flow, а не навязчивой экономией на мелочах.",
      "Записать/проверить расходы, избежать очевидной импульсивной покупки или проверить предстоящие траты.",
      "Планирование расходов, review бюджета/cash flow, распределение сбережений или осознанно принятое более крупное финансовое решение."
    ],
    recovery_tomorrow: [
      "Правильно завершать сегодняшний день и уменьшать трение для завтрашнего.",
      "Подготовить или проверить план на завтра, сделать базовую подготовку и принять разумное решение о времени сна/восстановлении.",
      "Завтра спланировано, полезная подготовка сделана, целевое время сна соблюдено и восстановление получилось."
    ],
    life_experience: [
      "Строить интересную жизнь вместо автоматического ухода в пассивный комфорт.",
      "Один осознанный опыт вне рутины: новый маршрут/прогулка, велосипед, кино, кафе, культурное событие, плавание, новое место, активность, встреча или небольшая поездка. Пассивное развлечение дома не считается.",
      "Более существенный опыт: мини-путешествие, концерт, театр, событие, новый город/место, значимая активность или что-то, что хочется запомнить."
    ]
  };

  function upgrade(data) {
    if (!data || !Array.isArray(data.habits)) return data;
    for (const habit of data.habits) {
      const ru = RU[habit?.id];
      if (!ru || habit.definitionSetId !== "life_v4") continue;
      habit.description = ru[0];
      habit.minDescription = habit.min = ru[1];
      habit.doneDescription = ru[2];
    }
    data.settings = data.settings || {};
    data.settings.visibleMetrics = ["general", "sleep", "energy", "stress"];
    return data;
  }

  const normalize0 = model.normalizeV4.bind(model);
  const migrate0 = model.migrateV3ToV4.bind(model);
  const load0 = model.loadOrMigrateStorage.bind(model);
  model.normalizeV4 = (source) => upgrade(normalize0(source));
  model.migrateV3ToV4 = (source) => upgrade(migrate0(source));
  model.loadOrMigrateStorage = (storage) => {
    const data = load0(storage);
    if (!data) return data;
    upgrade(data);
    for (const [entryDate, e] of Object.entries(data.entries || {})) {
      if (entryDate >= "2026-08-13" && e?.metrics) {
        const n = Number(e.metrics.general);
        if (e.metrics.general !== "" && Number.isFinite(n) && n > 5 && n <= 10) {
          e.metrics.general = String(Math.round((n / 2) * 10) / 10);
        }
      }
    }
    storage.setItem(STORE, JSON.stringify(data));
    return data;
  };

  const definitions0 = model.definitionsForDate.bind(model);
  model.definitionsForDate = (data, entryDate) => {
    const base = definitions0(data, entryDate);
    const e = data?.entries?.[entryDate];
    if (!e?.habits) return base;
    const seen = new Set(base.map((habit) => habit.id));
    const extras = (data.habits || [])
      .filter((habit) => habit?.definitionSetId === "legacy_v3" && habit.endDate && entryDate > habit.endDate)
      .filter((habit) => {
        const record = e.habits[habit.id];
        return record && [record.status, record.comment, record.notes]
          .some((value) => value != null && String(value).trim() !== "");
      })
      .filter((habit) => !seen.has(habit.id))
      .map((habit) => ({ ...habit, name: `Legacy carryover · ${habit.name}` }));
    return [...base, ...extras];
  };

  function selectedDate() {
    return $("dateInput")?.value || new Date().toISOString().slice(0, 10);
  }

  function addDate(value, days) {
    const d = new Date(`${value}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function read() {
    try {
      const raw = localStorage.getItem(STORE);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function write(data) {
    localStorage.setItem(STORE, JSON.stringify(data));
  }

  function ensureEntry(data, entryDate) {
    data.entries = data.entries || {};
    if (!data.entries[entryDate]) {
      data.entries[entryDate] = { date: entryDate, metrics: {}, habits: {}, dayNote: "", updatedAt: null };
    }
    return data.entries[entryDate];
  }

  function definitionKey(habit) {
    return `${habit.id}|${habit.startDate || ""}`;
  }

  function injectCss() {
    if ($("daybookRuntimeCss")) return;
    const style = document.createElement("style");
    style.id = "daybookRuntimeCss";
    style.textContent = `
      .habitDescription{white-space:pre-wrap!important;overflow:visible!important;color:var(--muted)}
      .planTask{border:1px solid var(--line);border-radius:14px;padding:10px;background:#0f1628;margin-top:9px}
      .planTask.done{opacity:.72}.planTask.done .taskText{text-decoration:line-through}
      .taskMain{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;align-items:center}
      .taskCheck{width:24px;height:24px;margin:0;accent-color:#34d399}
      .taskFooter{display:flex;justify-content:flex-end;margin-top:8px}
      .taskTomorrow{width:38px;min-width:38px;padding:6px;font-size:18px;line-height:1}
      #photoPreviewWrap{height:33vh;min-height:190px;max-height:360px;display:flex;align-items:center;justify-content:center;cursor:zoom-in;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#080d19;margin-bottom:10px}
      #photoPreviewWrap.hidden{display:none!important}#photoPreviewWrap img{display:block;width:100%;height:100%;object-fit:contain}
      #photoEmpty{height:120px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--line);border-radius:14px;color:var(--muted);margin-bottom:10px}
      #photoEmpty.hidden{display:none!important}
      #photoInput{display:none!important}
      .photoChooseBtn{display:flex;align-items:center;justify-content:center;width:100%;border-radius:13px;padding:11px 13px;background:var(--card2);color:var(--text);font-weight:700;font-size:14px;cursor:pointer}
      #photoFullscreen{position:fixed;inset:0;z-index:9999;background:#000;display:flex;align-items:center;justify-content:center;padding:0}
      #photoFullscreen.hidden{display:none!important}#photoFullscreen img{display:block;width:100%;height:100%;object-fit:contain}
      #photoFullscreen button{position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top));z-index:2;background:rgba(31,41,55,.88)}
      .calendarDay{position:relative;overflow:hidden!important;background:#0f1628!important}
      .calFill{position:absolute;inset:0;z-index:0}.calInner{position:relative;z-index:1;height:100%;width:100%;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between}
      .calSummary{font-size:9px;line-height:1.25;text-align:left;color:#fff;text-shadow:0 1px 2px #000}
      .definitionRelation{margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)}
      .definitionRelation .hint{margin-top:5px}
      @media(max-width:520px){#photoPreviewWrap{height:32vh;min-height:180px}.calendarDay{min-height:72px!important}.calSummary{font-size:8px}}
    `;
    document.head.appendChild(style);
  }

  function renderDescriptions() {
    const data = read();
    if (!data) return;
    const defs = model.definitionsForDate(data, selectedDate());
    const byName = new Map(defs.map((habit) => [habit.name, habit]));
    for (const card of document.querySelectorAll("#habits .habit")) {
      const name = card.querySelector(".habitName")?.textContent.replace(/^\d+\.\s*/, "");
      const habit = byName.get(name) || defs.find((candidate) => name?.endsWith(candidate.name));
      const box = card.querySelector(".habitMin");
      if (!box || !habit) continue;
      const next = habit.description || "";
      if (box.textContent !== next) box.textContent = next;
      box.classList.add("habitDescription");
    }
  }

  function ensurePlanCard() {
    if ($("dayPlanCard")) return;
    const first = document.querySelector("#tab-today > .card");
    if (!first) return;
    const card = document.createElement("div");
    card.id = "dayPlanCard";
    card.className = "card";
    card.innerHTML = `
      <div class="sectionTitle"><h2>План на день</h2><button id="copyPlanTomorrow" type="button">План → завтра</button></div>
      <label for="planNote">Фокус / общий план</label>
      <textarea id="planNote" class="planNote" placeholder="План только для выбранного дня"></textarea>
      <div class="planAddRow topSpace"><input id="newPlanTask" type="text" placeholder="Новая задача"><button id="addPlanTask" class="btnGood" type="button">＋</button></div>
      <div id="planTasks"></div>`;
    first.after(card);
    $("planNote").addEventListener("change", savePlan);
    $("addPlanTask").addEventListener("click", addTask);
    $("newPlanTask").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addTask();
      }
    });
    $("copyPlanTomorrow").addEventListener("click", copyPlanTomorrow);
  }

  function savePlan() {
    const data = read();
    if (!data) return;
    const e = ensureEntry(data, selectedDate());
    e.planNote = $("planNote")?.value || "";
    e.updatedAt = new Date().toISOString();
    write(data);
  }

  function addTask() {
    const input = $("newPlanTask");
    const text = input?.value.trim();
    if (!text) {
      input?.focus();
      return;
    }
    const data = read();
    if (!data) return;
    const e = ensureEntry(data, selectedDate());
    e.planTasks = Array.isArray(e.planTasks) ? e.planTasks : [];
    e.planTasks.push({
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text,
      done: false,
      createdAt: new Date().toISOString()
    });
    e.updatedAt = new Date().toISOString();
    write(data);
    input.value = "";
    renderPlan();
  }

  function updateTask(id, patch) {
    const data = read();
    const e = data && ensureEntry(data, selectedDate());
    const task = e?.planTasks?.find((item) => item.id === id);
    if (!task) return;
    Object.assign(task, patch);
    e.updatedAt = new Date().toISOString();
    write(data);
  }

  function copyTaskTomorrow(id) {
    const data = read();
    const entryDate = selectedDate();
    const source = data?.entries?.[entryDate]?.planTasks?.find((item) => item.id === id);
    if (!source) return;
    const nextDate = addDate(entryDate, 1);
    const target = ensureEntry(data, nextDate);
    target.planTasks = Array.isArray(target.planTasks) ? target.planTasks : [];
    const sourceRef = `${entryDate}|${source.id}`;
    if (target.planTasks.some((item) => item.copiedFrom === sourceRef || item.continuationOf === sourceRef)) return;
    target.planTasks.push({
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: source.text,
      done: false,
      copiedFrom: sourceRef,
      createdAt: new Date().toISOString()
    });
    target.updatedAt = new Date().toISOString();
    write(data);
  }

  function copyPlanTomorrow() {
    const text = $("planNote")?.value || "";
    if (!text.trim()) return;
    const data = read();
    if (!data) return;
    const e = ensureEntry(data, addDate(selectedDate(), 1));
    e.planNote = text;
    e.updatedAt = new Date().toISOString();
    write(data);
  }

  function renderPlan() {
    ensurePlanCard();
    const data = read();
    const e = data?.entries?.[selectedDate()] || {};
    const box = $("planTasks");
    const note = $("planNote");
    if (!box || !note) return;
    note.value = e.planNote || "";
    box.innerHTML = "";
    const tasks = Array.isArray(e.planTasks) ? e.planTasks : [];
    if (!tasks.length) {
      box.innerHTML = `<div class="hint topSpace">Пока задач нет. Добавь задачу через ＋.</div>`;
      return;
    }
    for (const task of tasks) {
      const row = document.createElement("div");
      row.className = `planTask ${task.done ? "done" : ""}`;

      const main = document.createElement("div");
      main.className = "taskMain";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "taskCheck";
      checkbox.checked = Boolean(task.done);
      checkbox.addEventListener("change", () => {
        updateTask(task.id, { done: checkbox.checked });
        row.classList.toggle("done", checkbox.checked);
      });
      const text = document.createElement("input");
      text.className = "taskText";
      text.value = task.text || "";
      text.addEventListener("change", () => updateTask(task.id, { text: text.value.trim() }));
      main.append(checkbox, text);

      const footer = document.createElement("div");
      footer.className = "taskFooter";
      const tomorrow = document.createElement("button");
      tomorrow.type = "button";
      tomorrow.className = "taskTomorrow";
      tomorrow.textContent = "↪";
      tomorrow.title = "Скопировать только эту задачу на следующий день";
      tomorrow.addEventListener("click", () => copyTaskTomorrow(task.id));
      footer.append(tomorrow);

      row.append(main, footer);
      box.append(row);
    }
  }

  function openPhotoDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(PHOTO_DB, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(PHOTO_STORE)) {
          request.result.createObjectStore(PHOTO_STORE, { keyPath: "date" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getPhoto(entryDate) {
    const db = await openPhotoDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(PHOTO_STORE, "readonly").objectStore(PHOTO_STORE).get(entryDate);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function putPhoto(record) {
    const db = await openPhotoDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, "readwrite");
      tx.objectStore(PHOTO_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function ensurePhotoCard() {
    if ($("photoDayCard")) return;
    ensurePlanCard();
    const plan = $("dayPlanCard");
    if (!plan) return;
    const card = document.createElement("div");
    card.id = "photoDayCard";
    card.className = "card";
    card.innerHTML = `
      <div class="sectionTitle"><h2>Photo of the Day</h2><span id="photoStatus" class="pill">нет фото</span></div>
      <div id="photoPreviewWrap" class="hidden" role="button" tabindex="0" aria-label="Открыть фото на весь экран"><img id="photoPreview" alt="Photo of the Day"></div>
      <div id="photoEmpty">Фото на этот день не выбрано</div>
      <label class="photoChooseBtn" for="photoInput">Выбрать / заменить фото</label>
      <input id="photoInput" type="file" accept="image/*">
      <div class="hint topSpace">Одно фото на день. Новое фото автоматически заменяет предыдущее.</div>`;
    plan.after(card);
    $("photoInput").addEventListener("change", savePhoto);
    $("photoPreviewWrap").addEventListener("click", openFullPhoto);
    $("photoPreviewWrap").addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFullPhoto();
      }
    });
  }

  function ensureFullPhotoModal() {
    if ($("photoFullscreen")) return;
    const modal = document.createElement("div");
    modal.id = "photoFullscreen";
    modal.className = "hidden";
    modal.innerHTML = `<img id="photoFullscreenImg" alt="Photo of the Day full size"><button type="button" aria-label="Закрыть фото">✕</button>`;
    document.body.append(modal);
    modal.querySelector("button").addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.classList.add("hidden");
    });
  }

  function openFullPhoto() {
    const src = $("photoPreview")?.src;
    if (!src) return;
    ensureFullPhotoModal();
    $("photoFullscreenImg").src = src;
    $("photoFullscreen").classList.remove("hidden");
  }

  async function renderPhoto() {
    ensurePhotoCard();
    ensureFullPhotoModal();
    const wrap = $("photoPreviewWrap");
    const empty = $("photoEmpty");
    const image = $("photoPreview");
    const status = $("photoStatus");
    if (!wrap || !empty || !image) return;

    const record = await getPhoto(selectedDate()).catch(() => null);
    if (!record) {
      wrap.classList.add("hidden");
      empty.classList.remove("hidden");
      image.removeAttribute("src");
      if (status) status.textContent = "нет фото";
      return;
    }

    let src = record.dataUrl || "";
    if (!src && record.blob) {
      try {
        src = await fileToDataUrl(record.blob);
        record.dataUrl = src;
        await putPhoto(record);
      } catch (_) {
        src = "";
      }
    }

    if (!src) {
      wrap.classList.add("hidden");
      empty.classList.remove("hidden");
      empty.textContent = "Фото сохранено, но Safari не смог показать preview. Выбери его ещё раз.";
      if (status) status.textContent = "ошибка preview";
      return;
    }

    image.src = src;
    $("photoFullscreenImg").src = src;
    wrap.classList.remove("hidden");
    empty.classList.add("hidden");
    if (status) status.textContent = "фото";
  }

  async function savePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const entryDate = selectedDate();
    const dataUrl = await fileToDataUrl(file);
    await putPhoto({
      date: entryDate,
      dataUrl,
      name: file.name || `photo-${entryDate}`,
      type: file.type || "",
      size: file.size || 0,
      updatedAt: new Date().toISOString()
    });

    const data = read();
    if (data) {
      const e = ensureEntry(data, entryDate);
      e.photo = {
        present: true,
        name: file.name || "",
        type: file.type || "",
        size: file.size || 0,
        updatedAt: new Date().toISOString()
      };
      e.updatedAt = new Date().toISOString();
      write(data);
    }

    event.target.value = "";
    await renderPhoto();
    renderCalendar();
  }

  function ensureCalendar() {
    if (document.querySelector('[data-tab="calendar"]')) return;
    const tabs = document.querySelector(".tabs");
    const main = document.querySelector("main");
    if (!tabs || !main) return;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.tab = "calendar";
    button.textContent = "Calendar";
    tabs.append(button);

    const section = document.createElement("section");
    section.id = "tab-calendar";
    section.className = "hidden";
    section.innerHTML = `
      <div class="card">
        <div class="sectionTitle"><button id="calendarPrev" type="button">‹</button><input id="calendarMonth" type="month"><button id="calendarNext" type="button">›</button></div>
        <div class="calendarWeekdays"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div>
        <div id="calendarGrid" class="calendarGrid"></div>
      </div>`;
    main.append(section);

    button.addEventListener("click", showCalendar);
    $("calendarPrev").addEventListener("click", () => shiftCalendar(-1));
    $("calendarNext").addEventListener("click", () => shiftCalendar(1));
    $("calendarMonth").addEventListener("change", renderCalendar);
    document.querySelectorAll('.tabs button:not([data-tab="calendar"])').forEach((tab) => {
      tab.addEventListener("click", () => section.classList.add("hidden"));
    });
  }

  function showCalendar() {
    document.querySelectorAll(".tabs button").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === "calendar"));
    ["today", "progress", "export", "settings"].forEach((name) => $("tab-" + name)?.classList.add("hidden"));
    $("tab-calendar")?.classList.remove("hidden");
    if (!$("calendarMonth").value) $("calendarMonth").value = selectedDate().slice(0, 7);
    renderCalendar();
  }

  function shiftCalendar(delta) {
    const input = $("calendarMonth");
    const [year, month] = (input.value || selectedDate().slice(0, 7)).split("-").map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    input.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    renderCalendar();
  }

  function calendarSummary(data, entryDate) {
    const defs = model.definitionsForDate(data, entryDate);
    const e = data.entries?.[entryDate] || {};
    let done = 0;
    let min = 0;
    let fail = 0;
    for (const habit of defs) {
      const status = e.habits?.[habit.id]?.status || "";
      if (status === "done") done += 1;
      else if (status === "min") min += 1;
      else if (status === "fail") fail += 1;
    }
    return {
      done,
      min,
      fail,
      total: Math.max(defs.length, 1),
      general: e.metrics?.general ?? ""
    };
  }

  function renderCalendar() {
    const grid = $("calendarGrid");
    const input = $("calendarMonth");
    if (!grid || !input) return;
    if (!input.value) input.value = selectedDate().slice(0, 7);

    const [year, month] = input.value.split("-").map(Number);
    const days = new Date(year, month, 0).getDate();
    const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const data = read() || { entries: {}, habits: [] };
    grid.innerHTML = "";

    for (let i = 0; i < offset; i += 1) {
      const blank = document.createElement("div");
      blank.className = "calendarBlank";
      grid.append(blank);
    }

    for (let day = 1; day <= days; day += 1) {
      const entryDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const summary = calendarSummary(data, entryDate);
      const doneEnd = Math.round((summary.done / summary.total) * 100);
      const minEnd = Math.min(100, doneEnd + Math.round((summary.min / summary.total) * 100));
      const failEnd = Math.min(100, minEnd + Math.round((summary.fail / summary.total) * 100));

      const button = document.createElement("button");
      button.type = "button";
      button.className = `calendarDay ${entryDate === selectedDate() ? "calendarSelected" : ""}`;
      button.innerHTML = `
        <div class="calFill"></div>
        <div class="calInner">
          <strong>${day}</strong>
          <div class="calSummary"><div>G ${summary.general === "" ? "–" : summary.general}</div><div>✓ ${summary.done} · MIN ${summary.min}</div><div>FAIL ${summary.fail}</div></div>
        </div>`;
      button.querySelector(".calFill").style.background = `linear-gradient(to top,
        rgba(5,150,105,.72) 0%, rgba(5,150,105,.72) ${doneEnd}%,
        rgba(217,119,6,.70) ${doneEnd}%, rgba(217,119,6,.70) ${minEnd}%,
        rgba(185,28,28,.72) ${minEnd}%, rgba(185,28,28,.72) ${failEnd}%,
        rgba(15,22,40,.04) ${failEnd}%, rgba(15,22,40,.04) 100%)`;
      button.addEventListener("click", () => {
        $("dateInput").value = entryDate;
        $("dateInput").dispatchEvent(new Event("change", { bubbles: true }));
        document.querySelector('[data-tab="today"]')?.click();
      });
      grid.append(button);
    }
  }

  function endedDefinitionsFor(data, current) {
    return (data.habits || [])
      .filter((candidate) => candidate !== current && candidate.endDate)
      .filter((candidate) => !current.startDate || candidate.endDate < current.startDate)
      .sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)) || Number(a.order || 0) - Number(b.order || 0));
  }

  function decorateSettingsRelations() {
    const list = $("settingsList");
    const data = read();
    if (!list || !data) return;

    for (const card of list.querySelectorAll(".habit")) {
      const identity = card.querySelector('[data-field="name"]');
      if (!identity) continue;
      const current = (data.habits || []).find((habit) =>
        habit.id === identity.dataset.id && String(habit.startDate || "") === String(identity.dataset.start || "")
      );
      if (!current || card.querySelector(".definitionRelation")) continue;

      const wrap = document.createElement("div");
      wrap.className = "definitionRelation";
      const label = document.createElement("label");
      label.textContent = "Связана с предыдущей темой";
      const select = document.createElement("select");
      select.dataset.definitionRelation = definitionKey(current);

      const none = document.createElement("option");
      none.value = "";
      none.textContent = "— новая независимая тема —";
      select.append(none);

      const candidates = endedDefinitionsFor(data, current);
      const candidateKeys = new Set();
      for (const previous of candidates) {
        const key = definitionKey(previous);
        candidateKeys.add(key);
        const option = document.createElement("option");
        option.value = key;
        option.textContent = `${previous.endDate} · ${previous.name}`;
        option.selected = key === (current.previousDefinitionKey || "");
        select.append(option);
      }

      if (current.previousDefinitionKey && !candidateKeys.has(current.previousDefinitionKey)) {
        const previous = (data.habits || []).find((habit) => definitionKey(habit) === current.previousDefinitionKey);
        if (previous) {
          const option = document.createElement("option");
          option.value = current.previousDefinitionKey;
          option.textContent = `${previous.endDate || "?"} · ${previous.name} (сохранённая связь)`;
          option.selected = true;
          select.append(option);
        }
      }

      select.addEventListener("change", () => {
        const latest = read();
        const target = (latest?.habits || []).find((habit) => definitionKey(habit) === definitionKey(current));
        if (!target) return;
        if (select.value) target.previousDefinitionKey = select.value;
        else delete target.previousDefinitionKey;
        write(latest);
      });

      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = "Для новой основной темы можно указать завершённую тему, продолжением которой она является.";
      label.append(select);
      wrap.append(label, hint);

      const details = card.querySelector("details");
      if (details) details.insertAdjacentElement("beforebegin", wrap);
      else card.append(wrap);
    }
  }

  function refreshDaybook() {
    renderPlan();
    renderPhoto();
    setTimeout(renderDescriptions, 0);
  }

  function init() {
    injectCss();
    document.querySelector('[data-tab="today"]').textContent = "Daybook";
    ensurePlanCard();
    ensurePhotoCard();
    ensureCalendar();
    ensureFullPhotoModal();
    refreshDaybook();

    const habits = $("habits");
    if (habits) {
      new MutationObserver(() => setTimeout(renderDescriptions, 0)).observe(habits, { childList: true });
    }

    $("dateInput")?.addEventListener("change", () => setTimeout(refreshDaybook, 0));
    ["prevDay", "nextDay"].forEach((id) => $(id)?.addEventListener("click", () => setTimeout(refreshDaybook, 0)));
    document.querySelector('[data-tab="today"]')?.addEventListener("click", () => setTimeout(refreshDaybook, 0));

    document.querySelector('[data-tab="settings"]')?.addEventListener("click", () => setTimeout(decorateSettingsRelations, 0));
    $("addHabit")?.addEventListener("click", () => setTimeout(decorateSettingsRelations, 0));
    $("resetDefaults")?.addEventListener("click", () => setTimeout(decorateSettingsRelations, 0));
    document.addEventListener("change", (event) => {
      if (event.target?.closest?.("#settingsList") && !event.target.matches("[data-definition-relation]")) {
        setTimeout(decorateSettingsRelations, 0);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(init, 0));
})();
