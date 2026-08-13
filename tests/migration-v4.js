(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LifeTrackerMigrationV4 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 4;
  const APP_VERSION = "4.0-phase1";
  const EFFECTIVE_DATE = "2026-08-08";
  const LEGACY_END_DATE = "2026-08-07";

  const NEW_HABITS = [
    {
      id: "ai_engineering",
      name: "AI / Engineering",
      description: "Develop technical capabilities leading toward Analytics Engineering / Data & AI Solutions / AI Automation.",
      minDescription: "At least ~15 minutes of concrete progress: AI API, Python, agent, MCP, RAG, eval, Cloud Run AI service, data/AI integration, technical experiment, or reading followed by a concrete implementation note.",
      doneDescription: "Approximately 45–90+ minutes of meaningful project work or a completed technical deliverable.",
      contextNotes: "",
      active: true,
      order: 1
    },
    {
      id: "metaforge_product",
      name: "MetaForge / Product / Independent Asset",
      description: "Develop real product/growth/data experience outside salary employment.",
      minDescription: "One tangible step: useful developer question, measurement hypothesis, funnel idea, analytics query, documented product idea, implementation task, or meaningful discussion.",
      doneDescription: "Substantial progress such as analytics audit, funnel analysis, tracking design, dashboard/data model, experiment proposal, implementation, case-study work, or measurable product outcome.",
      contextNotes: "",
      active: true,
      order: 2
    },
    {
      id: "trading_investing",
      name: "Trading + Investing",
      description: "Treat trading as a disciplined experiment rather than entertainment or gambling while keeping long-term investing visible.",
      minDescription: "Trading analysis/journal/position review/setup-checklist OR portfolio/allocation review, planned investment, or investment-plan update. Executing a trade alone does not count.",
      doneDescription: "Trading: analysis + setup + checklist + risk/stop + journal (+ post-analysis when applicable), or a meaningful planned investing action/review.",
      contextNotes: "",
      active: true,
      order: 3
    },
    {
      id: "career_income",
      name: "Career / Work / Income",
      description: "Increase professional market value and avoid becoming permanently comfortable in the current role.",
      minDescription: "One small concrete career action: inspect a vacancy, improve CV/LinkedIn, contact someone, document an accomplishment, or move an important career task.",
      doneDescription: "Meaningful result: application, interview, significant CV/portfolio update, major current-work achievement, salary/career discussion, or external income opportunity.",
      contextNotes: "",
      active: true,
      order: 4
    },
    {
      id: "body_nutrition",
      name: "Body + Nutrition",
      description: "Health, physical condition and daily energy.",
      minDescription: "Meaningful movement and reasonably controlled nutrition.",
      doneDescription: "Strong training/movement day plus generally good nutrition.",
      contextNotes: "",
      active: true,
      order: 5
    },
    {
      id: "son_connection",
      name: "Connection with Son",
      description: "Maintain a stable father–son connection despite distance.",
      minDescription: "5–10 minute call/video call, voice message, photo, short meaningful exchange, ask about his day, or share something from dad’s day.",
      doneDescription: "Longer quality conversation, shared online activity, planning/preparing the next meeting, meaningful remote activity, or actual quality time together.",
      contextNotes: "",
      active: true,
      order: 6
    },
    {
      id: "people_contact",
      name: "People / Live Contact",
      description: "Prevent life from becoming only work, gym, computer and TV.",
      minDescription: "One meaningful human interaction: real call, conversation, coffee, walk, meeting, social activity, or meaningful interaction with colleague/friend/family.",
      doneDescription: "A substantial live/social experience that gives energy or connection.",
      contextNotes: "",
      active: true,
      order: 7
    },
    {
      id: "money",
      name: "Money / Financial Control",
      description: "Support freedom through deliberate cash-flow control rather than obsessive micro-saving.",
      minDescription: "Record/check spending, avoid an obvious impulse purchase, or review upcoming spending.",
      doneDescription: "Planned spending, budget/cash-flow review, savings allocation, or a larger financial decision made deliberately.",
      contextNotes: "",
      active: true,
      order: 8
    },
    {
      id: "recovery_tomorrow",
      name: "Recovery + Tomorrow",
      description: "Close the current day properly and reduce friction for tomorrow.",
      minDescription: "Prepare or review tomorrow’s plan, basic preparation, and a reasonable bedtime/recovery decision.",
      doneDescription: "Tomorrow planned; useful preparation completed; bedtime target respected; useful recovery.",
      contextNotes: "",
      active: true,
      order: 9
    },
    {
      id: "life_experience",
      name: "Experience / Life",
      description: "Build an interesting life rather than defaulting to passive comfort.",
      minDescription: "One deliberate experience outside routine: new walk/route, bicycle, cinema, café, cultural event, swimming, new place, activity, meeting, or small outing. Passive entertainment at home does not count.",
      doneDescription: "A more substantial experience: mini-trip, concert, theatre, event, new city/place, meaningful activity, or something worth remembering.",
      contextNotes: "",
      active: true,
      order: 10
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function firstEntryDate(entries, fallbackDate) {
    const dates = Object.keys(entries || {}).filter(isIsoDate).sort();
    if (dates.length) return dates[0];
    if (isIsoDate(fallbackDate)) return fallbackDate;
    return null;
  }

  function isIsoDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function legacyDefinition(habit, index, startDate) {
    const source = habit && typeof habit === "object" ? clone(habit) : {};
    const minText = source.min || source.minDescription || "";
    return {
      ...source,
      id: String(source.id || `legacy_${index + 1}`),
      name: String(source.name || source.id || `Legacy habit ${index + 1}`),
      min: minText,
      minDescription: source.minDescription || minText,
      doneDescription: source.doneDescription || "",
      description: source.description || "",
      contextNotes: source.contextNotes || "",
      active: source.active !== false,
      order: Number.isFinite(Number(source.order)) ? Number(source.order) : index + 1,
      definitionSetId: "legacy_v3",
      startDate,
      endDate: LEGACY_END_DATE
    };
  }

  function currentDefinition(habit, inheritedContextNotes = "") {
    return {
      ...clone(habit),
      min: habit.min || habit.minDescription || "",
      contextNotes: habit.contextNotes || inheritedContextNotes || "",
      definitionSetId: "life_v4",
      startDate: EFFECTIVE_DATE,
      endDate: null
    };
  }

  function verifyHistoryPreserved(source, migrated) {
    const before = JSON.stringify((source && source.entries) || {});
    const after = JSON.stringify((migrated && migrated.entries) || {});
    if (before !== after) {
      throw new Error("Migration safety check failed: entries changed");
    }
    return true;
  }

  function migrateV3ToV4(source) {
    if (!source || typeof source !== "object") throw new Error("Invalid v3 data");
    if (source.version != null && Number(source.version) !== 3) {
      throw new Error(`Expected schema version 3, got ${source.version}`);
    }

    const sourceCopy = clone(source);
    const entries = sourceCopy.entries && typeof sourceCopy.entries === "object" ? sourceCopy.entries : {};
    const legacyHabits = Array.isArray(sourceCopy.habits) ? sourceCopy.habits : [];
    const createdDate = typeof sourceCopy.createdAt === "string" ? sourceCopy.createdAt.slice(0, 10) : null;
    const legacyStartDate = firstEntryDate(entries, createdDate);
    const legacySon = legacyHabits.find((habit) => habit && habit.id === "son_quality_time");
    const inheritedSonContext = legacySon
      ? String(legacySon.contextNotes || legacySon.minDescription || legacySon.min || "")
      : "";

    const migrated = {
      ...sourceCopy,
      version: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      habits: [
        ...legacyHabits.map((habit, index) => legacyDefinition(habit, index, legacyStartDate)),
        ...NEW_HABITS.map((habit) => currentDefinition(
          habit,
          habit.id === "son_connection" ? inheritedSonContext : ""
        ))
      ],
      settings: {
        ...(sourceCopy.settings && typeof sourceCopy.settings === "object" ? sourceCopy.settings : {}),
        visibleMetrics: Array.isArray(sourceCopy.settings?.visibleMetrics)
          ? sourceCopy.settings.visibleMetrics
          : ["general", "sleep", "energy", "stress", "body"]
      },
      migration: {
        ...(sourceCopy.migration && typeof sourceCopy.migration === "object" ? sourceCopy.migration : {}),
        fromVersion: 3,
        effectiveDate: EFFECTIVE_DATE
      }
    };

    verifyHistoryPreserved(source, migrated);
    return migrated;
  }

  function normalizeV4(source) {
    if (!source || typeof source !== "object") throw new Error("Invalid v4 data");
    const safe = clone(source);
    safe.version = SCHEMA_VERSION;
    safe.appVersion = APP_VERSION;
    safe.entries = safe.entries && typeof safe.entries === "object" ? safe.entries : {};
    safe.habits = Array.isArray(safe.habits) ? safe.habits : [];
    safe.settings = safe.settings && typeof safe.settings === "object" ? safe.settings : {};
    safe.settings.visibleMetrics = Array.isArray(safe.settings.visibleMetrics)
      ? safe.settings.visibleMetrics
      : ["general", "sleep", "energy", "stress", "body"];
    return safe;
  }

  function loadOrMigrateStorage(storage) {
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
      throw new Error("A localStorage-compatible storage object is required");
    }

    const v4Raw = storage.getItem("lifeTrackerData.v4");
    if (v4Raw) {
      const parsed = JSON.parse(v4Raw);
      if (Number(parsed.version) !== SCHEMA_VERSION) {
        throw new Error(`Stored v4 key contains schema version ${parsed.version}`);
      }
      return normalizeV4(parsed);
    }

    const v3Raw = storage.getItem("lifeTrackerData.v3");
    if (!v3Raw) return null;

    const source = JSON.parse(v3Raw);
    const migrated = migrateV3ToV4(source);
    verifyHistoryPreserved(source, migrated);

    storage.setItem("lifeTrackerData.v4", JSON.stringify(migrated));

    if (storage.getItem("lifeTrackerData.v3") !== v3Raw) {
      throw new Error("Migration safety check failed: v3 storage changed");
    }

    return migrated;
  }

  function isDefinitionValidOn(definition, date) {
    if (!definition || !isIsoDate(date)) return false;
    if (definition.active === false) return false;
    if (definition.startDate && date < definition.startDate) return false;
    if (definition.endDate && date > definition.endDate) return false;
    return true;
  }

  function definitionsForDate(data, date) {
    const definitions = Array.isArray(data?.habits) ? data.habits : [];
    return definitions
      .filter((definition) => isDefinitionValidOn(definition, date))
      .slice()
      .sort((a, b) => {
        const orderDiff = Number(a.order || 0) - Number(b.order || 0);
        if (orderDiff) return orderDiff;
        return String(a.name || a.id).localeCompare(String(b.name || b.id));
      });
  }

  function definitionsForSettings(data, date) {
    const definitions = Array.isArray(data?.habits) ? data.habits : [];
    return definitions.slice().sort((a, b) => {
      const aCurrent = isDefinitionValidOn(a, date) ? 1 : 0;
      const bCurrent = isDefinitionValidOn(b, date) ? 1 : 0;
      if (aCurrent !== bCurrent) return bCurrent - aCurrent;

      const aEnd = a.endDate || "9999-12-31";
      const bEnd = b.endDate || "9999-12-31";
      if (aEnd !== bEnd) return bEnd.localeCompare(aEnd);

      return Number(a.order || 0) - Number(b.order || 0);
    });
  }

  return {
    SCHEMA_VERSION,
    APP_VERSION,
    EFFECTIVE_DATE,
    LEGACY_END_DATE,
    NEW_HABITS: clone(NEW_HABITS),
    migrateV3ToV4,
    normalizeV4,
    verifyHistoryPreserved,
    loadOrMigrateStorage,
    definitionsForDate,
    definitionsForSettings,
    isDefinitionValidOn
  };
});
