// Central place for everything that depends on facts about the actual
// Google Sheet (exact column headers, status/type strings, SLA thresholds).
//
// Column names below are CONFIRMED against the real MAINLINE tab (sheet
// "SLI New Database"). SLA thresholds are still placeholders — see the
// `sla` block below, that's a business policy number only the project
// owner can confirm.

module.exports = {
  sheet: {
    mainlineTab: 'MAINLINE',
    barangayCoordsTab: 'BARANGAY_COORDS',
    vehiclesTab: 'VEHICLES',
  },

  // Logical field -> exact header text in the MAINLINE tab. Confirmed
  // against the real sheet.
  columns: {
    joNumber: 'JO NUMBER',
    dateReceived: 'DATE CREATED',
    ageingDays: 'AGEING DAYS', // the sheet already computes this — use it directly instead of re-deriving from dateReceived
    barangay: 'BRGY',
    municipality: 'MUNICIPALITY',
    cluster: 'CLUSTER',
    assignedTeam: 'Assigned Crew in JOWEB',
    subscriberName: 'SUBSCRIBER NAME',
    contactNumber: 'CONTACT DETAILS',
    status: 'STATUS ON JOWEB',
    statusCategory: 'STATUS CATEGORY',
    // Despite the name, this is the customer/product segment (CONSUMER,
    // SME (SMALL MEDIUM ENTERPRISE), BIDA, S2S, APPLICATION FOR MAINLINE/
    // EXTENSION IPTV, WIFI 6 TECH ASSISTANCE — confirmed from real data),
    // not an installation-vs-repair flag. MAINLINE appears to track
    // installation-type work only, so this isn't used to filter "is this
    // an installation" — see openInstallation.excludeJoTypes below for the
    // one case that's genuinely ambiguous.
    joType: 'JO TYPE',
  },

  // What counts as "open" (still needs dispatching) rather than finished.
  // Confirmed real STATUS ON JOWEB values: ON GOING, FOR RELEASING, CLOSE,
  // CANCELLED. Deliberately a BLACKLIST of "done" statuses rather than a
  // whitelist of "open" ones — an unrecognized future status value should
  // surface on the map (dispatcher can judge it) rather than silently
  // vanish because it wasn't in a whitelist.
  openInstallation: {
    closedStatuses: ['CLOSE', 'CANCELLED'],
    // TODO: confirm whether "WIFI 6 TECH ASSISTANCE" (a JO TYPE value)
    // should count as an installation for this map, or is post-install
    // support that doesn't belong here. Add its exact string here to
    // exclude it once confirmed.
    excludeJoTypes: [],
  },

  // SLA bucket thresholds, in whole days (from the sheet's own AGEING DAYS
  // column, falling back to today - DATE CREATED if that's ever blank).
  // ageDays >= breachDays        -> "breached"
  // ageDays >= nearBreachDays    -> "nearBreach"
  // otherwise                    -> "withinSla"
  // TODO: confirm real thresholds against Converge's actual installation
  // SLA (and whether they should vary by cluster or JO type — if so, this
  // can become a lookup keyed on those).
  sla: {
    nearBreachDays: 3,
    breachDays: 5,
  },

  // BARANGAY_COORDS tab column layout (used by both the geocoding job and
  // the click-to-pin admin page). Keep in header-row order.
  barangayCoordsColumns: ['Municipality', 'Barangay', 'Latitude', 'Longitude', 'Source', 'Verified', 'Confidence'],

  // Logical field -> exact header text in the VEHICLES tab (create this tab
  // yourself; it maps a Cartrack vehicle to the team that drives it).
  // TODO: confirm against the real VEHICLES tab once created.
  vehicleColumns: {
    plate: 'Plate/Registration',
    cartrackId: 'Cartrack Vehicle ID',
    team: 'Team/Technicians',
    cluster: 'Cluster',
  },

  // The four Laguna clusters this MSP organizes municipalities into.
  // Used only for validating/labeling — the actual cluster per JO always
  // comes from the sheet's own CLUSTER column (confirmed real values:
  // CLUSTER 1, CLUSTER 2, CLUSTER 3, CLUSTER 4).
  clusters: ['CLUSTER 1', 'CLUSTER 2', 'CLUSTER 3', 'CLUSTER 4'],
};
