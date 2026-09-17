// Phase 2: live Cartrack vehicle layer. Self-contained module — app.js
// creates the map and calls DispatchVehicles.start(map) once, alongside
// its own JO layer.

window.DispatchVehicles = (function () {
  let vehiclesLayer;

  function relativeTime(isoString) {
    if (!isoString) return 'never';
    const minutes = Math.round((Date.now() - new Date(isoString).getTime()) / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.round(minutes / 60)}h ago`;
  }

  function colorFor(vehicle) {
    const colors = window.DISPATCH_CONFIG.vehicleColors;
    if (vehicle.stale) return colors.stale;
    return vehicle.moving ? colors.moving : colors.idle;
  }

  function renderPopup(vehicle) {
    return `
      <div class="vehicle-popup">
        <h3>${vehicle.registration || vehicle.vehicleId || 'Unknown vehicle'}</h3>
        <p>${vehicle.team || '<em>not mapped in VEHICLES tab</em>'}</p>
        <p>${vehicle.ignitionOn ? 'Ignition on' : 'Ignition off'} &middot; ${vehicle.speedKph.toFixed(0)} km/h</p>
        <p>Updated ${relativeTime(vehicle.lastUpdate)}${vehicle.stale ? ' &mdash; stale' : ''}</p>
      </div>`;
  }

  function render(vehicles) {
    window.DispatchAssist.setVehicles(vehicles);
    vehiclesLayer.clearLayers();
    vehicles
      .filter((v) => v.lat !== null && v.lng !== null)
      .forEach((v) => {
        const marker = L.circleMarker([v.lat, v.lng], {
          radius: 7,
          color: '#ffffff',
          weight: 1,
          fillColor: colorFor(v),
          fillOpacity: v.stale ? 0.4 : 0.9,
        });
        marker.bindPopup(renderPopup(v));
        marker.on('click', () => window.DispatchAssist.renderBarangayRanking(v));
        marker.addTo(vehiclesLayer);
      });
  }

  async function load() {
    try {
      const data = await window.DispatchApi.fetchVehicles();
      render(data.vehicles);
    } catch (err) {
      // Cartrack may not be configured yet (Phase 2 pending credentials) —
      // fail quietly rather than spamming the console every refresh cycle.
      console.warn('Vehicle layer unavailable:', err.message);
    }
  }

  function start(map) {
    vehiclesLayer = L.layerGroup().addTo(map);
    load();
    setInterval(load, window.DISPATCH_CONFIG.vehicleRefreshIntervalMs);
    return vehiclesLayer;
  }

  return { start };
})();
