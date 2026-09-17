// Client-side display config — safe to tweak without touching app logic.
// Server-side SLA thresholds live in netlify/functions/lib/config.js; this
// file only controls how the map/panel *look*, not which JOs count as
// breached.

window.DISPATCH_CONFIG = {
  map: {
    // Rough center of Laguna province.
    center: [14.25, 121.3],
    zoom: 10,
  },

  refreshIntervalMs: 60_000,
  vehicleRefreshIntervalMs: 60_000,

  vehicleColors: {
    moving: '#1565c0',
    idle: '#616161',
    stale: '#bdbdbd',
  },

  slaColors: {
    withinSla: '#2e7d32',
    nearBreach: '#f9a825',
    breached: '#c62828',
    unknown: '#757575',
  },

  // Most urgent bucket wins when coloring a barangay bubble that has a mix
  // of JOs in different buckets.
  slaSeverityOrder: ['breached', 'nearBreach', 'unknown', 'withinSla'],

  bubbleRadius: {
    min: 8,
    max: 28,
  },

  // Phase 3: weights for ranking barangays when a vehicle is selected.
  // priority = breachedCount*w.breachedCount + nearBreachCount*w.nearBreachCount
  //          + totalOpen*w.totalOpen + oldestAgeDays*w.oldestAgeDays
  //          + distanceKm*w.distanceKm
  // Higher priority = suggested first. distanceKm's weight is negative so
  // farther barangays score lower; everything else is additive urgency.
  // Tune freely — there's no "correct" value, only what matches how your
  // dispatchers actually prioritize.
  dispatchWeights: {
    breachedCount: 10,
    nearBreachCount: 4,
    totalOpen: 1,
    oldestAgeDays: 0.5,
    distanceKm: -2,
  },

  // How many ranked results to show per dispatch suggestion.
  dispatchResultLimit: 8,
};
