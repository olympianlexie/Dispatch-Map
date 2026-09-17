// Every popup/panel in this app builds HTML via template literals using
// data that ultimately comes from a shared Google Sheet or the Cartrack
// API — both editable/influenced by people other than the dispatcher
// viewing the page (sales agents enter JO rows; fleet/ops staff maintain
// the VEHICLES tab). That data is not trusted input, so anything
// interpolated into innerHTML must be escaped here first, or it becomes a
// stored-XSS sink for whoever views the map.

window.escapeHtml = function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.toString().replace(/[&<>"']/g, (c) => entities[c]);
};
