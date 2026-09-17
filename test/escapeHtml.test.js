// escapeHtml is a browser global (window.escapeHtml), not a CommonJS
// module — load it the same way test/clientDispatch.test.js loads the
// other browser-global scripts.

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function loadEscapeHtml() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/escapeHtml.js'), 'utf8'), sandbox);
  return sandbox.window.escapeHtml;
}

test('escapeHtml neutralizes the five HTML-significant characters', () => {
  const escapeHtml = loadEscapeHtml();
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(escapeHtml(`"'&<>`), '&quot;&#39;&amp;&lt;&gt;');
});

test('escapeHtml leaves plain text untouched', () => {
  const escapeHtml = loadEscapeHtml();
  assert.equal(escapeHtml('Poblacion'), 'Poblacion');
  assert.equal(escapeHtml('Juan Dela Cruz'), 'Juan Dela Cruz');
});

test('escapeHtml handles non-string and empty input without throwing', () => {
  const escapeHtml = loadEscapeHtml();
  assert.equal(escapeHtml(''), '');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(42), '42');
});
