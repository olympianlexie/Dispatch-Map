// Lets a dispatcher/supervisor pick a barangay that failed to geocode or
// match, click the map to place it, and save that pin back to
// BARANGAY_COORDS via /api/save-barangay-coord.

(function () {
  let map;
  let selected = null;
  let pendingMarker = null;

  function renderList(unmatched) {
    const list = document.getElementById('unmatched-select-list');
    if (unmatched.length === 0) {
      list.innerHTML = '<li>Nothing to fix &mdash; all barangays have coordinates.</li>';
      return;
    }
    list.innerHTML = unmatched
      .map(
        (u, i) => `
        <li class="rank-item" data-index="${i}">
          <strong>${u.barangay}, ${u.municipality}</strong>
          <span>${u.count} open JO(s)</span>
        </li>`
      )
      .join('');

    list.querySelectorAll('.rank-item').forEach((el) => {
      el.addEventListener('click', () => {
        list.querySelectorAll('.rank-item').forEach((li) => li.classList.remove('selected'));
        el.classList.add('selected');
        selected = unmatched[Number(el.dataset.index)];
        document.getElementById('selected-info').textContent = `Selected: ${selected.barangay}, ${selected.municipality}. Click the map to place its pin.`;
      });
    });
  }

  async function loadUnmatched() {
    const data = await window.DispatchApi.fetchJos();
    renderList(data.unmatchedBarangays);
  }

  function onMapClick(e) {
    if (!selected) {
      alert('Pick a barangay from the list first.');
      return;
    }
    if (pendingMarker) map.removeLayer(pendingMarker);
    pendingMarker = L.marker(e.latlng).addTo(map);

    const popupContent = document.createElement('div');
    popupContent.innerHTML = `<p>${selected.barangay}, ${selected.municipality}</p>`;
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Save this pin';
    confirmBtn.addEventListener('click', async () => {
      try {
        await window.DispatchApi.saveBarangayCoord({
          municipality: selected.municipality,
          barangay: selected.barangay,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        });
        alert('Saved. Reloading the unmatched list.');
        selected = null;
        map.removeLayer(pendingMarker);
        pendingMarker = null;
        loadUnmatched();
      } catch (err) {
        alert(`Failed to save: ${err.message}`);
      }
    });
    popupContent.appendChild(confirmBtn);
    pendingMarker.bindPopup(popupContent).openPopup();
  }

  function start() {
    map = window.DispatchMap.init('admin-map');
    map.on('click', onMapClick);
    loadUnmatched();

    document.getElementById('run-geocode').addEventListener('click', async () => {
      const btn = document.getElementById('run-geocode');
      btn.disabled = true;
      btn.textContent = 'Running (this can take a while, ~1 req/sec)…';
      try {
        const result = await window.DispatchApi.runGeocode();
        alert(`Geocoded ${result.geocoded.length} of ${result.queued} new barangays. ${result.failed.length} failed — see console.`);
        console.log('Geocode failures:', result.failed);
        loadUnmatched();
      } catch (err) {
        alert(`Geocoding pass failed: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Run geocoding pass';
      }
    });
  }

  window.DispatchAuth.init(start);
})();
