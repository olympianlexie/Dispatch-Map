// Straight-line ("as the crow flies") distance between two lat/lng points.
// Used for Phase 3 dispatch ranking — real road travel time would need a
// routing service (e.g. OSRM) and is deliberately not attempted here; see
// the approx-distance note shown alongside every ranking in the UI.

window.Haversine = (function () {
  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius, km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  return { distanceKm };
})();
