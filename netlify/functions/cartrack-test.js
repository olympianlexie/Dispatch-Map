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

exports.handler = async () => {
  const { CARTRACK_BASE_URL, CARTRACK_USERNAME, CARTRACK_PASSWORD } = process.env;

  if (!CARTRACK_BASE_URL || !CARTRACK_USERNAME || !CARTRACK_PASSWORD) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Missing CARTRACK_BASE_URL, CARTRACK_USERNAME, or CARTRACK_PASSWORD env var.',
      }),
    };
  }

  const url = `${CARTRACK_BASE_URL.replace(/\/$/, '')}/rest/vehicles`;
  const authHeader = 'Basic ' + Buffer.from(`${CARTRACK_USERNAME}:${CARTRACK_PASSWORD}`).toString('base64');

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: authHeader,
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
