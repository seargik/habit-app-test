(() => {
  "use strict";

  const STORE = "lifeTrackerData.v4";
  const DB_NAME = "habitAppTestMediaV2";
  const DB_STORE = "media";
  const OLD_DB = "habitAppTestPhotosV1";
  const OLD_STORE = "photos";
  const MIGRATION_FLAG = "habitAppTest.mediaV2Migrated";
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

  function writeData(data) {
    localStorage.setItem(STORE, JSON.stringify(data));
  }

  function selectedDate() {
    return $("dateInput")?.value || localToday();
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

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          const store = db.createObjectStore(DB_STORE, { keyPath: "id" });
          store.createIndex("date", "date", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function allMedia() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function mediaForDate(date) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const store = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE);
      const request = store.index("date").getAll(date);
      request.onsuccess = () => resolve((request.result || []).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || ""))));
      request.onerror = () => reject(request.error);
    });
  }

  async function putMedia(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function deleteMedia(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(id);
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

  function dataUrlToBlob(dataUrl) {
    const [head, body] = String(dataUrl || "").split(",");
    const type = /data:([^;]+)/.exec(head || "")?.[1] || "application/octet-stream";
    const bytes = atob(body || "");
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) out[i] = bytes.charCodeAt(i);
    return new Blob([out], { type });
  }

  async function migrateOldPhotos() {
    if (localStorage.getItem(MIGRATION_FLAG) === "1") return;
    try {
      const old = await new Promise((resolve, reject) => {
        const request = indexedDB.open(OLD_DB, 1);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(OLD_STORE)) return resolve([]);
          const getAll = db.transaction(OLD_STORE, "readonly").objectStore(OLD_STORE).getAll();
          getAll.onsuccess = () => resolve(getAll.result || []);
          getAll.onerror = () => reject(getAll.error);
        };
        request.onerror = () => reject(request.error);
      });

      for (const item of old) {
        if (!item?.date) continue;
        let dataUrl = item.dataUrl || "";
        if (!dataUrl && item.blob) {
          try { dataUrl = await fileToDataUrl(item.blob); } catch (_) { dataUrl = ""; }
        }
        if (!dataUrl) continue;
        await putMedia({
          id: `legacy_${item.date}_1`,
          date: item.date,
          dataUrl,
          name: item.name || `photo-${item.date}`,
          type: item.type || dataUrlToBlob(dataUrl).type,
          size: item.size || dataUrlToBlob(dataUrl).size,
          comment: "",
          tag: "",
          createdAt: item.updatedAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn("Old photo migration skipped", err);
    } finally {
      localStorage.setItem(MIGRATION_FLAG, "1");
    }
  }

  function injectCss() {
    if ($("mediaRuntimeCss")) return;
    const style = document.createElement("style");
    style.id = "mediaRuntimeCss";
    style.textContent = `
      #photoDayCard{display:none!important}
      .mediaGallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0}
      .mediaItem{border:1px solid var(--line);border-radius:14px;padding:8px;background:#0f1628;min-width:0}
      .mediaThumb{min-height:165px;border-radius:10px;overflow:hidden;background:#070b13;display:flex;align-items:center;justify-content:center;cursor:zoom-in}
      .mediaThumb img{display:block;width:100%;height:auto;max-height:55vh;object-fit:contain}
      .mediaFields{display:grid;gap:6px;margin-top:7px}.mediaFields input{margin:0}
      .mediaItemFooter{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:6px}.mediaItemFooter .small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .mediaDelete{padding:5px 8px;min-width:34px}
      #mediaInput{display:none!important}.mediaAddBtn{display:flex;align-items:center;justify-content:center;width:100%;border-radius:13px;padding:11px 13px;background:var(--card2);font-weight:700;cursor:pointer}
      #mediaFullscreen{position:fixed;inset:0;z-index:10000;background:#000;display:flex;align-items:center;justify-content:center}.hidden#mediaFullscreen{display:none!important}
      #mediaFullscreen img{display:block;width:100%;height:100%;object-fit:contain}.mediaFullClose{position:absolute;top:calc(12px + env(safe-area-inset-top));right:12px;z-index:2}
      .mediaExportGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mediaExportGrid label{margin:0}.mediaExportGrid select,.mediaExportGrid input{margin-top:5px}
      .mediaExportActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.mediaExportActions button,.mediaExportActions label{flex:1;min-width:145px;margin:0}
      .mediaPreviewBox{max-height:70vh;overflow:auto;background:#0f1628;border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:10px;font-size:12px;line-height:1.45}
      .mediaTopicFilters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px}.mediaTopicFilters label{display:flex;gap:6px;align-items:flex-start;margin:0;padding:7px;border:1px solid var(--line);border-radius:10px}.mediaTopicFilters input{width:auto;margin-top:2px}
      .mediaImportLabel{display:flex;align-items:center;justify-content:center;border-radius:13px;padding:10px 12px;background:var(--card2);font-weight:700;cursor:pointer}.mediaImportLabel input{display:none}
      .previewSummary{color:var(--muted);font-size:12px;margin-bottom:10px}
      .previewGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .previewPhoto,.previewDay{border:1px solid var(--line);border-radius:12px;background:#0b1220;overflow:hidden;margin-bottom:10px}
      .previewImage{background:#05080f;display:flex;align-items:center;justify-content:center;cursor:zoom-in}.previewImage img{display:block;width:100%;height:auto;max-height:320px;object-fit:contain}
      .previewMeta,.previewDay{padding:9px}.previewDate{font-weight:800}.previewTags{color:#93c5fd;margin-top:4px}.previewComment{margin-top:5px;white-space:pre-wrap}.previewTopic{border-top:1px solid var(--line);padding-top:7px;margin-top:7px}.previewStatus{font-size:10px;color:#93c5fd;text-transform:uppercase}
      @media(max-width:520px){.mediaGallery,.previewGrid{grid-template-columns:1fr}.mediaThumb{min-height:190px}.mediaThumb img{max-height:none}.mediaExportGrid,.mediaTopicFilters{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureEntryPhotoCount(date, count) {
    const data = readData();
    if (!data) return;
    data.entries = data.entries || {};
    const entry = data.entries[date] || (data.entries[date] = { date, metrics: {}, habits: {}, dayNote: "", updatedAt: null });
    if (count > 0) entry.photo = { present: true, count, updatedAt: new Date().toISOString() };
    else delete entry.photo;
    entry.updatedAt = new Date().toISOString();
    writeData(data);
  }

  function ensureMediaCard() {
    if ($("mediaDayCard")) return;
    const plan = $("dayPlanCard");
    if (!plan) return;
    const card = document.createElement("div");
    card.id = "mediaDayCard";
    card.className = "card";
    card.innerHTML = `
      <div class="sectionTitle"><h2>Photo journal</h2><span id="mediaDayCount" class="pill">0 фото</span></div>
      <div id="mediaGallery" class="mediaGallery"></div>
      <label class="mediaAddBtn" for="mediaInput">＋ Добавить фото</label>
      <input id="mediaInput" type="file" accept="image/*" multiple>
      <div class="hint topSpace">Можно добавить несколько фото на один день. Комментарий и тэг сохраняются отдельно для каждого фото.</div>`;
    plan.insertAdjacentElement("afterend", card);
    $("mediaInput").addEventListener("change", addMediaFiles);
  }

  function ensureFullscreen() {
    if ($("mediaFullscreen")) return;
    const modal = document.createElement("div");
    modal.id = "mediaFullscreen";
    modal.className = "hidden";
    modal.innerHTML = `<img id="mediaFullscreenImg" alt="Photo full size"><button class="mediaFullClose" type="button">✕</button>`;
    document.body.appendChild(modal);
    modal.querySelector("button").addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", (event) => { if (event.target === modal) modal.classList.add("hidden"); });
  }

  function openFullscreen(src) {
    if (!src) return;
    ensureFullscreen();
    $("mediaFullscreenImg").src = src;
    $("mediaFullscreen").classList.remove("hidden");
  }

  async function updateMediaField(id, field, value) {
    const items = await allMedia();
    const item = items.find((row) => row.id === id);
    if (!item) return;
    item[field] = value;
    item.updatedAt = new Date().toISOString();
    await putMedia(item);
    await refreshExportFilters();
  }

  async function renderMediaDay() {
    ensureMediaCard();
    ensureFullscreen();
    const gallery = $("mediaGallery");
    if (!gallery) return;
    const date = selectedDate();
    const items = await mediaForDate(date).catch(() => []);
    gallery.innerHTML = "";
    $("mediaDayCount").textContent = `${items.length} фото`;
    ensureEntryPhotoCount(date, items.length);

    if (!items.length) {
      gallery.innerHTML = `<div class="hint">Фото на этот день пока нет.</div>`;
      return;
    }

    for (const item of items) {
      const card = document.createElement("div");
      card.className = "mediaItem";
      const thumb = document.createElement("div");
      thumb.className = "mediaThumb";
      const image = document.createElement("img");
      image.src = item.dataUrl;
      image.alt = item.comment || item.name || "Photo";
      thumb.append(image);
      thumb.addEventListener("click", () => openFullscreen(item.dataUrl));

      const fields = document.createElement("div");
      fields.className = "mediaFields";
      const comment = document.createElement("input");
      comment.type = "text";
      comment.placeholder = "Комментарий к фото";
      comment.value = item.comment || "";
      comment.addEventListener("change", () => updateMediaField(item.id, "comment", comment.value.trim()));
      const tag = document.createElement("input");
      tag.type = "text";
      tag.placeholder = "Тэг, например: son, trip, summer";
      tag.value = item.tag || "";
      tag.addEventListener("change", () => updateMediaField(item.id, "tag", tag.value.trim()));
      fields.append(comment, tag);

      const footer = document.createElement("div");
      footer.className = "mediaItemFooter";
      const name = document.createElement("span");
      name.className = "small";
      name.textContent = item.name || item.id;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "mediaDelete";
      remove.textContent = "✕";
      remove.title = "Удалить это фото";
      remove.addEventListener("click", async () => {
        await deleteMedia(item.id);
        await renderMediaDay();
        await refreshExportFilters();
      });
      footer.append(name, remove);
      card.append(thumb, fields, footer);
      gallery.append(card);
    }
  }

  async function addMediaFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const date = selectedDate();
    let seq = 0;
    for (const file of files) {
      seq += 1;
      const dataUrl = await fileToDataUrl(file);
      const now = new Date().toISOString();
      await putMedia({
        id: `media_${Date.now()}_${seq}_${Math.random().toString(36).slice(2, 7)}`,
        date,
        dataUrl,
        name: file.name || `photo-${date}-${seq}`,
        type: file.type || dataUrlToBlob(dataUrl).type,
        size: file.size || dataUrlToBlob(dataUrl).size,
        comment: "",
        tag: "",
        createdAt: now,
        updatedAt: now
      });
    }
    event.target.value = "";
    await renderMediaDay();
    await refreshExportFilters();
  }

  function normalizeTags(tag) {
    return String(tag || "").split(",").map((x) => x.trim()).filter(Boolean);
  }

  function rangeStart(mode, customDays) {
    if (mode === "all") return "0000-01-01";
    const days = mode === "custom" ? Math.max(1, Number(customDays) || 1) : Math.max(1, Number(mode) || 1);
    return addDate(localToday(), -(days - 1));
  }

  function rangeFilterDate(date, start) {
    return String(date || "") >= start && String(date || "") <= localToday();
  }

  function uniqueTopics(data) {
    const map = new Map();
    for (const habit of data?.habits || []) {
      const existing = map.get(habit.id);
      if (!existing || (!habit.endDate && existing.endDate) || String(habit.startDate || "") > String(existing.startDate || "")) map.set(habit.id, habit);
    }
    return Array.from(map.values()).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }

  function ensureExportCard() {
    const tab = $("tab-export");
    if (!tab || $("mediaExportCard")) return;
    const card = document.createElement("div");
    card.id = "mediaExportCard";
    card.className = "card";
    card.innerHTML = `
      <div class="sectionTitle"><h2>Media / filtered export</h2><span id="mediaExportCount" class="pill">0 фото</span></div>
      <div class="mediaExportGrid">
        <label>Период<select id="mediaRangeMode"><option value="all">Вся история</option><option value="7">Последние 7 дней</option><option value="30">Последние 30 дней</option><option value="90">Последние 90 дней</option><option value="custom">Последние X дней</option></select></label>
        <label id="mediaCustomDaysWrap" class="hidden">X дней<input id="mediaCustomDays" type="number" min="1" step="1" value="30"></label>
        <label>Тэг<select id="mediaTagFilter"><option value="">Все тэги</option></select></label>
        <label>Что экспортировать<select id="mediaExportMode"><option value="photos_only">Только фото</option><option value="photos_meta" selected>Фото + комментарий + тэг</option><option value="photos_comment">Фото + комментарий</option><option value="text_all">Только текст — все темы</option><option value="text_topics">Только текст — выбранные темы</option><option value="everything">Всё всё всё</option></select></label>
      </div>
      <div id="mediaTopicWrap" class="hidden topSpace"><div class="small">Темы для текстового экспорта</div><div id="mediaTopicFilters" class="mediaTopicFilters"></div></div>
      <div class="mediaExportActions">
        <button id="mediaPreviewBtn" type="button">Preview content</button>
        <button id="mediaExportHtmlBtn" class="btnGood" type="button">Export album HTML</button>
        <button id="mediaBackupBtn" type="button">Backup JSON</button>
        <button id="mediaShareBtn" class="btnBlue" type="button">Save photo files / Share</button>
        <label class="mediaImportLabel">Import media backup<input id="mediaImportFile" type="file" accept=".json,application/json"></label>
      </div>
      <div id="mediaPreviewBox" class="mediaPreviewBox hidden"></div>
      <div class="hint topSpace">HTML = читаемый альбом с фото и текстом. JSON = технический backup для обратного импорта. Save photo files / Share = отдельные изображения + manifest.csv + captions.txt для Files/видео.</div>`;
    tab.appendChild(card);

    $("mediaRangeMode").addEventListener("change", () => {
      $("mediaCustomDaysWrap").classList.toggle("hidden", $("mediaRangeMode").value !== "custom");
      refreshExportCount();
    });
    $("mediaCustomDays").addEventListener("change", refreshExportCount);
    $("mediaTagFilter").addEventListener("change", refreshExportCount);
    $("mediaExportMode").addEventListener("change", () => {
      $("mediaTopicWrap").classList.toggle("hidden", $("mediaExportMode").value !== "text_topics");
      refreshExportCount();
    });
    $("mediaPreviewBtn").addEventListener("click", previewExport);
    $("mediaExportHtmlBtn").addEventListener("click", exportHtmlAlbum);
    $("mediaBackupBtn").addEventListener("click", exportBackupJson);
    $("mediaShareBtn").addEventListener("click", sharePhotoFiles);
    $("mediaImportFile").addEventListener("change", importPackage);
  }

  async function refreshExportFilters() {
    ensureExportCard();
    const photos = await allMedia().catch(() => []);
    const tagList = Array.from(new Set(photos.flatMap((p) => normalizeTags(p.tag)))).sort((a, b) => a.localeCompare(b));
    const select = $("mediaTagFilter");
    if (select) {
      const current = select.value;
      select.innerHTML = `<option value="">Все тэги</option>`;
      for (const tag of tagList) {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        select.append(option);
      }
      if (tagList.includes(current)) select.value = current;
    }

    const data = readData();
    const topicBox = $("mediaTopicFilters");
    if (data && topicBox && !topicBox.dataset.ready) {
      topicBox.dataset.ready = "1";
      for (const habit of uniqueTopics(data)) {
        const label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" value="${String(habit.id).replace(/"/g, "&quot;")}" checked><span>${habit.name}</span>`;
        topicBox.append(label);
      }
    }
    await refreshExportCount();
  }

  function exportFilters() {
    return {
      rangeMode: $("mediaRangeMode")?.value || "all",
      customDays: Number($("mediaCustomDays")?.value || 30),
      tag: $("mediaTagFilter")?.value || "",
      mode: $("mediaExportMode")?.value || "photos_meta",
      topicIds: Array.from(document.querySelectorAll('#mediaTopicFilters input[type="checkbox"]:checked')).map((x) => x.value)
    };
  }

  async function selectedPhotos(filters) {
    const start = rangeStart(filters.rangeMode, filters.customDays);
    return (await allMedia().catch(() => []))
      .filter((p) => rangeFilterDate(p.date, start))
      .filter((p) => !filters.tag || normalizeTags(p.tag).includes(filters.tag))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  }

  function textExport(filters) {
    const data = readData();
    if (!data) return { entries: [] };
    const start = rangeStart(filters.rangeMode, filters.customDays);
    const topicSet = new Set(filters.topicIds || []);
    const selectedOnly = filters.mode === "text_topics";
    const entries = [];

    for (const date of Object.keys(data.entries || {}).sort()) {
      if (!rangeFilterDate(date, start)) continue;
      const entry = data.entries[date] || {};
      const topics = [];
      let defs = [];
      try { defs = model?.definitionsForDate(data, date) || []; } catch (_) { defs = []; }
      const byId = new Map(defs.map((h) => [h.id, h]));
      for (const [id, record] of Object.entries(entry.habits || {})) {
        if (selectedOnly && !topicSet.has(id)) continue;
        const habit = byId.get(id) || (data.habits || []).find((h) => h.id === id) || { id, name: id };
        const hasText = [record?.comment, record?.notes].some((v) => v != null && String(v).trim() !== "");
        if (!hasText && !record?.status) continue;
        topics.push({ id, name: habit.name || id, status: record?.status || "", comment: record?.comment || "", notes: record?.notes || "" });
      }

      if (selectedOnly) {
        if (topics.length) entries.push({ date, topics });
      } else {
        const hasAny = Boolean(String(entry.dayNote || "").trim() || String(entry.planNote || "").trim() || (entry.planTasks || []).length || topics.length);
        if (hasAny) entries.push({ date, dayNote: entry.dayNote || "", planNote: entry.planNote || "", planTasks: (entry.planTasks || []).map((t) => ({ text: t.text || "", done: Boolean(t.done) })), topics });
      }
    }
    return { entries };
  }

  function includesPhotos(mode) { return ["photos_only", "photos_meta", "photos_comment", "everything"].includes(mode); }
  function includesText(mode) { return ["text_all", "text_topics", "everything"].includes(mode); }
  function htmlEscape(value) { return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch]); }
  function nl2br(value) { return htmlEscape(value).replace(/\n/g, "<br>"); }
  function modeLabel(mode) { return ({ photos_only: "Только фото", photos_meta: "Фото + комментарий + тэг", photos_comment: "Фото + комментарий", text_all: "Только текст — все темы", text_topics: "Только текст — выбранные темы", everything: "Всё всё всё" })[mode] || mode; }

  function photoMetaHtml(photo, mode, prefix) {
    let html = `<div class="${prefix}Date">${htmlEscape(photo.date)}</div>`;
    if ((mode === "photos_meta" || mode === "everything") && normalizeTags(photo.tag).length) html += `<div class="${prefix}Tags">${normalizeTags(photo.tag).map((tag) => `<span>#${htmlEscape(tag)}</span>`).join(" ")}</div>`;
    if (["photos_meta", "photos_comment", "everything"].includes(mode) && photo.comment) html += `<div class="${prefix}Comment">${nl2br(photo.comment)}</div>`;
    return html;
  }

  function photosHtml(photos, mode, prefix = "preview") {
    if (!photos.length) return `<div class="${prefix}Empty">Нет фото в текущем фильтре.</div>`;
    return `<div class="${prefix}Grid">${photos.map((photo) => `<article class="${prefix}Photo"><div class="${prefix}Image"${prefix === "preview" ? ` data-full-src="${photo.dataUrl}"` : ""}><img src="${photo.dataUrl}" alt="${htmlEscape(photo.comment || photo.name || photo.date)}"></div><div class="${prefix}Meta">${photoMetaHtml(photo, mode, prefix)}</div></article>`).join("")}</div>`;
  }

  function topicsHtml(topics, prefix) {
    if (!topics?.length) return "";
    return topics.map((topic) => `<section class="${prefix}Topic"><h4>${htmlEscape(topic.name)}${topic.status ? ` <span class="${prefix}Status">${htmlEscape(topic.status)}</span>` : ""}</h4>${topic.comment ? `<div><b>Comment:</b> ${nl2br(topic.comment)}</div>` : ""}${topic.notes ? `<div><b>Notes:</b> ${nl2br(topic.notes)}</div>` : ""}</section>`).join("");
  }

  function textHtml(entries, prefix = "preview") {
    if (!entries.length) return `<div class="${prefix}Empty">Нет текста в текущем фильтре.</div>`;
    return entries.map((entry) => `<article class="${prefix}Day"><h3>${htmlEscape(entry.date)}</h3>${entry.dayNote ? `<section><h4>Day note</h4><div>${nl2br(entry.dayNote)}</div></section>` : ""}${entry.planNote ? `<section><h4>План</h4><div>${nl2br(entry.planNote)}</div></section>` : ""}${entry.planTasks?.length ? `<section><h4>Tasks</h4><ul>${entry.planTasks.map((task) => `<li>${task.done ? "✓" : "○"} ${htmlEscape(task.text)}</li>`).join("")}</ul></section>` : ""}${topicsHtml(entry.topics, prefix)}</article>`).join("");
  }

  async function buildSelection() {
    const filters = exportFilters();
    return { filters, photos: includesPhotos(filters.mode) ? await selectedPhotos(filters) : [], text: includesText(filters.mode) ? textExport(filters).entries : [] };
  }

  async function refreshExportCount() {
    if (!$("mediaExportCount")) return;
    const selection = await buildSelection();
    const parts = [];
    if (includesPhotos(selection.filters.mode)) parts.push(`${selection.photos.length} фото`);
    if (includesText(selection.filters.mode)) parts.push(`${selection.text.length} дней текста`);
    $("mediaExportCount").textContent = parts.join(" · ") || "0";
  }

  async function previewExport() {
    const box = $("mediaPreviewBox");
    if (!box) return;
    const selection = await buildSelection();
    const f = selection.filters;
    const period = f.rangeMode === "all" ? "Вся история" : `${rangeStart(f.rangeMode, f.customDays)} → ${localToday()}`;
    let html = `<div class="previewSummary"><b>${htmlEscape(modeLabel(f.mode))}</b> · ${htmlEscape(period)} · tag: ${htmlEscape(f.tag || "все")}</div>`;
    if (includesPhotos(f.mode)) html += photosHtml(selection.photos, f.mode, "preview");
    if (includesText(f.mode)) html += `<h3>Текст</h3>${textHtml(selection.text, "preview")}`;
    box.innerHTML = html;
    box.classList.remove("hidden");
    box.querySelectorAll("[data-full-src]").forEach((el) => el.addEventListener("click", () => openFullscreen(el.dataset.fullSrc)));
  }

  function albumCss() {
    return `:root{color-scheme:dark;background:#0b1020;color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;padding:22px;background:#0b1020;color:#f3f4f6;line-height:1.45}main{max-width:1000px;margin:auto}.albumHeader{margin-bottom:20px}.albumSub{color:#9ca3af;font-size:13px}.albumGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.albumPhoto{border:1px solid #273244;border-radius:16px;background:#111827;overflow:hidden}.albumImage{display:flex;align-items:center;justify-content:center;background:#05080f;min-height:180px}.albumImage img{display:block;width:100%;height:auto;max-height:75vh;object-fit:contain}.albumMeta{padding:10px 12px}.albumDate{font-weight:800}.albumTags{margin-top:5px;color:#93c5fd}.albumTags span{margin-right:6px}.albumComment{margin-top:7px;white-space:pre-wrap}.albumDay{border:1px solid #273244;border-radius:16px;background:#111827;padding:14px;margin-bottom:14px}.albumDay h3{margin:0 0 10px}.albumDay h4{margin:9px 0 5px}.albumTopic{border-top:1px solid #273244;padding-top:8px;margin-top:8px}.albumStatus{font-size:11px;color:#93c5fd;text-transform:uppercase}.albumEmpty{padding:18px;border:1px dashed #374151;border-radius:12px;color:#9ca3af}.albumSection{margin:24px 0 10px}@media(max-width:680px){body{padding:12px}.albumGrid{grid-template-columns:1fr}.albumImage img{max-height:none}}@media print{body{background:#fff;color:#111}.albumPhoto,.albumDay{break-inside:avoid;background:#fff;border-color:#ddd}.albumImage{background:#fff}.albumSub{color:#555}}`;
  }

  function downloadBlob(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function exportHtmlAlbum() {
    const selection = await buildSelection();
    const f = selection.filters;
    const period = f.rangeMode === "all" ? "Вся история" : `${rangeStart(f.rangeMode, f.customDays)} → ${localToday()}`;
    let body = "";
    if (includesPhotos(f.mode)) body += `<h2 class="albumSection">Фото</h2>${photosHtml(selection.photos, f.mode, "album")}`;
    if (includesText(f.mode)) body += `<h2 class="albumSection">Текст</h2>${textHtml(selection.text, "album")}`;
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Life Tracker Album ${localToday()}</title><style>${albumCss()}</style></head><body><main><header class="albumHeader"><h1>Life Tracker Album</h1><div class="albumSub">${htmlEscape(modeLabel(f.mode))} · ${htmlEscape(period)} · tag: ${htmlEscape(f.tag || "все")} · exported ${htmlEscape(new Date().toLocaleString())}</div></header>${body}</main></body></html>`;
    downloadBlob(`life-tracker-album-${f.mode}-${localToday()}.html`, new Blob(["\ufeff", html], { type: "text/html;charset=utf-8" }));
  }

  async function exportBackupJson() {
    const f = exportFilters();
    const photos = await selectedPhotos(f);
    const pack = { app: "Life Tracker TEST", type: "life-tracker-media-package", version: 2, exportedAt: new Date().toISOString(), filters: f, photos: photos.map((p) => ({ ...p })) };
    if (includesText(f.mode)) pack.text = textExport(f);
    if (f.mode === "everything") pack.appData = readData();
    downloadBlob(`life-tracker-media-backup-${localToday()}.json`, new Blob([JSON.stringify(pack)], { type: "application/json;charset=utf-8" }));
  }

  function safePart(value) { return String(value || "").trim().replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40); }
  function extFrom(photo) { const match = /\.([a-zA-Z0-9]{2,5})$/.exec(String(photo.name || "")); if (match) return `.${match[1].toLowerCase()}`; const type = photo.type || dataUrlToBlob(photo.dataUrl).type; if (type.includes("png")) return ".png"; if (type.includes("heic")) return ".heic"; if (type.includes("webp")) return ".webp"; return ".jpg"; }
  function csvEscape(value) { const s = String(value ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

  async function sharePhotoFiles() {
    const filters = exportFilters();
    const photos = await selectedPhotos(filters);
    if (!photos.length) return alert("В текущем фильтре нет фото.");
    const files = [], manifest = [["filename", "date", "comment", "tag", "original_name"]], captions = [], daySeq = new Map();
    for (const photo of photos) {
      const seq = (daySeq.get(photo.date) || 0) + 1; daySeq.set(photo.date, seq);
      const tagPart = safePart(photo.tag ? normalizeTags(photo.tag)[0] : "");
      const filename = `${photo.date}_${String(seq).padStart(2, "0")}${tagPart ? `_${tagPart}` : ""}${extFrom(photo)}`;
      const blob = dataUrlToBlob(photo.dataUrl);
      files.push(new File([blob], filename, { type: blob.type || photo.type || "application/octet-stream" }));
      manifest.push([filename, photo.date, photo.comment || "", photo.tag || "", photo.name || ""]);
      captions.push(`${filename}\t${photo.date}\t${photo.tag || ""}\t${photo.comment || ""}`);
    }
    files.push(new File([manifest.map((row) => row.map(csvEscape).join(",")).join("\n")], "manifest.csv", { type: "text/csv;charset=utf-8" }));
    files.push(new File([captions.join("\n")], "captions.txt", { type: "text/plain;charset=utf-8" }));
    try { if (navigator.share && (!navigator.canShare || navigator.canShare({ files }))) { await navigator.share({ files, title: "Life Tracker photos" }); return; } }
    catch (err) { if (err?.name === "AbortError") return; console.warn("Share failed; falling back to downloads", err); }
    for (const file of files) downloadBlob(file.name, file);
  }

  async function importPackage(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const pack = JSON.parse(await file.text());
      if (pack?.type !== "life-tracker-media-package" || !Array.isArray(pack.photos)) throw new Error("Это не Life Tracker media backup");
      let count = 0;
      for (const photo of pack.photos) {
        if (!photo?.dataUrl || !photo.date) continue;
        await putMedia({ id: photo.id || `import_${Date.now()}_${count}_${Math.random().toString(36).slice(2, 6)}`, date: photo.date, dataUrl: photo.dataUrl, name: photo.name || `photo-${photo.date}`, type: photo.type || dataUrlToBlob(photo.dataUrl).type, size: photo.size || dataUrlToBlob(photo.dataUrl).size, comment: photo.comment || "", tag: photo.tag || "", createdAt: photo.createdAt || new Date().toISOString(), updatedAt: photo.updatedAt || new Date().toISOString() });
        count += 1;
      }
      alert(`Импортировано фото: ${count}`); await renderMediaDay(); await refreshExportFilters();
    } catch (err) { alert(`Media import failed: ${err.message}`); }
    finally { event.target.value = ""; }
  }

  async function init() {
    injectCss();
    await migrateOldPhotos();
    setTimeout(async () => { ensureMediaCard(); ensureFullscreen(); ensureExportCard(); await renderMediaDay(); await refreshExportFilters(); }, 120);
    $("dateInput")?.addEventListener("change", () => setTimeout(renderMediaDay, 80));
    ["prevDay", "nextDay"].forEach((id) => $(id)?.addEventListener("click", () => setTimeout(renderMediaDay, 80)));
    document.querySelector('[data-tab="today"]')?.addEventListener("click", () => setTimeout(renderMediaDay, 80));
    document.querySelector('[data-tab="export"]')?.addEventListener("click", () => setTimeout(refreshExportFilters, 80));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
