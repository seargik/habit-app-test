(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.LifeTrackerLegacyCarryover = api;
    if (root.LifeTrackerMigrationV4) api.install(root.LifeTrackerMigrationV4);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function hasMeaningfulRecord(record) {
    if (!record || typeof record !== "object") return false;
    return [record.status, record.comment, record.notes]
      .some((value) => value != null && String(value).trim() !== "");
  }

  function carryoverDefinitions(data, date) {
    const entry = data?.entries?.[date];
    if (!entry?.habits) return [];

    const definitions = Array.isArray(data?.habits) ? data.habits : [];
    return definitions
      .filter((definition) => definition?.definitionSetId === "legacy_v3")
      .filter((definition) => definition.endDate && date > definition.endDate)
      .filter((definition) => hasMeaningfulRecord(entry.habits[definition.id]))
      .map((definition) => ({
        ...definition,
        name: `Legacy carryover · ${definition.name}`,
        _legacyCarryover: true
      }));
  }

  function mergeWithCarryover(baseDefinitions, extras) {
    const seen = new Set((baseDefinitions || []).map((definition) => definition.id));
    return [
      ...(baseDefinitions || []),
      ...(extras || []).filter((definition) => !seen.has(definition.id))
    ];
  }

  function install(model) {
    if (!model || typeof model.definitionsForDate !== "function" || model.__legacyCarryoverInstalled) return model;
    const baseDefinitionsForDate = model.definitionsForDate.bind(model);
    model.definitionsForDate = function definitionsForDateWithCarryover(data, date) {
      return mergeWithCarryover(
        baseDefinitionsForDate(data, date),
        carryoverDefinitions(data, date)
      );
    };
    model.__legacyCarryoverInstalled = true;
    return model;
  }

  return { hasMeaningfulRecord, carryoverDefinitions, mergeWithCarryover, install };
});
