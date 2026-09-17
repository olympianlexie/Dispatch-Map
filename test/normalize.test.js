const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeName, barangayKey, normalizePlate } = require('../netlify/functions/lib/normalize');

test('normalizeName strips Brgy./Barangay prefixes', () => {
  assert.equal(normalizeName('Brgy. Poblacion'), 'Poblacion');
  assert.equal(normalizeName('Barangay Poblacion'), 'Poblacion');
});

test('normalizeName expands Sto./Sta. without leaving a stray period', () => {
  assert.equal(normalizeName('Brgy. Sto. Tomas'), 'Santo Tomas');
  assert.equal(normalizeName('Barangay Sta. Cruz'), 'Santa Cruz');
});

test('normalizeName collapses whitespace and title-cases', () => {
  assert.equal(normalizeName('  poblacion   ii  '), 'Poblacion Ii');
});

test('normalizeName handles empty/falsy input', () => {
  assert.equal(normalizeName(''), '');
  assert.equal(normalizeName(null), '');
  assert.equal(normalizeName(undefined), '');
});

test('barangayKey matches equivalent names regardless of abbreviation/case/spacing', () => {
  assert.equal(barangayKey('Brgy. Sto. Tomas', 'Sta. Rosa'), barangayKey('Santo Tomas', 'Santa Rosa'));
  assert.equal(barangayKey('poblacion', 'Calamba'), barangayKey('Poblacion', 'CALAMBA'));
});

test('barangayKey treats genuinely different barangays as different', () => {
  assert.notEqual(barangayKey('Poblacion', 'Calamba'), barangayKey('Poblacion', 'Los Banos'));
});

test('normalizePlate strips punctuation/spacing and uppercases', () => {
  assert.equal(normalizePlate('abc-1234'), 'ABC1234');
  assert.equal(normalizePlate('ABC 1234'), 'ABC1234');
  assert.equal(normalizePlate('abc-1234'), normalizePlate('ABC 1234'));
});

test('normalizePlate handles empty/falsy input', () => {
  assert.equal(normalizePlate(''), '');
  assert.equal(normalizePlate(null), '');
});
