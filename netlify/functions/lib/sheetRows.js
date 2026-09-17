// Converts the raw [[header,...],[row,...],...] shape the Sheets API
// returns into an array of { headerText: cellValue } objects, so the rest
// of the code can refer to columns by name instead of index.

function rowsToObjects(values) {
  if (!values || values.length === 0) return [];
  const headers = values[0].map((h) => (h || '').toString().trim());
  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] !== undefined && row[i] !== null ? row[i].toString().trim() : '';
    });
    return obj;
  });
}

// Parses a date cell that may come back as "M/D/YYYY", "YYYY-MM-DD", or
// already-ISO text depending on how the sheet cell is formatted. Returns
// null (rather than throwing) if it can't be parsed, so callers can flag
// rows with an unparseable date instead of crashing.
function parseSheetDate(value) {
  if (!value) return null;
  const trimmed = value.toString().trim();
  if (!trimmed) return null;

  const isoLike = new Date(trimmed);
  if (!Number.isNaN(isoLike.getTime())) return isoLike;

  const parts = trimmed.split(/[\/-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map((p) => parseInt(p, 10));
    if (!Number.isNaN(a) && !Number.isNaN(b) && !Number.isNaN(c)) {
      // Assume M/D/YYYY (typical PH spreadsheet format).
      const candidate = new Date(c, a - 1, b);
      if (!Number.isNaN(candidate.getTime())) return candidate;
    }
  }

  return null;
}

module.exports = { rowsToObjects, parseSheetDate };
