// Everything that depends on facts about Cartrack's actual response shape,
// which hasn't been confirmed yet (developer.cartrack.com wasn't reachable
// while building this — see cartrack-test.js). Each logical field lists
// candidate JSON paths to try, in order, since we're guessing at the exact
// key names from partial docs/third-party references rather than a
// confirmed schema.
//
// Once you've run cartrack-test.js (vehicle list) and looked at a real
// /rest/vehicles/status response — the `rawSample` field in
// /api/cartrack-vehicles' response shows exactly this — trim each
// candidate list down to the one real path. Leaving multiple candidates
// is a guessing aid for getting this working the first time, not something
// to rely on long-term: a wrong guess could silently match an unrelated
// field with the same name.

module.exports = {
  vehiclesEndpointPath: '/rest/vehicles',
  statusEndpointPath: '/rest/vehicles/status',

  // Server-side cache for the status endpoint, shared across every
  // dispatcher viewing the map, so N concurrent viewers still only cost
  // ~1 upstream call per cacheTtlMs (well under the 60 calls/minute limit).
  cacheTtlMs: 45_000,

  // A vehicle whose last location update is older than this is shown
  // grayed-out on the map (likely offline / out of signal).
  staleAfterMinutes: 15,

  // A vehicle counts as "moving" if ignition is on and speed exceeds this
  // (guards against GPS jitter reporting a tiny nonzero speed while parked).
  movingSpeedThresholdKph: 2,

  fields: {
    vehicleId: ['vehicle_id', 'id', 'registration'],
    registration: ['registration', 'vehicle_registration', 'plate', 'plate_no'],
    lat: ['location.lat', 'location.latitude', 'latitude', 'lat'],
    lng: ['location.lng', 'location.longitude', 'longitude', 'lng', 'lon'],
    ignition: ['ignition', 'ignition_on', 'ignition_status'],
    speedKph: ['speed', 'speed_kph', 'location.speed'],
    driver: ['driver', 'driver_name', 'driver_id'],
    // Cartrack's OpenAPI date fields carry no timezone marker in at least
    // one third-party integration's notes — treat parsed timestamps as
    // approximate until verified against a known vehicle's real location.
    lastUpdate: ['location.updated', 'event_ts', 'last_update', 'updated_at', 'timestamp'],
  },
};
