// Deliverable 1: smoke test for Cartrack Fleet API access.
//
// Calls the vehicles list endpoint with the credentials from env vars and
// returns the raw response so we can confirm (a) auth works and (b) the
// exact field names Cartrack sends back for our account, before building
// anything that depends on them.
//
// Local test:
//   netlify dev
//   curl http://localhost:8888/api/cartrack-test
//
// Never hardcode credentials here — they must only ever come from Netlify
// environment variables (Site settings > Environment variables, or a local
// .env file that is gitignored).

const fetch = require('node-fetch');
const { buildAuthHeader, baseUrl } = require('./lib/cartrackAuth');
const cartrackConfig = require('./lib/cartrackConfig');
const { requireUser } = require('./lib/auth');

exports.handler = async (event, context) => {
  const user = requireUser(context);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Login required.' }) };
  }

  let url;
  try {
    url = `${baseUrl()}${cartrackConfig.vehiclesEndpointPath}`;
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: buildAuthHeader(),
      },
    });

    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    // Log status/shape only — never log the Authorization header or full
    // response body if it might contain anything sensitive.
    console.log(`Cartrack /rest/vehicles responded ${response.status}`);

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        {
          requestedUrl: url,
          status: response.status,
          ok: response.ok,
          vehicleCount: Array.isArray(body) ? body.length : Array.isArray(body?.data) ? body.data.length : undefined,
          body,
        },
        null,
        2
      ),
    };
  } catch (err) {
    console.error('Cartrack test request failed:', err.message);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Request to Cartrack failed', message: err.message }),
    };
  }
};
