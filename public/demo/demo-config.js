// Loaded after /js/config.js — overrides just the refresh cadence so the
// simulated vehicle movement is visible without a long wait. Everything
// else (colors, weights, thresholds) stays as the real app ships it.
window.DISPATCH_CONFIG.refreshIntervalMs = 15_000;
window.DISPATCH_CONFIG.vehicleRefreshIntervalMs = 4_000;
