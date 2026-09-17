// Phase 1: reads MAINLINE + BARANGAY_COORDS, filters to open installation
// JOs, computes SLA age/bucket per JO, and joins in coordinates.
//
// Returns a FLAT list of JOs (not pre-grouped by barangay) — grouping,
// filtering (cluster/municipality/SLA bucket/assigned), and ranking all
// happen client-side in public/js/app.js so filters can recompute the map
// instantly without another round trip. This function's job is just the
// sheet read + join + SLA math, which only the server should do (it needs
// the service account credentials).
//
// Local test:
//   netlify dev
//   curl http://localhost:8888/api/sheet-jos   (with an Identity token once Identity is enabled)

const config = require('./lib/config');
const { getValues } = require('./lib/sheetsClient');
const { rowsToObjects, parseSheetDate } = require('./lib/sheetRows');
const { normalizeName, barangayKey } = require('./lib/normalize');
const { requireUser } = require('./lib/auth');

const CACHE_TTL_MS = 20_000;
let cache = { data: null, expiresAt: 0 };

function isOpenInstallation(row) {
  const status = (row[config.columns.status] || '').trim().toUpperCase();
  const joType = (row[config.columns.joType] || '').trim().toUpperCase();
  const closedStatuses = config.openInstallation.closedStatuses.map((s) => s.toUpperCase());
  const excludedTypes = config.openInstallation.excludeJoTypes.map((t) => t.toUpperCase());
  if (closedStatuses.includes(status)) return false;
  if (excludedTypes.includes(joType)) return false;
  return true;
}

// "Assigned Crew in JOWEB" uses a bare "-" to mean "not yet assigned" —
// treat that the same as an empty string everywhere else does.
function cleanAssignedTeam(raw) {
  const trimmed = (raw || '').trim();
  return /^-+$/.test(trimmed) ? '' : trimmed;
}

function ageDaysFor(row) {
  const fromSheet = parseInt(row[config.columns.ageingDays], 10);
  if (!Number.isNaN(fromSheet)) return fromSheet;

  // Fallback only if the sheet's own AGEING DAYS is ever blank.
  const receivedDate = parseSheetDate(row[config.columns.dateReceived]);
  return receivedDate ? Math.floor((Date.now() - receivedDate.getTime()) / 86_400_000) : null;
}

function slaBucketFor(ageDays) {
  if (ageDays === null || ageDays === undefined) return 'unknown';
  if (ageDays >= config.sla.breachDays) return 'breached';
  if (ageDays >= config.sla.nearBreachDays) return 'nearBreach';
  return 'withinSla';
}

async function buildJos() {
  const [mainlineValues, coordsValues] = await Promise.all([
    getValues(config.sheet.mainlineTab),
    getValues(config.sheet.barangayCoordsTab),
  ]);

  const mainlineRows = rowsToObjects(mainlineValues);
  const coordRows = rowsToObjects(coordsValues);

  const coordsByKey = new Map();
  coordRows.forEach((row) => {
    const [muniCol, brgyCol, latCol, lngCol] = config.barangayCoordsColumns;
    const key = barangayKey(row[brgyCol], row[muniCol]);
    const lat = parseFloat(row[latCol]);
    const lng = parseFloat(row[lngCol]);
    if (key && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      coordsByKey.set(key, { lat, lng });
    }
  });

  const unmatchedCounts = new Map(); // key -> { barangay, municipality, count }
  const jos = [];

  mainlineRows.forEach((row) => {
    if (!isOpenInstallation(row)) return;

    const rawBarangay = row[config.columns.barangay] || '';
    const rawMunicipality = row[config.columns.municipality] || '';
    const key = barangayKey(rawBarangay, rawMunicipality);
    const coords = coordsByKey.get(key);

    const ageDays = ageDaysFor(row);

    if (!coords) {
      const existing = unmatchedCounts.get(key) || {
        barangay: normalizeName(rawBarangay) || rawBarangay,
        municipality: normalizeName(rawMunicipality) || rawMunicipality,
        count: 0,
      };
      existing.count += 1;
      unmatchedCounts.set(key, existing);
    }

    jos.push({
      joNumber: row[config.columns.joNumber] || '',
      joType: row[config.columns.joType] || '',
      status: row[config.columns.status] || '',
      dateReceived: row[config.columns.dateReceived] || '',
      ageDays,
      slaBucket: slaBucketFor(ageDays),
      barangay: normalizeName(rawBarangay) || rawBarangay,
      municipality: normalizeName(rawMunicipality) || rawMunicipality,
      cluster: row[config.columns.cluster] || '',
      assignedTeam: cleanAssignedTeam(row[config.columns.assignedTeam]),
      // Only what dispatchers need to coordinate on-site — no full address,
      // no account/billing details even if MAINLINE has them.
      subscriberName: row[config.columns.subscriberName] || '',
      contactNumber: row[config.columns.contactNumber] || '',
      lat: coords ? coords.lat : null,
      lng: coords ? coords.lng : null,
      hasCoords: Boolean(coords),
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    jos,
    unmatchedBarangays: Array.from(unmatchedCounts.values()).sort((a, b) => b.count - a.count),
  };
}

// Exported for unit testing (test/sheetJos.test.js) alongside the actual
// Netlify function entry point below.
module.exports.isOpenInstallation = isOpenInstallation;
module.exports.cleanAssignedTeam = cleanAssignedTeam;
module.exports.ageDaysFor = ageDaysFor;
module.exports.slaBucketFor = slaBucketFor;

exports.handler = async (event, context) => {
  const user = requireUser(context);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Login required.' }) };
  }

  try {
    if (!cache.data || cache.expiresAt < Date.now()) {
      cache = { data: await buildJos(), expiresAt: Date.now() + CACHE_TTL_MS };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cache.data),
    };
  } catch (err) {
    console.error('sheet-jos failed:', err.message);
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
