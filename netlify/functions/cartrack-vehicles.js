// Phase 2: live vehicle locations, joined with the VEHICLES sheet tab for
// team/cluster assignment.
//
// Fetches Cartrack's /rest/vehicles/status once and caches it in module
// scope for cartrackConfig.cacheTtlMs, so every dispatcher's browser
// polling this endpoint doesn't multiply calls against Cartrack's
// 60-calls/minute limit — they all share the same cached fetch.
//
// Field extraction uses lib/cartrackConfig.js's candidate-path lists
// because the exact response shape isn't confirmed yet (see that file's
// comment). This function's response includes `rawSample` — the first
// unprocessed vehicle object — specifically so it's easy to compare
// against what the `fields` config extracted and fix any mismatches.
//
// Local test:
//   netlify dev
//   curl http://localhost:8888/api/cartrack-vehicles   (needs an Identity token)

const fetch = require('node-fetch');
const { buildAuthHeader, baseUrl } = require('./lib/cartrackAuth');
const cartrackConfig = require('./lib/cartrackConfig');
const sheetConfig = require('./lib/config');
const { getValues } = require('./lib/sheetsClient');
const { rowsToObjects } = require('./lib/sheetRows');
const { normalizePlate } = require('./lib/normalize');
const { firstMatch } = require('./lib/pathGet');
const { requireUser } = require('./lib/auth');

let cache = { data: null, expiresAt: 0 };

function extractList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.vehicles)) return raw.vehicles;
  return [];
}

// Cartrack's timestamp field could come back as an ISO string or an epoch
// number in seconds or milliseconds — handle all three rather than assume.
function parseTimestamp(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') {
    const ms = value > 1e12 ? value : value * 1000; // seconds -> ms
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function truthyIgnition(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['on', 'true', '1', 'yes'].includes((value || '').toString().toLowerCase());
}

async function loadVehicleTeamMap() {
  const values = await getValues(sheetConfig.sheet.vehiclesTab);
  const rows = rowsToObjects(values);
  const cols = sheetConfig.vehicleColumns;

  const byPlate = new Map();
  const byCartrackId = new Map();
  rows.forEach((row) => {
    const info = { team: row[cols.team] || '', cluster: row[cols.cluster] || '' };
    const plate = normalizePlate(row[cols.plate]);
    const cartrackId = (row[cols.cartrackId] || '').trim();
    if (plate) byPlate.set(plate, info);
    if (cartrackId) byCartrackId.set(cartrackId, info);
  });
  return { byPlate, byCartrackId };
}

async function buildVehicles() {
  const url = `${baseUrl()}${cartrackConfig.statusEndpointPath}`;
  const [statusRes, teamMap] = await Promise.all([
    fetch(url, { headers: { Accept: 'application/json', Authorization: buildAuthHeader() } }),
    loadVehicleTeamMap(),
  ]);

  if (!statusRes.ok) {
    throw new Error(`Cartrack status request failed: ${statusRes.status}`);
  }
  const raw = await statusRes.json();
  const list = extractList(raw);
  const { fields } = cartrackConfig;

  const vehicles = list.map((v) => {
    const vehicleId = (firstMatch(v, fields.vehicleId) || '').toString();
    const registration = (firstMatch(v, fields.registration) || '').toString();
    const plateKey = normalizePlate(registration);

    const teamInfo = teamMap.byCartrackId.get(vehicleId) || teamMap.byPlate.get(plateKey) || null;

    const lastUpdate = parseTimestamp(firstMatch(v, fields.lastUpdate));
    const staleMinutes = lastUpdate ? (Date.now() - lastUpdate.getTime()) / 60_000 : null;
    const ignitionOn = truthyIgnition(firstMatch(v, fields.ignition));
    const speedKph = Number(firstMatch(v, fields.speedKph)) || 0;

    const lat = parseFloat(firstMatch(v, fields.lat));
    const lng = parseFloat(firstMatch(v, fields.lng));

    return {
      vehicleId,
      registration,
      lat: Number.isNaN(lat) ? null : lat,
      lng: Number.isNaN(lng) ? null : lng,
      ignitionOn,
      speedKph,
      moving: ignitionOn && speedKph > cartrackConfig.movingSpeedThresholdKph,
      driver: (firstMatch(v, fields.driver) || '').toString(),
      lastUpdate: lastUpdate ? lastUpdate.toISOString() : null,
      stale: staleMinutes === null || staleMinutes > cartrackConfig.staleAfterMinutes,
      team: teamInfo ? teamInfo.team : '',
      cluster: teamInfo ? teamInfo.cluster : '',
      matchedInSheet: Boolean(teamInfo),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    vehicles,
    // Remove once cartrackConfig.js's `fields` candidate paths are trimmed
    // down to the confirmed real ones — kept for now to make that easy.
    rawSample: list[0] || null,
  };
}

exports.handler = async (event, context) => {
  const user = requireUser(context);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Login required.' }) };
  }

  try {
    if (!cache.data || cache.expiresAt < Date.now()) {
      cache = { data: await buildVehicles(), expiresAt: Date.now() + cartrackConfig.cacheTtlMs };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cache.data),
    };
  } catch (err) {
    console.error('cartrack-vehicles failed:', err.message);
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
