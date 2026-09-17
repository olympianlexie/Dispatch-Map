window.DispatchApi = (function () {
  async function authedFetch(url, options = {}) {
    const token = await window.DispatchAuth.getToken();
    const headers = Object.assign({}, options.headers, token ? { Authorization: `Bearer ${token}` } : {});
    const res = await fetch(url, Object.assign({}, options, { headers }));
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${url} -> ${res.status}: ${body}`);
    }
    return res.json();
  }

  // Pass forceFresh=true right after a write (e.g. saving a barangay pin)
  // so the caller doesn't see the pre-write data for up to the server's
  // cache TTL — see the matching comment in netlify/functions/sheet-jos.js.
  function fetchJos(forceFresh) {
    return authedFetch(forceFresh ? '/api/sheet-jos?fresh=1' : '/api/sheet-jos');
  }

  function fetchVehicles() {
    return authedFetch('/api/cartrack-vehicles');
  }

  function saveBarangayCoord(payload) {
    return authedFetch('/api/save-barangay-coord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  function runGeocode() {
    return authedFetch('/api/geocode-barangays', { method: 'POST' });
  }

  return { fetchJos, fetchVehicles, saveBarangayCoord, runGeocode };
})();
