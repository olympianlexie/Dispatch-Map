// Shared by cartrack-test.js and cartrack-vehicles.js so the auth header
// and base URL handling only live in one place.

function buildAuthHeader() {
  const { CARTRACK_USERNAME, CARTRACK_PASSWORD } = process.env;
  if (!CARTRACK_USERNAME || !CARTRACK_PASSWORD) {
    throw new Error('Missing CARTRACK_USERNAME or CARTRACK_PASSWORD env var.');
  }
  return 'Basic ' + Buffer.from(`${CARTRACK_USERNAME}:${CARTRACK_PASSWORD}`).toString('base64');
}

function baseUrl() {
  const { CARTRACK_BASE_URL } = process.env;
  if (!CARTRACK_BASE_URL) {
    throw new Error('Missing CARTRACK_BASE_URL env var.');
  }
  return CARTRACK_BASE_URL.replace(/\/$/, '');
}

module.exports = { buildAuthHeader, baseUrl };
