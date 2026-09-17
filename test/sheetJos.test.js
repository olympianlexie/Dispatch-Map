// Tests the MAINLINE filtering/SLA logic against synthetic rows shaped
// like the real "SLI New Database" sheet (confirmed column names and
// STATUS ON JOWEB / JO TYPE values — see netlify/functions/lib/config.js).
// No real subscriber data here, only the column structure and status
// vocabulary that was confirmed against it.

const test = require('node:test');
const assert = require('node:assert/strict');
const { isOpenInstallation, cleanAssignedTeam, ageDaysFor, slaBucketFor } = require('../netlify/functions/sheet-jos');
const config = require('../netlify/functions/lib/config');

function row(overrides) {
  return {
    [config.columns.status]: 'ON GOING',
    [config.columns.joType]: 'CONSUMER',
    [config.columns.ageingDays]: '2',
    [config.columns.dateReceived]: 'June 30, 2026',
    ...overrides,
  };
}

test('isOpenInstallation excludes CLOSE and CANCELLED', () => {
  assert.equal(isOpenInstallation(row({ [config.columns.status]: 'CLOSE' })), false);
  assert.equal(isOpenInstallation(row({ [config.columns.status]: 'CANCELLED' })), false);
});

test('isOpenInstallation includes ON GOING and FOR RELEASING', () => {
  assert.equal(isOpenInstallation(row({ [config.columns.status]: 'ON GOING' })), true);
  assert.equal(isOpenInstallation(row({ [config.columns.status]: 'FOR RELEASING' })), true);
});

test('isOpenInstallation treats status comparison as case-insensitive', () => {
  assert.equal(isOpenInstallation(row({ [config.columns.status]: 'close' })), false);
  assert.equal(isOpenInstallation(row({ [config.columns.status]: 'Close' })), false);
});

test('isOpenInstallation includes an unrecognized future status rather than silently dropping it', () => {
  assert.equal(isOpenInstallation(row({ [config.columns.status]: 'SOME NEW STATUS NOBODY HAS SEEN YET' })), true);
});

test('cleanAssignedTeam treats a bare dash as unassigned', () => {
  assert.equal(cleanAssignedTeam('-'), '');
  assert.equal(cleanAssignedTeam('--'), '');
  assert.equal(cleanAssignedTeam(''), '');
  assert.equal(cleanAssignedTeam(undefined), '');
});

test('cleanAssignedTeam preserves a real crew code', () => {
  assert.equal(cleanAssignedTeam('OIS0000030 -'), 'OIS0000030 -');
  assert.equal(cleanAssignedTeam('SJEJ'), 'SJEJ');
});

test('ageDaysFor reads the sheet\'s own AGEING DAYS column when present', () => {
  assert.equal(ageDaysFor(row({ [config.columns.ageingDays]: '7' })), 7);
});

test('ageDaysFor falls back to computing from DATE CREATED when AGEING DAYS is blank', () => {
  const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000);
  const dateStr = tenDaysAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const result = ageDaysFor(row({ [config.columns.ageingDays]: '', [config.columns.dateReceived]: dateStr }));
  assert.ok(result >= 9 && result <= 11, `expected ~10 days, got ${result}`);
});

test('slaBucketFor buckets correctly at the configured thresholds', () => {
  assert.equal(slaBucketFor(0), 'withinSla');
  assert.equal(slaBucketFor(config.sla.nearBreachDays), 'nearBreach');
  assert.equal(slaBucketFor(config.sla.breachDays), 'breached');
  assert.equal(slaBucketFor(null), 'unknown');
});
