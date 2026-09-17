const test = require('node:test');
const assert = require('node:assert/strict');
const { getPath, firstMatch } = require('../netlify/functions/lib/pathGet');

test('getPath reads nested dot-path values', () => {
  const obj = { location: { lat: 14.25, lng: 121.3 } };
  assert.equal(getPath(obj, 'location.lat'), 14.25);
  assert.equal(getPath(obj, 'location.lng'), 121.3);
});

test('getPath returns undefined for a missing path', () => {
  assert.equal(getPath({ a: 1 }, 'a.b.c'), undefined);
  assert.equal(getPath({}, 'nope'), undefined);
});

test('firstMatch tries candidates in order and returns the first hit', () => {
  const nested = { location: { lat: 14.25, updated: '2026-09-17T10:00:00Z' } };
  assert.equal(firstMatch(nested, ['lat', 'location.lat']), 14.25);
  assert.equal(firstMatch(nested, ['location.updated', 'event_ts']), '2026-09-17T10:00:00Z');
});

test('firstMatch works against a flat (non-nested) shape using the same candidate list', () => {
  const flat = { latitude: 14.1, event_ts: 1758100000 };
  assert.equal(firstMatch(flat, ['location.lat', 'latitude', 'lat']), 14.1);
  assert.equal(firstMatch(flat, ['location.updated', 'event_ts']), 1758100000);
});

test('firstMatch skips null/undefined/empty-string candidates', () => {
  const obj = { a: '', b: null, c: undefined, d: 'value' };
  assert.equal(firstMatch(obj, ['a', 'b', 'c', 'd']), 'value');
});

test('firstMatch returns undefined when nothing matches', () => {
  assert.equal(firstMatch({ a: 1 }, ['x', 'y.z']), undefined);
});
