// Phase 3: dispatch assistance. Ranks vehicles for a selected barangay
// (pure distance) or barangays for a selected vehicle (weighted priority
// combining SLA urgency, open JO count, and distance). Reads its input
// from whatever app.js/vehicles.js last rendered — see setBarangayGroups/
// setVehicles below — rather than fetching anything itself.

window.DispatchAssist = (function () {
  let barangayGroups = [];
  let vehicles = [];

  function setBarangayGroups(groups) {
    barangayGroups = groups;
  }

  function setVehicles(list) {
    vehicles = list;
  }

  function rankVehiclesForBarangay(group) {
    return vehicles
      .filter((v) => v.lat !== null && v.lng !== null)
      .map((v) => ({ vehicle: v, distanceKm: window.Haversine.distanceKm(group.lat, group.lng, v.lat, v.lng) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  function rankBarangaysForVehicle(vehicle) {
    const w = window.DISPATCH_CONFIG.dispatchWeights;
    return barangayGroups
      .map((g) => {
        const distanceKm = window.Haversine.distanceKm(vehicle.lat, vehicle.lng, g.lat, g.lng);
        const nearBreachCount = g.jos.filter((j) => j.slaBucket === 'nearBreach').length;
        const oldestAgeDays = g.oldestAge > 0 ? g.oldestAge : 0;
        const priority =
          g.breachedCount * w.breachedCount +
          nearBreachCount * w.nearBreachCount +
          g.total * w.totalOpen +
          oldestAgeDays * w.oldestAgeDays +
          distanceKm * w.distanceKm;
        return { group: g, distanceKm, priority };
      })
      .sort((a, b) => b.priority - a.priority);
  }

  function panel() {
    return document.getElementById('dispatch-panel');
  }

  function renderVehicleRanking(group) {
    const limit = window.DISPATCH_CONFIG.dispatchResultLimit;
    const ranked = rankVehiclesForBarangay(group).slice(0, limit);

    panel().innerHTML = `
      <p class="approx-note">Nearest vehicles to <strong>${group.barangay}, ${group.municipality}</strong> — straight-line distance to the barangay centroid, not road travel time.</p>
      <ol class="rank-list">
        ${
          ranked.length === 0
            ? '<li>No vehicles with a current location.</li>'
            : ranked
                .map(
                  (r) => `
          <li class="rank-item ${r.vehicle.stale ? 'sla-unknown' : 'sla-withinSla'}">
            <strong>${r.vehicle.registration || r.vehicle.vehicleId}</strong> ${r.vehicle.team ? `&middot; ${r.vehicle.team}` : ''}
            <span>${r.distanceKm.toFixed(1)} km &middot; ${r.vehicle.stale ? 'stale' : r.vehicle.moving ? 'moving' : 'idle'}</span>
          </li>`
                )
                .join('')
        }
      </ol>`;
  }

  function renderBarangayRanking(vehicle) {
    const limit = window.DISPATCH_CONFIG.dispatchResultLimit;
    const ranked = rankBarangaysForVehicle(vehicle).slice(0, limit);

    panel().innerHTML = `
      <p class="approx-note">Priority barangays for <strong>${vehicle.registration || vehicle.vehicleId}</strong> — distance is straight-line to each barangay's centroid; priority also weighs SLA urgency and open JO count (adjustable in public/js/config.js).</p>
      <ol class="rank-list">
        ${
          ranked.length === 0
            ? '<li>No barangays with open installation JOs and known coordinates.</li>'
            : ranked
                .map(
                  (r) => `
          <li class="rank-item sla-${r.group.worstBucket}">
            <strong>${r.group.barangay}, ${r.group.municipality}</strong>
            <span>${r.distanceKm.toFixed(1)} km &middot; ${r.group.total} open &middot; ${r.group.breachedCount} breached</span>
          </li>`
                )
                .join('')
        }
      </ol>`;
  }

  return { setBarangayGroups, setVehicles, renderVehicleRanking, renderBarangayRanking };
})();
