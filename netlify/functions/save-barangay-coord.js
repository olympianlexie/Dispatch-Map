// Called from the admin "unmatched barangays" page when a dispatcher/
// supervisor clicks the map to set a pin for a barangay that failed to
// geocode or match. Updates the row if the barangay already exists in
// BARANGAY_COORDS (e.g. correcting a low-confidence geocode), otherwise
// appends a new one.
//
// POST body: { municipality, barangay, latitude, longitude }

const config = require('./lib/config');
const { getValues, appendRow, updateRow } = require('./lib/sheetsClient');
const { rowsToObjects } = require('./lib/sheetRows');
const { barangayKey } = require('./lib/normalize');
const { requireUser } = require('./lib/auth');

exports.handler = async (event, context) => {
  const user = requireUser(context);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Login required.' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Use POST.' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  const { municipality, barangay, latitude, longitude } = payload;
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (!municipality || !barangay || Number.isNaN(lat) || Number.isNaN(lng)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'municipality, barangay, latitude, and longitude are required.' }),
    };
  }

  try {
    const values = await getValues(config.sheet.barangayCoordsTab);
    const rows = rowsToObjects(values);
    const [muniCol, brgyCol] = config.barangayCoordsColumns;
    const targetKey = barangayKey(barangay, municipality);

    const existingIndex = rows.findIndex((row) => barangayKey(row[brgyCol], row[muniCol]) === targetKey);

    // rowValues follow config.barangayCoordsColumns order:
    // Municipality, Barangay, Latitude, Longitude, Source, Verified, Confidence
    const rowValues = [municipality, barangay, lat, lng, 'manual', 'yes', 'ok'];

    if (existingIndex === -1) {
      await appendRow(config.sheet.barangayCoordsTab, rowValues);
    } else {
      // +2: +1 for the header row, +1 to convert 0-index to 1-index.
      await updateRow(config.sheet.barangayCoordsTab, existingIndex + 2, rowValues);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('save-barangay-coord failed:', err.message);
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
