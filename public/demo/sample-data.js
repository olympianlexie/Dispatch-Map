// Fully synthetic data for the no-credentials demo — fake subscriber names,
// fake phone numbers (555 prefix, the standard "this is not real" convention),
// approximate (not survey-grade) coordinates for real Laguna town centers.
// None of this touches the real MAINLINE sheet or Cartrack API.

window.DemoData = (function () {
  const barangays = [
    { barangay: 'Poblacion', municipality: 'Calamba City', cluster: 'CLUSTER 2', lat: 14.2117, lng: 121.1653 },
    { barangay: 'Balibago', municipality: 'Santa Rosa City', cluster: 'CLUSTER 1', lat: 14.3122, lng: 121.1114 },
    { barangay: 'Mamatid', municipality: 'Cabuyao City', cluster: 'CLUSTER 2', lat: 14.2803, lng: 121.13 },
    { barangay: 'Landayan', municipality: 'San Pedro City', cluster: 'CLUSTER 1', lat: 14.3453, lng: 121.055 },
    { barangay: 'Poblacion', municipality: 'Los Banos', cluster: 'CLUSTER 3', lat: 14.1651, lng: 121.2413 },
    { barangay: 'Concepcion', municipality: 'Lumban', cluster: 'CLUSTER 3', lat: 14.2975, lng: 121.4614 },
    { barangay: 'Burgos', municipality: 'Pakil', cluster: 'CLUSTER 4', lat: 14.3833, lng: 121.4833 },
    { barangay: 'Poblacion', municipality: 'Binan City', cluster: 'CLUSTER 1', lat: 14.3306, lng: 121.085 },
  ];

  const names = [
    'Juan Dela Cruz', 'Maria Santos', 'Jose Reyes', 'Ana Bautista', 'Pedro Garcia',
    'Rosa Mendoza', 'Carlos Ramos', 'Luz Fernandez', 'Miguel Torres', 'Elena Cruz',
    'Antonio Flores', 'Carmen Aquino', 'Ricardo Gomez', 'Teresa Villanueva',
  ];

  // [barangayIndex, ageDays, status, assignedTeam] — ageDays drives the SLA
  // bucket using the same thresholds as netlify/functions/lib/config.js's
  // defaults (nearBreach >= 3 days, breached >= 5 days).
  const joPlan = [
    [0, 7, 'ON GOING', 'Team Alpha'],
    [0, 3, 'ON GOING', 'Team Alpha'],
    [0, 1, 'FOR RELEASING', ''],
    [1, 6, 'ON GOING', 'Team Bravo'],
    [1, 0, 'FOR RELEASING', ''],
    [2, 1, 'ON GOING', 'Team Charlie'],
    [3, 4, 'ON GOING', 'Team Alpha'],
    [3, 3, 'ON GOING', ''],
    [4, 8, 'ON GOING', 'Team Delta'],
    [5, 2, 'FOR RELEASING', ''],
    [5, 1, 'ON GOING', 'Team Bravo'],
    [6, 0, 'FOR RELEASING', ''],
    [7, 4, 'ON GOING', ''],
    [7, 1, 'ON GOING', 'Team Charlie'],
  ];

  function buildJos() {
    return joPlan.map(([bIdx, ageDays, status, assignedTeam], i) => {
      const b = barangays[bIdx];
      const slaBucket = ageDays >= 5 ? 'breached' : ageDays >= 3 ? 'nearBreach' : 'withinSla';
      return {
        joNumber: `DEMO-${1000 + i}`,
        joType: 'CONSUMER',
        status,
        dateReceived: '',
        ageDays,
        slaBucket,
        barangay: b.barangay,
        municipality: b.municipality,
        cluster: b.cluster,
        assignedTeam,
        subscriberName: names[i % names.length],
        contactNumber: `0917 555 0${100 + i}`,
        lat: b.lat,
        lng: b.lng,
        hasCoords: true,
      };
    });
  }

  // A couple of "unmatched" barangays too, so the side panel's "Needs
  // coordinates" section isn't empty in the demo.
  const unmatchedBarangays = [
    { barangay: 'Sampaloc', municipality: 'Pila', count: 2 },
    { barangay: 'San Isidro', municipality: 'Victoria', count: 1 },
  ];

  const vehiclePlan = [
    { id: 'V1', plate: 'ABC 1234', team: 'Team Alpha', near: 0, speed: 25, ignition: true, stale: false },
    { id: 'V2', plate: 'XYZ 5678', team: 'Team Bravo', near: 1, speed: 0, ignition: true, stale: false },
    { id: 'V3', plate: 'DEF 4321', team: 'Team Charlie', near: 3, speed: 40, ignition: true, stale: false },
    { id: 'V4', plate: 'GHI 9999', team: 'Team Delta', near: 4, speed: 0, ignition: false, stale: true },
    { id: 'V5', plate: 'JKL 2222', team: '', near: 5, speed: 15, ignition: true, stale: false },
  ];

  // Kept between fetchVehicles() calls so "moving" vehicles visibly drift on
  // each refresh instead of teleporting back to the same spot.
  const drift = {};

  function buildVehicles() {
    return vehiclePlan.map((v) => {
      const base = barangays[v.near];
      drift[v.id] = drift[v.id] || { lat: base.lat + 0.004, lng: base.lng + 0.004, dir: 1 };
      const moving = v.speed > 2 && v.ignition;
      if (moving) {
        drift[v.id].lat += 0.0006 * drift[v.id].dir;
        drift[v.id].lng += 0.0004 * drift[v.id].dir;
        if (Math.abs(drift[v.id].lat - base.lat) > 0.01) drift[v.id].dir *= -1;
      }

      const lastUpdate = v.stale
        ? new Date(Date.now() - 45 * 60_000).toISOString() // fixed ~45 min ago, stays gray
        : new Date().toISOString();

      return {
        vehicleId: v.id,
        registration: v.plate,
        lat: drift[v.id].lat,
        lng: drift[v.id].lng,
        ignitionOn: v.ignition,
        speedKph: v.speed,
        moving,
        driver: '',
        lastUpdate,
        stale: v.stale,
        team: v.team,
        cluster: v.team ? barangays[v.near].cluster : '',
        matchedInSheet: Boolean(v.team),
      };
    });
  }

  return { buildJos, buildVehicles, unmatchedBarangays };
})();
