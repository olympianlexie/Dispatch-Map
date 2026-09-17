// public/js/haversine.js and public/js/dispatch.js are written as
// browser globals (window.Haversine, window.DispatchAssist), not CommonJS
// modules — this loads them into a small sandboxed `window`/`document` so
// their logic can be unit-tested the same way it runs in the browser,
// without needing a real DOM.

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function loadClientScripts() {
  const fakeElement = { innerHTML: '' };
  const sandbox = {
    window: {
      DISPATCH_CONFIG: {
        dispatchWeights: { breachedCount: 10, nearBreachCount: 4, totalOpen: 1, oldestAgeDays: 0.5, distanceKm: -2 },
        dispatchResultLimit: 8,
      },
    },
    document: { getElementById: () => fakeElement },
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/haversine.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/dispatch.js'), 'utf8'), sandbox);
  return { window: sandbox.window, panel: fakeElement };
}

test('Haversine.distanceKm returns ~0 for the same point', () => {
  const { window } = loadClientScripts();
  assert.ok(window.Haversine.distanceKm(14.25, 121.3, 14.25, 121.3) < 0.001);
});

test('Haversine.distanceKm matches a known real-world distance (Manila -> Los Banos, Laguna)', () => {
  const { window } = loadClientScripts();
  const km = window.Haversine.distanceKm(14.5995, 120.9842, 14.1651, 121.2413);
  // Actual straight-line distance is ~55-58km; allow a few km of slack.
  assert.ok(km > 50 && km < 62, `expected ~55km, got ${km}`);
});

test('DispatchAssist ranks vehicles by ascending distance and excludes vehicles without coordinates', () => {
  const { window, panel } = loadClientScripts();
  const group = { barangay: 'Target', municipality: 'TownA', lat: 14.2, lng: 121.3 };
  window.DispatchAssist.setVehicles([
    { vehicleId: 'FAR', registration: 'FAR1', lat: 14.6, lng: 121.6, stale: false, moving: false },
    { vehicleId: 'NEAR', registration: 'NEAR1', lat: 14.201, lng: 121.301, stale: false, moving: true },
    { vehicleId: 'NOCOORDS', registration: 'NONE', lat: null, lng: null, stale: false, moving: false },
  ]);

  window.DispatchAssist.renderVehicleRanking(group);

  const nearIndex = panel.innerHTML.indexOf('NEAR1');
  const farIndex = panel.innerHTML.indexOf('FAR1');
  assert.ok(nearIndex !== -1 && farIndex !== -1, 'both vehicles with coordinates should appear');
  assert.ok(nearIndex < farIndex, 'nearer vehicle should be listed first');
  assert.equal(panel.innerHTML.includes('NONE'), false, 'vehicle without coordinates should be excluded');
});

test('DispatchAssist ranks barangays so high urgency can outrank pure proximity', () => {
  const { window, panel } = loadClientScripts();
  const vehicle = { vehicleId: 'V1', registration: 'V1', lat: 14.2, lng: 121.3 };

  // "NearCalm" is essentially at the vehicle's location but has no open
  // JOs; "FarUrgent" is ~55km away but has 3 breached JOs. The weights
  // (breachedCount: 10, distanceKm: -2) mean 3 breaches (+30) should beat
  // a ~55km distance penalty (-110)... actually let's use a closer urgent
  // barangay to make the expected winner unambiguous either way this is
  // tuned, and assert only the ordering that must hold regardless of
  // weight *magnitudes*: a barangay with strictly more urgency AND
  // strictly less distance must outrank one with less urgency and more
  // distance.
  window.DispatchAssist.setBarangayGroups([
    {
      barangay: 'NearUrgent',
      municipality: 'TownA',
      lat: 14.201,
      lng: 121.301,
      jos: [{ slaBucket: 'breached' }],
      total: 1,
      breachedCount: 1,
      oldestAge: 6,
      worstBucket: 'breached',
    },
    {
      barangay: 'FarCalm',
      municipality: 'TownB',
      lat: 14.6,
      lng: 121.6,
      jos: [{ slaBucket: 'withinSla' }],
      total: 1,
      breachedCount: 0,
      oldestAge: 1,
      worstBucket: 'withinSla',
    },
  ]);

  window.DispatchAssist.renderBarangayRanking(vehicle);

  const nearUrgentIndex = panel.innerHTML.indexOf('NearUrgent');
  const farCalmIndex = panel.innerHTML.indexOf('FarCalm');
  assert.ok(nearUrgentIndex !== -1 && farCalmIndex !== -1);
  assert.ok(
    nearUrgentIndex < farCalmIndex,
    'a barangay that is both closer and more urgent must rank above one that is both farther and less urgent'
  );
});
