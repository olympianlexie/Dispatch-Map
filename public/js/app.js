// Phase 1 app: fetches open installation JOs, groups them by barangay,
// applies filters, and renders bubble markers + a ranked side panel.
// Grouping/filtering happens here (client-side) rather than in the
// function, so changing a filter is instant and doesn't need a round trip.

(function () {
  let map;
  let markersLayer;
  let vehiclesLayer;
  let allJos = [];
  let unmatchedBarangays = [];

  const filters = {
    cluster: 'all',
    municipality: 'all',
    slaBucket: 'all',
    assignment: 'all', // all | assigned | unassigned
  };

  function severityRank(bucket) {
    return window.DISPATCH_CONFIG.slaSeverityOrder.indexOf(bucket);
  }

  function worstBucket(buckets) {
    return buckets.reduce((worst, b) => (severityRank(b) < severityRank(worst) ? b : worst), 'withinSla');
  }

  function passesFilters(jo) {
    if (filters.cluster !== 'all' && jo.cluster !== filters.cluster) return false;
    if (filters.municipality !== 'all' && jo.municipality !== filters.municipality) return false;
    if (filters.slaBucket !== 'all' && jo.slaBucket !== filters.slaBucket) return false;
    if (filters.assignment === 'assigned' && !jo.assignedTeam) return false;
    if (filters.assignment === 'unassigned' && jo.assignedTeam) return false;
    return true;
  }

  function groupByBarangay(jos) {
    const groups = new Map();
    jos.forEach((jo) => {
      if (!jo.hasCoords) return;
      const key = `${jo.municipality}|${jo.barangay}`;
      if (!groups.has(key)) {
        groups.set(key, {
          municipality: jo.municipality,
          barangay: jo.barangay,
          lat: jo.lat,
          lng: jo.lng,
          jos: [],
        });
      }
      groups.get(key).jos.push(jo);
    });

    return Array.from(groups.values()).map((g) => {
      const buckets = g.jos.map((j) => j.slaBucket);
      const breachedCount = buckets.filter((b) => b === 'breached').length;
      const nearBreachCount = buckets.filter((b) => b === 'nearBreach').length;
      const oldestAge = Math.max(...g.jos.map((j) => (j.ageDays === null ? -1 : j.ageDays)));
      return Object.assign(g, {
        total: g.jos.length,
        breachedCount,
        nearBreachCount,
        oldestAge,
        worstBucket: worstBucket(buckets),
      });
    });
  }

  function radiusForCount(count, maxCount) {
    const { min, max } = window.DISPATCH_CONFIG.bubbleRadius;
    if (maxCount <= 1) return min;
    const scale = Math.sqrt(count / maxCount);
    return Math.round(min + scale * (max - min));
  }

  function renderPopup(group) {
    const rows = group.jos
      .slice()
      .sort((a, b) => (b.ageDays || 0) - (a.ageDays || 0))
      .map(
        (j) => `
        <tr>
          <td>${j.joNumber}</td>
          <td>${j.ageDays ?? '?'}</td>
          <td>${j.status}</td>
          <td>${j.assignedTeam || '<em>unassigned</em>'}</td>
          <td>${j.subscriberName}<br><small>${j.contactNumber}</small></td>
        </tr>`
      )
      .join('');

    return `
      <div class="jo-popup">
        <h3>${group.barangay}, ${group.municipality}</h3>
        <p>${group.total} open installation JO(s) &middot; ${group.breachedCount} breached</p>
        <table>
          <thead><tr><th>JO #</th><th>Age (d)</th><th>Status</th><th>Team</th><th>Subscriber</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function renderMap(groups) {
    markersLayer.clearLayers();
    const maxCount = Math.max(1, ...groups.map((g) => g.total));

    groups.forEach((g) => {
      const color = window.DISPATCH_CONFIG.slaColors[g.worstBucket] || window.DISPATCH_CONFIG.slaColors.unknown;
      const marker = L.circleMarker([g.lat, g.lng], {
        radius: radiusForCount(g.total, maxCount),
        color,
        fillColor: color,
        fillOpacity: 0.6,
        weight: 2,
      });
      marker.bindPopup(renderPopup(g));
      marker.on('click', () => window.DispatchAssist.renderVehicleRanking(g));
      marker.addTo(markersLayer);
    });
  }

  function renderSidePanel(groups) {
    const ranked = groups
      .slice()
      .sort((a, b) => b.breachedCount - a.breachedCount || b.oldestAge - a.oldestAge || b.total - a.total);

    const list = document.getElementById('barangay-ranking');
    list.innerHTML = ranked
      .map(
        (g) => `
        <li class="rank-item sla-${g.worstBucket}">
          <strong>${g.barangay}, ${g.municipality}</strong>
          <span>${g.total} open &middot; ${g.breachedCount} breached &middot; oldest ${g.oldestAge}d</span>
        </li>`
      )
      .join('');

    const unmatchedList = document.getElementById('unmatched-list');
    if (unmatchedBarangays.length === 0) {
      unmatchedList.innerHTML = '<li>None &mdash; all barangays have coordinates.</li>';
    } else {
      unmatchedList.innerHTML = unmatchedBarangays
        .map((u) => `<li>${u.barangay}, ${u.municipality} (${u.count} JO${u.count === 1 ? '' : 's'})</li>`)
        .join('');
    }
  }

  function populateFilterOptions() {
    const clusters = Array.from(new Set(allJos.map((j) => j.cluster).filter(Boolean))).sort();
    const municipalities = Array.from(new Set(allJos.map((j) => j.municipality).filter(Boolean))).sort();

    fillSelect('filter-cluster', clusters);
    fillSelect('filter-municipality', municipalities);
  }

  function fillSelect(id, values) {
    const select = document.getElementById(id);
    const current = select.value;
    select.innerHTML =
      '<option value="all">All</option>' + values.map((v) => `<option value="${v}">${v}</option>`).join('');
    if (values.includes(current)) select.value = current;
  }

  function applyFiltersAndRender() {
    const filtered = allJos.filter(passesFilters);
    const groups = groupByBarangay(filtered);
    window.DispatchAssist.setBarangayGroups(groups);
    renderMap(groups);
    renderSidePanel(groups);
  }

  function wireFilterControls() {
    document.getElementById('filter-cluster').addEventListener('change', (e) => {
      filters.cluster = e.target.value;
      applyFiltersAndRender();
    });
    document.getElementById('filter-municipality').addEventListener('change', (e) => {
      filters.municipality = e.target.value;
      applyFiltersAndRender();
    });
    document.getElementById('filter-sla').addEventListener('change', (e) => {
      filters.slaBucket = e.target.value;
      applyFiltersAndRender();
    });
    document.getElementById('filter-assignment').addEventListener('change', (e) => {
      filters.assignment = e.target.value;
      applyFiltersAndRender();
    });
  }

  function wireLayerToggles() {
    document.getElementById('toggle-jos').addEventListener('change', (e) => {
      if (e.target.checked) map.addLayer(markersLayer);
      else map.removeLayer(markersLayer);
    });
    document.getElementById('toggle-vehicles').addEventListener('change', (e) => {
      if (e.target.checked) map.addLayer(vehiclesLayer);
      else map.removeLayer(vehiclesLayer);
    });
  }

  async function loadData() {
    try {
      const data = await window.DispatchApi.fetchJos();
      allJos = data.jos;
      unmatchedBarangays = data.unmatchedBarangays;
      document.getElementById('last-updated').textContent = `Updated ${new Date(data.generatedAt).toLocaleTimeString()}`;
      populateFilterOptions();
      applyFiltersAndRender();
    } catch (err) {
      console.error('Failed to load JOs:', err);
      document.getElementById('last-updated').textContent = 'Failed to load data — see console.';
    }
  }

  function start() {
    map = window.DispatchMap.init('map');
    markersLayer = L.layerGroup().addTo(map);
    vehiclesLayer = window.DispatchVehicles.start(map);
    wireFilterControls();
    wireLayerToggles();
    loadData();
    setInterval(loadData, window.DISPATCH_CONFIG.refreshIntervalMs);
  }

  window.DispatchAuth.init(start);
})();
