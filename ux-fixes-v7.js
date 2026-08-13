(() => {
  "use strict";

  const STORE_KEY = "lifeTrackerData.v4";
  const SCALE_5_START = "2026-08-13";
  const PHOTO_DB = "habitAppTestPhotosV1";
  const PHOTO_STORE = "photos";
  const $ = (id) => document.getElementById(id);

  function readData() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function writeData(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); return true; }
    catch (_) { return false; }
  }

  function selectedDate() {
    return $("dateInput")?.value || new Date().toISOString().slice(0, 10);
  }

  function dateAdd(date, days) {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function ensureEntry(data, date) {
    data.entries = data.entries && typeof data.entries === "object" ? data.entries : {};
    if (!data.entries[date]) data.entries[date] = { date, metrics: {}, habits: {}, dayNote: "", updatedAt: null };
    return data.entries[date];
  }

  function status(text) {
    const el = $("saveStatus");
    if (el) el.textContent = text;
  }

  function injectStyles() {
    if ($("uxFixesV7Styles")) return;
    const style = document.createElement("style");
    style.id = "uxFixesV7Styles";
    style.textContent = `
      #habits .habitMin{display:none!important}
      .v7HabitLimits{display:grid;gap:5px;margin-top:7px;white-space:pre-wrap;font-size:13px;line-height:1.45}
      .v7HabitLimits .minLine{color:#fde68a}
      .v7HabitLimits .maxLine{color:#a7f3d0}
      .v7TaskCheckRow{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;width:100%}
      .v7TaskCheck{width:24px;height:24px;accent-color:#34d399}
      .v7TaskCheckLabel{display:flex;align-items:center;gap:7px;margin:0;color:var(--text);font-weight:700}
      #photoPreviewWrap{height:33vh!important;min-height:180px;max-height:340px;display:flex;align-items:center;justify-content:center;cursor:zoom-in}
      #photoPreviewWrap.hidden{display:none!important}
      #photoPreviewWrap img{width:100%!important;height:100%!important;max-height:none!important;object-fit:contain!important}
      #v7PhotoFullscreen{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.96);display:flex;align-items:center;justify-content:center;padding:18px;cursor:zoom-out}
      #v7PhotoFullscreen.hidden{display:none!important}
      #v7PhotoFullscreen img{max-width:100%;max-height:100%;object-fit:contain}
      #v7PhotoFullscreen .closePhoto{position:absolute;right:14px;top:calc(14px + env(safe-area-inset-top));font-size:16px;background:#1f2937}
      .continuityItem{border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:8px;background:#0f1628}
      .continuityHead{display:flex;justify-content:space-between;gap:8px;margin-bottom:4px}
      @media(max-width:520px){#photoPreviewWrap{height:32vh!important;min-height:170px}}
    `;
    document.head.appendChild(style);
  }

  function convertOldGeneral(value) {
    if (value === "" || value == null) return value;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 5 || n > 10) return value;
    return String(Math.round((n / 2) * 10) / 10);
  }

  function normalizeScale5Compatibility() {
    const data = readData();
    if (!data?.entries) return;
    let changed = false;
    Object.entries(data.entries).forEach(([date, entry]) => {
      if (date < SCALE_5_START || !entry?.metrics) return;
      const next = convertOldGeneral(entry.metrics.general);
      if (String(next ?? "") !== String(entry.metrics.general ?? "")) {
        entry.metrics.general = next;
        changed = true;
      }
    });
    if (changed) writeData(data);
  }

  function refreshGeneralDisplay() {
    const date = selectedDate();
    const max = date >= SCALE_5_START ? 5 : 10;
    const input = $("general");
    const stored = readData()?.entries?.[date]?.metrics?.general;
    if (input) {
      const n = Number(input.value);
      if (max === 5 && input.value !== "" && Number.isFinite(n) && n > 5 && n <= 10) input.value = String(stored ?? convertOldGeneral(input.value));
      input.max = String(max);
      input.placeholder = max === 5 ? "3.5" : "7.5";
    }
    const label = document.querySelector('label[for="general"]');
    if (label) label.textContent = `General 0–${max}`;
    const pill = $("dayScorePill");
    if (pill?.textContent.includes("General")) {
      let next = pill.textContent.replace(/\/(5|10)\b/, `/${max}`);
      if (input?.value !== "") next = next.replace(/^General\s+[^/]+\/(5|10)/, `General ${input.value}/${max}`);
      pill.textContent = next;
    }
  }

  function ensureCurrentDayLabel() {
    let label = $("currentDayLabel");
    if (label) return label;
    const row = document.querySelector(".dateRow");
    if (!row) return null;
    label = document.createElement("div");
    label.id = "currentDayLabel";
    label.className = "small topSpace";
    row.insertAdjacentElement("afterend", label);
    return label;
  }

  function refreshCurrentDayLabel() {
    const label = ensureCurrentDayLabel();
    const value = $("dateInput")?.value || "";
    if (!label) return;
    if (!value) { label.textContent = "Дата загружается…"; return; }
    const [y,m,d] = value.split("-");
    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,10);
    label.textContent = `Открыт день: ${d}.${m}.${y}${value === today ? " · Сегодня" : ""}`;
  }

  function getCurrentTasks() {
    const tasks = readData()?.entries?.[selectedDate()]?.planTasks;
    return Array.isArray(tasks) ? tasks : [];
  }

  function addTask() {
    const input = $("newPlanTask");
    const text = input?.value?.trim();
    if (!text) return;
    const data = readData();
    if (!data) return;
    const entry = ensureEntry(data, selectedDate());
    entry.planTasks = Array.isArray(entry.planTasks) ? entry.planTasks : [];
    entry.planTasks.push({ id:`task_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, text, done:false, continuationOf:"", createdAt:new Date().toISOString() });
    entry.updatedAt = new Date().toISOString();
    writeData(data);
    input.value = "";
    status("Задача добавлена.");
    rerenderPlanFromData();
  }

  function updateTask(taskId, patch) {
    const data = readData();
    if (!data) return;
    const entry = ensureEntry(data, selectedDate());
    entry.planTasks = Array.isArray(entry.planTasks) ? entry.planTasks : [];
    const task = entry.planTasks.find((item) => item.id === taskId);
    if (!task) return;
    Object.assign(task, patch);
    entry.updatedAt = new Date().toISOString();
    writeData(data);
  }

  function copyPlanTextTomorrow() {
    const plan = $("planNote")?.value ?? "";
    if (!String(plan).trim()) { status("Общий план пуст — переносить нечего."); return; }
    const data = readData();
    if (!data) return;
    const nextDate = dateAdd(selectedDate(), 1);
    const target = ensureEntry(data, nextDate);
    target.planNote = plan;
    target.updatedAt = new Date().toISOString();
    writeData(data);
    status(`Общий план скопирован только на ${nextDate}.`);
  }

  function copyOneTaskTomorrow(taskId) {
    const data = readData();
    if (!data) return;
    const date = selectedDate();
    const source = data.entries?.[date]?.planTasks?.find((item) => item.id === taskId);
    if (!source?.text) return;
    const nextDate = dateAdd(date, 1);
    const target = ensureEntry(data, nextDate);
    target.planTasks = Array.isArray(target.planTasks) ? target.planTasks : [];
    const continuationOf = `${date}|${source.id}`;
    if (target.planTasks.some((item) => item.continuationOf === continuationOf)) { status(`Эта задача уже перенесена на ${nextDate}.`); return; }
    target.planTasks.push({ id:`task_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, text:source.text, done:false, continuationOf, createdAt:new Date().toISOString() });
    target.updatedAt = new Date().toISOString();
    writeData(data);
    status(`Задача скопирована только на ${nextDate}.`);
  }

  function enhancePlanHeader() {
    const button = $("copyOpenPlan");
    if (!button) return;
    button.textContent = "План → завтра";
    button.title = "Копирует только общий текст плана на один следующий день";
  }

  function rerenderPlanFromData() {
    const input = $("newPlanTask");
    const box = $("planTasks");
    if (!box) return;
    const tasks = getCurrentTasks();
    box.innerHTML = "";
    if (!tasks.length) {
      const empty = document.createElement("div");
      empty.className = "hint topSpace";
      empty.textContent = "Пока задач нет. Добавь одну через ＋.";
      box.appendChild(empty);
      return;
    }
    tasks.forEach((task) => {
      const row = document.createElement("div");
      row.className = `planTask ${task.done ? "planTaskDone" : ""}`;
      row.dataset.taskId = task.id;
      const top = document.createElement("div");
      top.className = "v7TaskCheckRow";
      const label = document.createElement("label");
      label.className = "v7TaskCheckLabel";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "v7TaskCheck";
      check.checked = Boolean(task.done);
      check.dataset.taskId = task.id;
      const doneText = document.createElement("span");
      doneText.textContent = "Done";
      label.append(check, doneText);
      const text = document.createElement("input");
      text.type = "text";
      text.className = "planTaskText";
      text.value = task.text || "";
      text.addEventListener("change", () => { updateTask(task.id,{text:text.value.trim()}); });
      top.append(label,text);
      row.appendChild(top);

      const linkLabel = document.createElement("label");
      linkLabel.className = "planLinkLabel";
      linkLabel.textContent = "Продолжение предыдущего дела";
      const select = document.createElement("select");
      select.className = "planLink";
      const none = document.createElement("option");
      none.value = "";
      none.textContent = "— не связано —";
      select.appendChild(none);
      const data = readData();
      Object.keys(data?.entries || {}).filter(d => d < selectedDate() && d >= dateAdd(selectedDate(),-60)).sort().reverse().forEach(d => {
        (data.entries[d]?.planTasks || []).forEach(prev => {
          if (!prev?.text) return;
          const opt = document.createElement("option");
          opt.value = `${d}|${prev.id}`;
          opt.textContent = `${d} · ${prev.text}${prev.done ? " ✓" : ""}`;
          if (opt.value === (task.continuationOf || "")) opt.selected = true;
          select.appendChild(opt);
        });
      });
      select.addEventListener("change", () => updateTask(task.id,{continuationOf:select.value}));
      linkLabel.appendChild(select);
      row.appendChild(linkLabel);

      const actions = document.createElement("div");
      actions.className = "planTaskActions";
      const tomorrow = document.createElement("button");
      tomorrow.type = "button";
      tomorrow.dataset.v7TaskId = task.id;
      tomorrow.textContent = "→ завтра";
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btnBad";
      del.dataset.v7DeleteTask = task.id;
      del.textContent = "Удалить";
      actions.append(tomorrow,del);
      row.appendChild(actions);
      box.appendChild(row);
    });
    if (input) input.value = "";
  }

  function deleteTask(taskId) {
    const data = readData();
    if (!data) return;
    const entry = ensureEntry(data, selectedDate());
    entry.planTasks = (entry.planTasks || []).filter(item => item.id !== taskId);
    entry.updatedAt = new Date().toISOString();
    writeData(data);
    rerenderPlanFromData();
  }

  function showMinMax() {
    const data = readData();
    const model = window.LifeTrackerMigrationV4;
    if (!data || !model) return;
    const defs = model.definitionsForDate(data, selectedDate());
    document.querySelectorAll("#habits .habit").forEach(card => {
      const name = card.querySelector(".habitName")?.textContent?.replace(/^\d+\.\s*/,"") || "";
      const def = defs.find(item => item.name === name || name.endsWith(item.name));
      if (!def) return;
      let box = card.querySelector(".v7HabitLimits");
      if (!box) {
        box = document.createElement("div");
        box.className = "v7HabitLimits";
        const anchor = card.querySelector(".habitMin");
        (anchor || card.querySelector(".habitTop"))?.insertAdjacentElement("afterend",box);
      }
      const signature = `${def.minDescription || def.min || ""}|${def.doneDescription || ""}`;
      if (box.dataset.signature === signature) return;
      box.dataset.signature = signature;
      box.innerHTML = "";
      const min = document.createElement("div"); min.className="minLine"; min.textContent=`MIN: ${def.minDescription || def.min || "—"}`;
      const max = document.createElement("div"); max.className="maxLine"; max.textContent=`MAX: ${def.doneDescription || "—"}`;
      box.append(min,max);
    });
  }

  function openPhotoDb() {
    return new Promise((resolve,reject) => {
      const req = indexedDB.open(PHOTO_DB,1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(PHOTO_STORE)) req.result.createObjectStore(PHOTO_STORE,{keyPath:"date"}); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function photoGet(date) {
    const db = await openPhotoDb();
    return new Promise((resolve,reject) => {
      const req = db.transaction(PHOTO_STORE,"readonly").objectStore(PHOTO_STORE).get(date);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function photoPut(record) {
    const db = await openPhotoDb();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(PHOTO_STORE,"readwrite");
      tx.objectStore(PHOTO_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function photoDelete(date) {
    const db = await openPhotoDb();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(PHOTO_STORE,"readwrite");
      tx.objectStore(PHOTO_STORE).delete(date);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function blobDataUrl(blob) {
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function ensureFullscreen() {
    let modal = $("v7PhotoFullscreen");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "v7PhotoFullscreen";
    modal.className = "hidden";
    const close = document.createElement("button"); close.className="closePhoto"; close.type="button"; close.textContent="Close";
    const img = document.createElement("img"); img.alt="Photo of the day full size";
    modal.append(close,img);
    document.body.appendChild(modal);
    modal.addEventListener("click",() => modal.classList.add("hidden"));
    close.addEventListener("click",e => { e.stopPropagation(); modal.classList.add("hidden"); });
    return modal;
  }

  async function renderPhotoReliable() {
    const wrap = $("photoPreviewWrap"), img = $("photoPreview"), pill = $("photoStatus");
    if (!wrap || !img || !pill) return;
    const record = await photoGet(selectedDate()).catch(() => null);
    if (!record?.blob) { wrap.classList.add("hidden"); img.removeAttribute("src"); pill.textContent="нет фото"; return; }
    try { img.src = await blobDataUrl(record.blob); }
    catch (_) { img.src = URL.createObjectURL(record.blob); }
    wrap.classList.remove("hidden");
    pill.textContent = "фото добавлено";
  }

  async function savePhoto(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    const date = selectedDate();
    await photoPut({date,blob:file,name:file.name || `photo-${date}`,type:file.type || "application/octet-stream",size:file.size || 0,updatedAt:new Date().toISOString()});
    const data = readData();
    if (data) {
      const entry = ensureEntry(data,date);
      entry.photo = {present:true,name:file.name || "",type:file.type || "",size:file.size || 0,updatedAt:new Date().toISOString()};
      entry.updatedAt = new Date().toISOString();
      writeData(data);
    }
    event.target.value="";
    await renderPhotoReliable();
    status("Фото сохранено.");
  }

  async function deletePhoto() {
    const date = selectedDate();
    await photoDelete(date);
    const data = readData();
    if (data?.entries?.[date]) { delete data.entries[date].photo; data.entries[date].updatedAt=new Date().toISOString(); writeData(data); }
    await renderPhotoReliable();
    status("Фото удалено.");
  }

  function simplifyPhotoUi() {
    $("exportSelectedPhoto")?.remove();
    $("photoExportCard")?.remove();
    const footer = $("removePhoto")?.closest(".footerBtns");
    if (footer) footer.style.gridTemplateColumns="1fr";
    const hint = $("photoDayCard")?.querySelector(".hint");
    if (hint) hint.textContent="Фото хранится локально для выбранного дня. Нажми на фото, чтобы открыть его на весь экран.";
  }

  function taskByLink(data,link) {
    if (!link?.includes("|")) return null;
    const [date,id] = link.split("|");
    const task = (data.entries?.[date]?.planTasks || []).find(item => item.id === id);
    return task ? {date,task} : null;
  }

  function renderContinuity() {
    const section = $("tab-progress");
    if (!section) return;
    let card = $("continuityProgressCard");
    if (!card) {
      card=document.createElement("div"); card.id="continuityProgressCard"; card.className="card";
      card.innerHTML='<div class="sectionTitle"><h2>Continuity / previous endeavour</h2><span class="pill">7 days</span></div><div class="hint">Связь задаётся в Daybook → План на день через «Продолжение предыдущего дела».</div><div id="continuityProgressList"></div>';
      section.appendChild(card);
    }
    const box=$("continuityProgressList"), data=readData();
    if (!box || !data) return;
    const end=selectedDate(), start=dateAdd(end,-6), rows=[];
    Object.keys(data.entries || {}).filter(d=>d>=start && d<=end).sort().forEach(date => {
      (data.entries[date]?.planTasks || []).forEach(task => { if (task?.text) rows.push({date,task,parent:taskByLink(data,task.continuationOf)}); });
    });
    box.innerHTML="";
    if (!rows.length) { const e=document.createElement("div"); e.className="hint topSpace"; e.textContent="За последние 7 дней задач пока нет."; box.appendChild(e); return; }
    rows.reverse().forEach(({date,task,parent}) => {
      const div=document.createElement("div"); div.className="continuityItem";
      const head=document.createElement("div"); head.className="continuityHead";
      const strong=document.createElement("strong"); strong.textContent=date;
      const state=document.createElement("span"); state.textContent=task.done ? "✓ done" : "open";
      head.append(strong,state);
      const text=document.createElement("div"); text.textContent=task.text;
      const hint=document.createElement("div"); hint.className="hint"; hint.textContent=parent ? `↳ продолжение: ${parent.date} · ${parent.task.text}` : "новое дело / связь не указана";
      div.append(head,text,hint); box.appendChild(div);
    });
  }

  function wireDelegatedEvents() {
    document.addEventListener("click",event => {
      if (event.target?.closest?.("#addPlanTask")) { event.preventDefault(); event.stopImmediatePropagation(); addTask(); return; }
      if (event.target?.closest?.("#copyOpenPlan")) { event.preventDefault(); event.stopImmediatePropagation(); copyPlanTextTomorrow(); return; }
      const tomorrow=event.target?.closest?.("[data-v7-task-id]");
      if (tomorrow) { event.preventDefault(); event.stopImmediatePropagation(); copyOneTaskTomorrow(tomorrow.dataset.v7TaskId); return; }
      const del=event.target?.closest?.("[data-v7-delete-task]");
      if (del) { event.preventDefault(); event.stopImmediatePropagation(); deleteTask(del.dataset.v7DeleteTask); return; }
      if (event.target?.closest?.("#removePhoto")) { event.preventDefault(); event.stopImmediatePropagation(); deletePhoto().catch(err=>status(`Не удалось удалить фото: ${err.message}`)); return; }
      if (event.target?.closest?.("#photoPreviewWrap")) {
        const src=$("photoPreview")?.src; if (!src) return;
        const modal=ensureFullscreen(); modal.querySelector("img").src=src; modal.classList.remove("hidden");
      }
    },true);

    document.addEventListener("change",event => {
      if (event.target?.matches?.(".v7TaskCheck")) {
        const id=event.target.dataset.taskId; if (id) { updateTask(id,{done:event.target.checked}); event.target.closest(".planTask")?.classList.toggle("planTaskDone",event.target.checked); }
        return;
      }
      if (event.target?.id === "photoInput") { event.stopImmediatePropagation(); savePhoto(event).catch(err=>status(`Не удалось сохранить фото: ${err.message}`)); }
    },true);

    document.addEventListener("keydown",event => {
      if (event.target?.id === "newPlanTask" && event.key === "Enter") { event.preventDefault(); event.stopImmediatePropagation(); addTask(); }
    },true);
  }

  function refreshUi() {
    refreshGeneralDisplay();
    refreshCurrentDayLabel();
    enhancePlanHeader();
    showMinMax();
    simplifyPhotoUi();
    renderPhotoReliable();
  }

  function installObservers() {
    const habits=$("habits");
    if (habits) new MutationObserver(() => setTimeout(showMinMax,0)).observe(habits,{childList:true});
  }

  function boot() {
    setTimeout(() => {
      injectStyles();
      normalizeScale5Compatibility();
      wireDelegatedEvents();
      ensureFullscreen();
      refreshUi();
      rerenderPlanFromData();
      installObservers();
      $("dateInput")?.addEventListener("change",() => setTimeout(() => { refreshUi(); rerenderPlanFromData(); },30));
      ["prevDay","nextDay"].forEach(id => $(id)?.addEventListener("click",() => setTimeout(() => { refreshUi(); rerenderPlanFromData(); },30)));
      document.querySelector('[data-tab="today"]')?.addEventListener("click",() => setTimeout(() => { refreshUi(); rerenderPlanFromData(); },30));
      document.querySelector('[data-tab="progress"]')?.addEventListener("click",() => setTimeout(renderContinuity,30));
      $("refreshProgress")?.addEventListener("click",() => setTimeout(renderContinuity,30));
    },40);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();