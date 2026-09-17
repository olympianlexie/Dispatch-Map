// Dot-path getter used to read Cartrack response fields whose exact shape
// isn't confirmed yet (see lib/cartrackConfig.js's `fields` map).

function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

// Tries each candidate path in order and returns the first defined,
// non-null, non-empty-string value found.
function firstMatch(obj, candidatePaths) {
  for (const path of candidatePaths) {
    const value = getPath(obj, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

module.exports = { getPath, firstMatch };
