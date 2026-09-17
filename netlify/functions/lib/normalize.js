// Best-effort normalization for messy barangay/municipality names coming
// out of the sheet (free text entered by different agents), so we can match
// them against BARANGAY_COORDS and Nominatim results. It won't catch every
// misspelling — anything it can't match ends up in the "unmatched
// barangays" list for manual fixing, by design.

function normalizeName(raw) {
  if (!raw) return '';
  let s = raw.toString().trim();

  // Strip common "Barangay"/"Brgy." prefixes.
  s = s.replace(/^\s*(brgy\.?|barangay)\s+/i, '');

  // Standardize "Sto./Sta." abbreviations to their full form. The boundary
  // must come before the optional trailing dot — "Sto." is followed by a
  // space, and "." and " " are both non-word characters, so \b can't match
  // between them; putting \b right after the letters (before the dot)
  // avoids that trap.
  s = s.replace(/\bsto\b\.?/gi, 'Santo');
  s = s.replace(/\bsta\b\.?/gi, 'Santa');

  // Collapse whitespace and punctuation spacing.
  s = s.replace(/\s+/g, ' ').trim();

  // Title-case for display purposes.
  s = s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return s;
}

// Case/whitespace-insensitive key for matching two (barangay, municipality)
// pairs against each other.
function barangayKey(barangay, municipality) {
  return `${normalizeName(barangay)}|${normalizeName(municipality)}`.toLowerCase();
}

// Uppercase + strip everything but alphanumerics, so "ABC 1234", "abc-1234"
// and "ABC1234" all match when joining Cartrack vehicles against the
// VEHICLES sheet tab by plate.
function normalizePlate(raw) {
  if (!raw) return '';
  return raw.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

module.exports = { normalizeName, barangayKey, normalizePlate };
