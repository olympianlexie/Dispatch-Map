window.DispatchMap = (function () {
  function init(elementId) {
    const cfg = window.DISPATCH_CONFIG.map;
    const map = L.map(elementId).setView(cfg.center, cfg.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    return map;
  }

  return { init };
})();
