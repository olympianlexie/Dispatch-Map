const test = require('node:test');
const assert = require('node:assert/strict');
const { rowsToObjects, parseSheetDate } = require('../netlify/functions/lib/sheetRows');

test('rowsToObjects converts header + rows into keyed objects', () => {
  const result = rowsToObjects([
    ['JO Number', 'Barangay', 'Status'],
    ['JO-001', 'Poblacion', 'Open'],
    ['JO-002', 'Sto. Tomas', 'Closed'],
  ]);
  assert.deepEqual(result, [
    { 'JO Number': 'JO-001', Barangay: 'Poblacion', Status: 'Open' },
    { 'JO Number': 'JO-002', Barangay: 'Sto. Tomas', Status: 'Closed' },
  ]);
});

test('rowsToObjects pads missing trailing cells with empty strings', () => {
  const result = rowsToObjects([
    ['A', 'B', 'C'],
    ['1'], // row shorter than header
  ]);
  assert.deepEqual(result, [{ A: '1', B: '', C: '' }]);
});

test('rowsToObjects returns [] for empty input', () => {
  assert.deepEqual(rowsToObjects([]), []);
  assert.deepEqual(rowsToObjects(undefined), []);
});

test('parseSheetDate parses M/D/YYYY', () => {
  const d = parseSheetDate('9/1/2026');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 8); // September = index 8
  assert.equal(d.getDate(), 1);
});

test('parseSheetDate parses ISO dates', () => {
  const d = parseSheetDate('2026-09-01');
  assert.equal(d.getUTCFullYear(), 2026);
});

test('parseSheetDate returns null for empty/garbage input', () => {
  assert.equal(parseSheetDate(''), null);
  assert.equal(parseSheetDate(null), null);
  assert.equal(parseSheetDate('not a date'), null);
});
