(() => {
  "use strict";

  const model = window.LifeTrackerMigrationV4;
  if (!model || window.__lifeTrackerMetricCompatibility) return;
  window.__lifeTrackerMetricCompatibility = true;

  function backfillGeneral(data) {
    if (!data || !data.entries || typeof data.entries !== "object") return { data, changed: false };
    let changed = false;
    for (const entry of Object.values(data.entries)) {
      if (!entry || typeof entry !== "object") continue;
      entry.metrics = entry.metrics && typeof entry.metrics === "object" ? entry.metrics : {};
      const general = entry.metrics.general;
      const legacyMetric = entry.metrics.body;
      if ((general === undefined || general === null || String(general).trim() === "") &&
          legacyMetric !== undefined && legacyMetric !== null && String(legacyMetric).trim() !== "") {
        entry.metrics.general = String(legacyMetric);
        changed = true;
      }
    }
    return { data, changed };
  }

  const normalize0 = model.normalizeV4.bind(model);
  const migrate0 = model.migrateV3ToV4.bind(model);
  const load0 = model.loadOrMigrateStorage.bind(model);

  model.normalizeV4 = (source) => backfillGeneral(normalize0(source)).data;
  model.migrateV3ToV4 = (source) => backfillGeneral(migrate0(source)).data;
  model.loadOrMigrateStorage = (storage) => {
    const result = load0(storage);
    if (!result) return result;
    const fixed = backfillGeneral(result);
    if (fixed.changed && storage && typeof storage.setItem === "function") {
      storage.setItem("lifeTrackerData.v4", JSON.stringify(fixed.data));
    }
    return fixed.data;
  };
})();
