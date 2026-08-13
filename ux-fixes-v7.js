(() => {
  "use strict";

  const STORE_KEY = "lifeTrackerData.v4";
  const PHOTO_DB = "habitAppTestPhotosV1";
  const PHOTO_STORE = "photos";

  const $ = (id) => document.getElementById(id);

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
    if (!data.entries[date]) {
      data.entries[date] = { date, metrics: {}, habits: {}, dayNote: "", updatedAt: null };
    }
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
      .v7TaskCheckRow{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center}
      .v7TaskCheck{width:24px;height:24px;accent-color:#34d399}
      .v7TaskCheckLabel{display:flex;align-items:center;gap:7px;margin:0;color:var(--text);font-weight:700}
      .v7HabitLimits{display:grid;gap:5px;margin-top:7px;white-space:pre-wrap}
      .v7HabitLimits .minLine{color:#fde68a}
      .v7HabitLimits .maxLine{color:#a7f3d0}
      #photoPreviewWrap{height:33vh;min-height:180px;max-height:340px;display:flex;align-items:center;justify-content:center;cursor:zoom-in}
      #photoPreviewWrap.hidden{display:none!important}
      #photoPreviewWrap img{width:100%;height:100%;max-height:none;object-fit:contain}
      #v7PhotoFullscreen{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.96);display:flex;align-items:center;justify-content:center;padding:18px;cursor:zoom-out}
      #v7PhotoFullscreen.hidden{display:none!important}
      #v7PhotoFullscreen img{max-width:100%;max-height:100%;object-fit:contain}
      #v7PhotoFullscreen .closePhoto{position:absolute;right:14px;top:calc(14px + env(safe-area-inset-top));font-size:16px;background:#1f2937}
      .v7PlanTransferRow{display:flex;justify-content:flex-end;margin-top:8px}
      @media(max-width:520px){#photoPreviewWrap{height:32vh;min-height:170px}}
    `;
    document.head.appendChild(style);
  }

  function getCurrentTasks() {
    const data = readData();
    const tasks = data?.entries?.[selectedDate()]?.planTasks;
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
    entry.planTasks.push({
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text,
      done: false,
      continuationOf: "",
      createdAt: new Date().toISOString()
    });
    entry.updatedAt = new Date().toISOString();
    writeData(data);
    input.value = "";
    status("Задача добавлена.");
    setTimeout(enhanceTasks, 30);
    document.dispatchEvent(new CustomEvent("lifeTrackerPlanChanged"));
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
    const text = String(plan).trim();
    if (!text) {
      status("Общий план пуст — переносить нечего.");
      return;
    }
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
    if (target.planTasks.some((item) => item.continuationOf === continuationOf)) {
      status(`Эта задача уже перенесена на ${nextDate}.`);
      return;
    }
    target.planTasks.push({
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: source.text,
      done: false,
      continuationOf,
      createdAt: new Date().toISOString()
    });
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

  function enhanceTasks() {
    const box = $("planTasks");
    if (!box) return;
    const tasks = getCurrentTasks();
    const rows = Array.from(box.querySelectorAll(".planTask"));
    rows.forEach((row, index) => {
      const task = tasks[index];
      if (!task) return;
      row.dataset.taskId = task.id;

      const main = row.querySelector(".planTaskMain");
      if (main) {
        const oldDone = main.querySelector('[data-action="done"]');
        if (oldDone) oldDone.style.display = "none";
        if (!main.querySelector(".v7TaskCheckRow")) {
          const textInput = main.querySelector(".planTaskText");
          if (textInput) {
            const holder = document.createElement("div");
            holder.className = "v7TaskCheckRow";
            const label = document.createElement("label");
            label.className = "v7TaskCheckLabel";
            const check = document.createElement("input");
            check.type = "checkbox";
            check.className = "v7TaskCheck";
            check.checked = Boolean(task.done);
            check.dataset.taskId = task.id;
            const span = document.createElement("span");
            span.textContent = "Done";
            label.append(check, span);
            textInput.insertAdjacentElement("beforebegin", holder);
            holder.append(label, textInput);
          }
        } else {
          const check = main.querySelector(".v7TaskCheck");
          if (check) {
            check.dataset.taskId = task.id;
            check.checked = Boolean(task.done);
          }
        }
      }

      const tomorrow = row.querySelector('[data-action="tomorrow"]');
      if (tomorrow) {
        tomorrow.dataset.v7TaskId = task.id;
        tomorrow.textContent = "→ завтра";
      }
    });
  }

  function habitDefinitionByCard(card) {
    const data = readData();
    const model = window.LifeTrackerMigrationV4;
    if (!data || !model) return null;
    const name = card.querySelector(".habitName")?.textContent?.replace(/^\d+\.\s*/, "") || "";
    const defs = model.definitionsForDate(data, selectedDate());
    return defs.find((item) => item.name === name || name.endsWith(item.name)) || null;
  }

  function showMinMax() {
    document.querySelectorAll("#habits .habit").forEach((card) => {
      const hint = card.querySelector(".habitMin");
      if (!hint) return;
      const def = habitDefinitionByCard(card);
      if (!def) return;
      hint.classList.add("v7HabitLimits");
      hint.innerHTML = "";
      const min = document.createElement("div");
      min.className = "minLine";
      min.textContent = `MIN: ${def.minDescription || def.min || "—"}`;
      const max = document.createElement("div");
      max.className = "maxLine";
      max.textContent = `MAX: ${def.doneDescription || "—"}`;
      hint.append(min, max);
    });
  }

  function openPhotoDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(PHOTO_DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(PHOTO_STORE)) {
          req.result.createObjectStore(PHOTO_STORE, { keyPath: "date" });
        }
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

  function blobDataUrl(blob) {
    return new Promise((resolve, reject) => {
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
    modal.innerHTML = '<button class="closePhoto" type="button">Close</button><img alt="Photo of the day full size">';
    document.body.appendChild(modal);
    modal.addEventListener("click", () => modal.classList.add("hidden"));
    modal.querySelector(".closePhoto").addEventListener("click", (event) => {
      event.stopPropagation();
      modal.classList.add("hidden");
    });
    return modal;
  }

  async function renderPhotoReliable() {
    const wrap = $("photoPreviewWrap");
    const img = $("photoPreview");
    const photoStatus = $("photoStatus");
    if (!wrap || !img || !photoStatus) return;
    const record = await photoGet(selectedDate()).catch(() => null);
    if (!record?.blob) {
      wrap.classList.add("hidden");
      img.removeAttribute("src");
      photoStatus.textContent = "нет фото";
      return;
    }
    try {
      img.src = await blobDataUrl(record.blob);
      wrap.classList.remove("hidden");
      photoStatus.textContent = "фото добавлено";
    } catch (_) {
      const url = URL.createObjectURL(record.blob);
      img.src = url;
      wrap.classList.remove("hidden");
      photoStatus.textContent = "фото добавлено";
    }
  }

  async function savePhoto(event) {
    const file = event.target?.files?.[0];
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
      entry.photo = {
        present: true,
        name: file.name || "",
        type: file.type || "",
        size: file.size || 0,
        updatedAt: new Date().toISOString()
      };
      entry.updatedAt = new Date().toISOString();
      writeData(data);
    }
    event.target.value = "";
    await renderPhotoReliable();
    status("Фото сохранено.");
  }

  async function deletePhoto() {
    const date = selectedDate();
    await photoDelete(date);
    const data = readData();
    if (data?.entries?.[date]) {
      delete data.entries[date].photo;
      data.entries[date].updatedAt = new Date().toISOString();
      writeData(data);
    }
    await renderPhotoReliable();
    status("Фото удалено.");
  }

  function simplifyPhotoUi() {
    const exportOne = $("exportSelectedPhoto");
    if (exportOne) exportOne.remove();
    const exportCard = $("photoExportCard");
    if (exportCard) exportCard.remove();
    const footer = $("removePhoto")?.closest(".footerBtns");
    if (footer) footer.style.gridTemplateColumns = "1fr";
    const hint = $("photoDayCard")?.querySelector(".hint");
    if (hint) hint.textContent = "Фото хранится локально для выбранного дня. Нажми на фото, чтобы открыть его на весь экран.";
  }

  function wireDelegatedEvents() {
    document.addEventListener("click", (event) => {
      const add = event.target?.closest?.("#addPlanTask");
      if (add) {
        event.preventDefault();
        event.stopImmediatePropagation();
        addTask();
        return;
      }

      const planTomorrow = event.target?.closest?.("#copyOpenPlan");
      if (planTomorrow) {
        event.preventDefault();
        event.stopImmediatePropagation();
        copyPlanTextTomorrow();
        return;
      }

      const tomorrow = event.target?.closest?.('[data-action="tomorrow"]');
      if (tomorrow) {
        const taskId = tomorrow.dataset.v7TaskId || tomorrow.closest(".planTask")?.dataset.taskId;
        if (taskId) {
          event.preventDefault();
          event.stopImmediatePropagation();
          copyOneTaskTomorrow(taskId);
        }
        return;
      }

      const remove = event.target?.closest?.("#removePhoto");
      if (remove) {
        event.preventDefault();
        event.stopImmediatePropagation();
        deletePhoto().catch((err) => status(`Не удалось удалить фото: ${err.message}`));
        return;
      }

      if (event.target?.closest?.("#photoPreviewWrap")) {
        const src = $("photoPreview")?.src;
        if (!src) return;
        const modal = ensureFullscreen();
        modal.querySelector("img").src = src;
        modal.classList.remove("hidden");
      }
    }, true);

    document.addEventListener("change", (event) => {
      if (event.target?.matches?.(".v7TaskCheck")) {
        const taskId = event.target.dataset.taskId;
        if (taskId) {
          updateTask(taskId, { done: event.target.checked });
          event.target.closest(".planTask")?.classList.toggle("planTaskDone", event.target.checked);
        }
        return;
      }

      if (event.target?.id === "photoInput") {
        event.stopImmediatePropagation();
        savePhoto(event).catch((err) => status(`Не удалось сохранить фото: ${err.message}`));
      }
    }, true);

    document.addEventListener("keydown", (event) => {
      if (event.target?.id === "newPlanTask" && event.key === "Enter") {
        event.preventDefault();
        event.stopImmediatePropagation();
        addTask();
      }
    }, true);
  }

  function refreshUi() {
    enhancePlanHeader();
    enhanceTasks();
    showMinMax();
    simplifyPhotoUi();
    renderPhotoReliable();
  }

  function installObservers() {
    const observer = new MutationObserver(() => {
      clearTimeout(installObservers.timer);
      installObservers.timer = setTimeout(refreshUi, 20);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      injectStyles();
      wireDelegatedEvents();
      ensureFullscreen();
      refreshUi();
      installObservers();
      $("dateInput")?.addEventListener("change", () => setTimeout(refreshUi, 30));
      document.querySelector('[data-tab="today"]')?.addEventListener("click", () => setTimeout(refreshUi, 30));
    }, 20);
  });
})();