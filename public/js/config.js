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
};
