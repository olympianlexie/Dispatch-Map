// Stands in for public/js/api.js in the demo — same interface
// (fetchJos/fetchVehicles/saveBarangayCoord/runGeocode), returning
// window.DemoData instead of hitting /api/sheet-jos or /api/cartrack-vehicles.
// app.js, vehicles.js, and dispatch.js run completely unmodified against this.

window.DispatchApi = (function () {
  function fetchJos() {
    return Promise.resolve({
      generatedAt: new Date().toISOString(),
      jos: window.DemoData.buildJos(),
      unmatchedBarangays: window.DemoData.unmatchedBarangays,
    });
  }

  function fetchVehicles() {
    return Promise.resolve({
      generatedAt: new Date().toISOString(),
      vehicles: window.DemoData.buildVehicles(),
    });
  }

  function saveBarangayCoord() {
    return Promise.reject(new Error('Demo mode: barangay pins are not saved anywhere. Use the real app for this.'));
  }

  function runGeocode() {
    return Promise.reject(new Error('Demo mode: geocoding is not available. Use the real app for this.'));
  }

  return { fetchJos, fetchVehicles, saveBarangayCoord, runGeocode };
})();
