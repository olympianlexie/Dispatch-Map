// Central place for everything that depends on facts about the actual
// Google Sheet (exact column headers, status/type strings, SLA thresholds).
//
// None of this has been confirmed against the real MAINLINE tab yet — these
// are best-guess defaults so Phase 1 can be built and tested end-to-end.
// Edit this file (not the function code) once you confirm the real values;
// everything else reads from here.

module.exports = {
  sheet: {
    mainlineTab: 'MAINLINE',
    barangayCoordsTab: 'BARANGAY_COORDS',
    vehiclesTab: 'VEHICLES',
  },

  // Logical field -> exact header text in the MAINLINE tab (case-sensitive,
  // must match exactly what's in row 1 of the sheet).
  // TODO: confirm against real header row.
  columns: {
    joNumber: 'JO Number',
    joType: 'JO Type',
    status: 'Status',
    dateReceived: 'Date Received',
    barangay: 'Barangay',
    municipality: 'Municipality',
    cluster: 'Cluster',
    assignedTeam: 'Assigned Technician',
    subscriberName: 'Subscriber Name',
    contactNumber: 'Contact Number',
  },

  // Which JO Type / Status values count as an "open installation" for the
  // map. Comparisons are case-insensitive and trimmed.
  // TODO: confirm exact values used in the sheet.
  openInstallation: {
    joTypes: ['Installation', 'New Installation'],
    statuses: ['Open', 'Ongoing', 'For Dispatch', 'Pending', 'In Progress'],
  },

  // SLA bucket thresholds, in whole days since dateReceived.
  // ageDays >= breachDays        -> "breached"
  // ageDays >= nearBreachDays    -> "nearBreach"
  // otherwise                    -> "withinSla"
  // TODO: confirm real thresholds (and whether they should vary by cluster
  // or JO type — if so, this can become a lookup keyed on those).
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
  // comes from the sheet's own Cluster column.
  // TODO: confirm municipality -> cluster grouping if you want server-side
  // validation of the sheet's Cluster column.
  clusters: [],
};
