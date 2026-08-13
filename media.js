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
    return $("dateInput")?.value || new Date().toISOString().slice(0, 10);
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
      const index = store.index("date");
      const request = index.getAll(date);
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
      .mediaThumb{height:165px;border-radius:10px;overflow:hidden;background:#070b13;display:flex;align-items:center;justify-content:center;cursor:zoom-in}
      .mediaThumb img{display:block;width:100%;height:100%;object-fit:cover}
      .mediaFields{display:grid;gap:6px;margin-top:7px}.mediaFields input{margin:0}
      .mediaItemFooter{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:6px}.mediaItemFooter .small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .mediaDelete{padding:5px 8px;min-width:34px}
      #mediaInput{display:none!important}.mediaAddBtn{display:flex;align-items:center;justify-content:center;width:100%;border-radius:13px;padding:11px 13px;background:var(--card2);font-weight:700;cursor:pointer}
      #mediaFullscreen{position:fixed;inset:0;z-index:10000;background:#000;display:flex;align-items:center;justify-content:center}.hidden#mediaFullscreen{display:none!important}
      #mediaFullscreen img{display:block;width:100%;height:100%;object-fit:contain}.mediaFullClose{position:absolute;top:calc(12px + env(safe-area-inset-top));right:12px;z-index:2}
      .mediaExportGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mediaExportGrid label{margin:0}.mediaExportGrid select,.mediaExportGrid input{margin-top:5px}
      .mediaExportActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.mediaExportActions button,.mediaExportActions label{flex:1;min-width:145px;margin:0}
      .mediaPreviewBox{max-height:340px;overflow:auto;white-space:pre-wrap;background:#0f1628;border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:10px;font-size:12px;line-height:1.4}
      .mediaTopicFilters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px}.mediaTopicFilters label{display:flex;gap:6px;align-items:flex-start;margin:0;padding:7px;border:1px solid var(--line);border-radius:10px}.mediaTopicFilters input{width:auto;margin-top:2px}
      .mediaImportLabel{display:flex;align-items:center;justify-content:center;border-radius:13px;padding:10px 12px;background:var(--card2);font-weight:700;cursor:pointer}.mediaImportLabel input{display:none}
      @media(max-width:520px){.mediaGallery{grid-template-columns:1fr}.mediaThumb{height:33vh;min-height:190px}.mediaExportGrid{grid-template-columns:1fr}.mediaTopicFilters{grid-template-columns:1fr}}
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
      const empty = document.createElement("div");
      empty.className = "hint";
      empty.textContent = "Фото на этот день пока нет.";
      gallery.appendChild(empty);
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
      if (!existing || (!habit.endDate && existing.endDate) || String(habit.startDate || "") > String(existing.startDate || "")) {
        map.set(habit.id, habit);
      }
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
        <label>Период
          <select id="mediaRangeMode">
            <option value="all">Вся история</option>
            <option value="7">Последние 7 дней</option>
            <option value="30">Последние 30 дней</option>
            <option value="90">Последние 90 дней</option>
            <option value="custom">Последние X дней</option>
          </select>
        </label>
        <label id="mediaCustomDaysWrap" class="hidden">X дней<input id="mediaCustomDays" type="number" min="1" step="1" value="30"></label>
        <label>Тэг
          <select id="mediaTagFilter"><option value="">Все тэги</option></select>
        </label>
        <label>Что экспортировать
          <select id="mediaExportMode">
            <option value="photos_only">Только фото</option>
            <option value="photos_meta" selected>Фото + комментарий + тэг</option>
            <option value="photos_comment">Фото + комментарий</option>
            <option value="text_all">Только текст — все темы</option>
            <option value="text_topics">Только текст — выбранные темы</option>
            <option value="everything">Всё всё всё</option>
          </select>
        </label>
      </div>
      <div id="mediaTopicWrap" class="hidden topSpace">
        <div class="small">Темы для текстового экспорта</div>
        <div id="mediaTopicFilters" class="mediaTopicFilters"></div>
      </div>
      <div class="mediaExportActions">
        <button id="mediaPreviewBtn" type="button">Preview фильтра</button>
        <button id="mediaExportBtn" class="btnGood" type="button">Export package</button>
        <button id="mediaShareBtn" class="btnBlue" type="button">Save photo files / Share</button>
        <label class="mediaImportLabel">Import media package<input id="mediaImportFile" type="file" accept=".json,application/json"></label>
      </div>
      <div id="mediaPreviewBox" class="mediaPreviewBox hidden"></div>
      <div class="hint topSpace">Save photo files / Share создаёт отдельные изображения + manifest.csv + captions.txt. Это удобно сохранить в Files как папку/набор файлов для будущего коллажа или видео.</div>`;
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
    $("mediaExportBtn").addEventListener("click", exportPackage);
    $("mediaShareBtn").addEventListener("click", sharePhotoFiles);
    $("mediaImportFile").addEventListener("change", importPackage);
  }

  async function refreshExportFilters() {
    ensureExportCard();
    const photos = await allMedia().catch(() => []);
    const tags = Array.from(new Set(photos.flatMap((p) => normalizeTags(p.tag)))).sort((a, b) => a.localeCompare(b));
    const select = $("mediaTagFilter");
    if (select) {
      const current = select.value;
      select.innerHTML = `<option value="">Все тэги</option>`;
      for (const tag of tags) {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        select.append(option);
      }
      if (tags.includes(current)) select.value = current;
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
    const rows = (await allMedia().catch(() => []))
      .filter((p) => rangeFilterDate(p.date, start))
      .filter((p) => !filters.tag || normalizeTags(p.tag).includes(filters.tag))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    return rows;
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
        entries.push({
          date,
          dayNote: entry.dayNote || "",
          planNote: entry.planNote || "",
          planTasks: (entry.planTasks || []).map((t) => ({ text: t.text || "", done: Boolean(t.done) })),
          topics
        });
      }
    }
    return { entries };
  }

  async function buildPackage() {
    const filters = exportFilters();
    const includePhotos = ["photos_only", "photos_meta", "photos_comment", "everything"].includes(filters.mode);
    const includeText = ["text_all", "text_topics", "everything"].includes(filters.mode);
    const photos = includePhotos ? await selectedPhotos(filters) : [];
    const exportedPhotos = photos.map((p) => {
      const base = { id: p.id, date: p.date, name: p.name, type: p.type, size: p.size, dataUrl: p.dataUrl, createdAt: p.createdAt, updatedAt: p.updatedAt };
      if (filters.mode === "photos_comment") return { ...base, comment: p.comment || "" };
      if (filters.mode === "photos_meta" || filters.mode === "everything") return { ...base, comment: p.comment || "", tag: p.tag || "" };
      return base;
    });
    const pack = {
      app: "Life Tracker TEST",
      type: "life-tracker-media-package",
      version: 2,
      exportedAt: new Date().toISOString(),
      filters,
      photos: exportedPhotos
    };
    if (includeText) pack.text = textExport(filters);
    if (filters.mode === "everything") pack.appData = readData();
    return { pack, photos };
  }

  async function refreshExportCount() {
    if (!$("mediaExportCount")) return;
    const filters = exportFilters();
    const photos = await selectedPhotos(filters);
    $("mediaExportCount").textContent = `${photos.length} фото`;
  }

  async function previewExport() {
    const { pack, photos } = await buildPackage();
    const box = $("mediaPreviewBox");
    if (!box) return;
    const lines = [];
    lines.push(`Mode: ${pack.filters.mode}`);
    lines.push(`Period: ${pack.filters.rangeMode === "all" ? "all history" : `from ${rangeStart(pack.filters.rangeMode, pack.filters.customDays)} to ${localToday()}`}`);
    lines.push(`Tag: ${pack.filters.tag || "all"}`);
    lines.push(`Photos: ${photos.length}`);
    if (pack.text) lines.push(`Text days: ${pack.text.entries.length}`);
    lines.push("");
    for (const p of photos.slice(0, 120)) {
      lines.push(`${p.date} · ${p.name || p.id}${p.tag ? ` · #${p.tag}` : ""}${p.comment ? ` · ${p.comment}` : ""}`);
    }
    if (photos.length > 120) lines.push(`… ещё ${photos.length - 120} фото`);
    if (pack.filters.mode === "text_topics") lines.push(`\nTopics: ${(pack.filters.topicIds || []).join(", ") || "none"}`);
    box.textContent = lines.join("\n");
    box.classList.remove("hidden");
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
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  async function exportPackage() {
    const { pack } = await buildPackage();
    const stamp = localToday();
    downloadBlob(`life-tracker-export-${pack.filters.mode}-${stamp}.json`, new Blob([JSON.stringify(pack)], { type: "application/json" }));
  }

  function safePart(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  }

  function extFrom(photo) {
    const original = String(photo.name || "");
    const match = /\.([a-zA-Z0-9]{2,5})$/.exec(original);
    if (match) return `.${match[1].toLowerCase()}`;
    const type = photo.type || dataUrlToBlob(photo.dataUrl).type;
    if (type.includes("png")) return ".png";
    if (type.includes("heic")) return ".heic";
    if (type.includes("webp")) return ".webp";
    return ".jpg";
  }

  function csvEscape(value) {
    const s = String(value ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  async function sharePhotoFiles() {
    const filters = exportFilters();
    const photos = await selectedPhotos(filters);
    if (!photos.length) {
      alert("В текущем фильтре нет фото.");
      return;
    }

    const files = [];
    const manifest = [["filename", "date", "comment", "tag", "original_name"]];
    const captions = [];
    const daySeq = new Map();

    for (const photo of photos) {
      const seq = (daySeq.get(photo.date) || 0) + 1;
      daySeq.set(photo.date, seq);
      const tagPart = safePart(photo.tag ? normalizeTags(photo.tag)[0] : "");
      const filename = `${photo.date}_${String(seq).padStart(2, "0")}${tagPart ? `_${tagPart}` : ""}${extFrom(photo)}`;
      const blob = dataUrlToBlob(photo.dataUrl);
      files.push(new File([blob], filename, { type: blob.type || photo.type || "application/octet-stream" }));
      manifest.push([filename, photo.date, photo.comment || "", photo.tag || "", photo.name || ""]);
      captions.push(`${filename}\t${photo.date}\t${photo.tag || ""}\t${photo.comment || ""}`);
    }

    files.push(new File([manifest.map((row) => row.map(csvEscape).join(",")).join("\n")], "manifest.csv", { type: "text/csv" }));
    files.push(new File([captions.join("\n")], "captions.txt", { type: "text/plain" }));

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files }))) {
        await navigator.share({ files, title: "Life Tracker photos" });
        return;
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.warn("Share failed; falling back to downloads", err);
    }

    for (const file of files) downloadBlob(file.name, file);
  }

  async function importPackage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const pack = JSON.parse(await file.text());
      if (pack?.type !== "life-tracker-media-package" || !Array.isArray(pack.photos)) throw new Error("Это не Life Tracker media package");
      let count = 0;
      for (const photo of pack.photos) {
        if (!photo?.dataUrl || !photo.date) continue;
        await putMedia({
          id: photo.id || `import_${Date.now()}_${count}_${Math.random().toString(36).slice(2, 6)}`,
          date: photo.date,
          dataUrl: photo.dataUrl,
          name: photo.name || `photo-${photo.date}`,
          type: photo.type || dataUrlToBlob(photo.dataUrl).type,
          size: photo.size || dataUrlToBlob(photo.dataUrl).size,
          comment: photo.comment || "",
          tag: photo.tag || "",
          createdAt: photo.createdAt || new Date().toISOString(),
          updatedAt: photo.updatedAt || new Date().toISOString()
        });
        count += 1;
      }
      alert(`Импортировано фото: ${count}`);
      await renderMediaDay();
      await refreshExportFilters();
    } catch (err) {
      alert(`Media import failed: ${err.message}`);
    } finally {
      event.target.value = "";
    }
  }

  async function init() {
    injectCss();
    await migrateOldPhotos();
    setTimeout(async () => {
      ensureMediaCard();
      ensureFullscreen();
      ensureExportCard();
      await renderMediaDay();
      await refreshExportFilters();
    }, 120);

    $("dateInput")?.addEventListener("change", () => setTimeout(renderMediaDay, 80));
    ["prevDay", "nextDay"].forEach((id) => $(id)?.addEventListener("click", () => setTimeout(renderMediaDay, 80)));
    document.querySelector('[data-tab="today"]')?.addEventListener("click", () => setTimeout(renderMediaDay, 80));
    document.querySelector('[data-tab="export"]')?.addEventListener("click", () => setTimeout(refreshExportFilters, 80));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
