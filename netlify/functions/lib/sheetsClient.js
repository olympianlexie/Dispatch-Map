// Thin wrapper around the Sheets API v4 REST endpoints, authenticated with
// the service account token from googleAuth.js.

const fetch = require('node-fetch');
const { getAccessToken } = require('./googleAuth');

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

async function getValues(tabName, range = 'A:Z') {
  const sheetId = process.env.SHEET_ID;
  if (!sheetId) throw new Error('Missing SHEET_ID env var.');
  const token = await getAccessToken();

  const url = `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(`${tabName}!${range}`)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Sheets read failed for ${tabName}: ${data.error?.message || res.status}`);
  }
  return data.values || [];
}

// Appends a new row at the bottom of the tab.
async function appendRow(tabName, rowValues) {
  const sheetId = process.env.SHEET_ID;
  const token = await getAccessToken();

  const url = `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(`${tabName}!A:A`)}:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowValues] }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Sheets append failed for ${tabName}: ${data.error?.message || res.status}`);
  }
  return data;
}

// Overwrites a specific 1-indexed row (e.g. rowNumber=5 -> row 5) with new
// values, starting at column A.
async function updateRow(tabName, rowNumber, rowValues) {
  const sheetId = process.env.SHEET_ID;
  const token = await getAccessToken();

  const lastCol = String.fromCharCode('A'.charCodeAt(0) + rowValues.length - 1);
  const range = `${tabName}!A${rowNumber}:${lastCol}${rowNumber}`;
  const url = `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowValues] }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Sheets update failed for ${tabName}: ${data.error?.message || res.status}`);
  }
  return data;
}

module.exports = { getValues, appendRow, updateRow };
