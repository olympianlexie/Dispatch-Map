// Finds every (barangay, municipality) pair in MAINLINE that isn't yet in
// BARANGAY_COORDS, geocodes each one via Nominatim (1 request/second, per
// their usage policy), and appends the results. Never re-geocodes a
// barangay that's already in the tab, even a low-confidence one — those
// are meant to be fixed manually via the admin click-to-pin page, not
// silently overwritten by a re-run.
//
// This hits an external rate-limited API sequentially, so it's meant to be
// triggered manually (button on the admin page, or invoked directly) —
// NOT on every map load. Wire it to a Netlify scheduled function later
// (e.g. nightly) once Phase 1 is stable, if automatic detection of new
// barangays is wanted.
//
// Manual run:
//   netlify dev
//   curl -X POST http://localhost:8888/api/geocode-barangays

const config = require('./lib/config');
const { getValues, appendRow } = require('./lib/sheetsClient');
const { rowsToObjects } = require('./lib/sheetRows');
const { normalizeName, barangayKey } = require('./lib/normalize');
const { requireUser } = require('./lib/auth');
const fetch = require('node-fetch');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const REQUEST_DELAY_MS = 1100; // stay under Nominatim's 1 req/sec limit

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeOne(barangay, municipality) {
  const userAgent = process.env.NOMINATIM_USER_AGENT;
  if (!userAgent) throw new Error('Missing NOMINATIM_USER_AGENT env var (required by Nominatim usage policy).');

  const query = `Barangay ${barangay}, ${municipality}, Laguna, Philippines`;
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;

  const res = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim request failed: ${res.status}`);
  const results = await res.json();
  if (!results.length) return null;

  const result = results[0];
  // Flag as low-confidence if the result's display name doesn't mention
  // the municipality we asked for — a sign it may have landed in the
  // wrong town (Laguna has repeated barangay names across municipalities).
  const displayName = (result.display_name || '').toLowerCase();
  const confidence = displayName.includes(municipality.toLowerCase()) ? 'ok' : 'low-check-municipality';

  return { lat: parseFloat(result.lat), lng: parseFloat(result.lon), confidence };
}

exports.handler = async (event, context) => {
  const user = requireUser(context);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Login required.' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Use POST.' }) };
  }

  try {
    const [mainlineValues, coordsValues] = await Promise.all([
      getValues(config.sheet.mainlineTab),
      getValues(config.sheet.barangayCoordsTab),
    ]);

    const mainlineRows = rowsToObjects(mainlineValues);
    const coordRows = rowsToObjects(coordsValues);
    const [muniCol, brgyCol] = config.barangayCoordsColumns;

    const knownKeys = new Set(coordRows.map((row) => barangayKey(row[brgyCol], row[muniCol])));

    const toGeocode = new Map(); // key -> { barangay, municipality }
    mainlineRows.forEach((row) => {
      const barangay = row[config.columns.barangay];
      const municipality = row[config.columns.municipality];
      if (!barangay || !municipality) return;
      const key = barangayKey(barangay, municipality);
      if (!knownKeys.has(key) && !toGeocode.has(key)) {
        toGeocode.set(key, { barangay: normalizeName(barangay), municipality: normalizeName(municipality) });
      }
    });

    const results = [];
    const failures = [];

    // Sequential on purpose — Nominatim's usage policy caps us at 1 req/sec.
    for (const { barangay, municipality } of toGeocode.values()) {
      try {
        const geocoded = await geocodeOne(barangay, municipality);
        if (geocoded) {
          await appendRow(config.sheet.barangayCoordsTab, [
            municipality,
            barangay,
            geocoded.lat,
            geocoded.lng,
            'geocoded',
            'no',
            geocoded.confidence,
          ]);
          results.push({ barangay, municipality, ...geocoded });
        } else {
          failures.push({ barangay, municipality, reason: 'no Nominatim result' });
        }
      } catch (err) {
        failures.push({ barangay, municipality, reason: err.message });
      }
      await sleep(REQUEST_DELAY_MS);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geocoded: results, failed: failures, queued: toGeocode.size }),
    };
  } catch (err) {
    console.error('geocode-barangays failed:', err.message);
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
