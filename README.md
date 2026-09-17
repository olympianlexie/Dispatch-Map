# Dispatch Map

Live map for Olympian ICT dispatchers: open installation JOs by barangay,
plus live Cartrack vehicle locations, so dispatchers can decide which team
goes where.

**Status: Phase 1 and Phase 2 built, pending real-data verification.** The
JO-by-barangay map, filters, side panel, and barangay-coordinate tooling
(geocoding + click-to-pin) are implemented against **placeholder** sheet
column names, status/JO-type values, and SLA thresholds — see "Configuring
for your real sheet" below. The live vehicle layer is implemented against
**best-guess Cartrack field names** (their docs site wasn't reachable while
building this) — see "Configuring for your real Cartrack account" below.
Neither phase has been run against live credentials yet.

## Stack

- Static HTML/CSS/JS on Netlify (`public/`)
- Netlify serverless functions (`netlify/functions/`) proxy Google Sheets and
  Cartrack so credentials never reach the browser and both APIs' rate limits
  are respected via server-side caching
- Leaflet + OpenStreetMap for the map
- Google Sheet as the JO/vehicle/geocode data store (no separate database)

## Environment variables

Set these in Netlify (Site settings > Environment variables) and, for local
dev, in a gitignored `.env` file (see `.env.example`):

| Variable | Purpose |
|---|---|
| `CARTRACK_BASE_URL` | Cartrack Fleetweb PH base URL |
| `CARTRACK_USERNAME` / `CARTRACK_PASSWORD` | Cartrack Fleet API basic auth |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_KEY` | Service account with Editor access to the JO sheet (needed because barangay coordinates get written back, not just read) |
| `SHEET_ID` | The JO monitoring Google Sheet ID |
| `NOMINATIM_USER_AGENT` | Identifies this app to Nominatim per their usage policy |

Never commit real credentials. `.env` and `.netlify/` are gitignored.

## Local development

```bash
npm install
npm run dev   # runs `netlify dev`, serving public/ + netlify/functions/ together
```

## Cartrack access smoke test

Run this first once you have real Cartrack credentials, before trusting the
live vehicle layer:

```bash
netlify dev
curl -H "Authorization: Bearer <identity-jwt>" http://localhost:8888/api/cartrack-test
```

`netlify/functions/cartrack-test.js` calls the Cartrack vehicles list
endpoint and returns the raw response so you can see the exact field names
Cartrack sends back for this account.

## Configuring for your real sheet

Everything that depends on facts about the actual MAINLINE tab — exact
column headers, which JO Type/Status values mean "open installation", and
the SLA bucket thresholds — lives in **one file**:
`netlify/functions/lib/config.js`. It ships with placeholder values (e.g.
`joType: 'JO Type'`, statuses like `'Open'`/`'Ongoing'`, SLA breach at 5
days). Edit that file to match your sheet; nothing else needs to change.
Each field is marked `TODO` where it needs confirming.

### Required sheet tabs

- **MAINLINE** (existing) — must have columns matching
  `netlify/functions/lib/config.js`'s `columns` mapping.
- **BARANGAY_COORDS** (new tab you create) — columns in this exact order:
  `Municipality, Barangay, Latitude, Longitude, Source, Verified, Confidence`.
  `Source` is `geocoded` or `manual`; `Verified` is `yes`/`no`; `Confidence`
  is `ok` or `low-check-municipality` (set automatically when a geocode
  result's address doesn't mention the expected municipality — Laguna has
  repeated barangay names across towns).
- **VEHICLES** (new tab, for Phase 2) — not read yet; will hold
  plate/registration, Cartrack vehicle ID, team/technicians, cluster.

Share the sheet with your Google service account's email as **Editor**
(not just Viewer) — the app writes new/corrected rows to BARANGAY_COORDS.

### Maintaining BARANGAY_COORDS

- Open **Fix unmatched barangays** (linked from the main map's side panel,
  or `/admin/unmatched-barangays.html` directly) to see every barangay that
  appeared in an open installation JO but has no coordinates yet.
- Click **"Run geocoding pass"** to auto-geocode all of them via Nominatim
  (rate-limited to ~1/second, so this can take a while with many barangays).
  It never re-geocodes a barangay already in the tab, even a low-confidence
  one — those are fixed manually so a re-run can't silently overwrite a
  correction.
- For anything that fails to geocode, or that geocoded with
  `low-check-municipality`, pick it from the list and click its real
  location on the map to save a corrected pin.
- New barangays that show up in MAINLINE later are picked up automatically
  the next time someone opens the admin page (it always re-diffs MAINLINE
  against BARANGAY_COORDS) — there's no separate "new barangay" queue to
  maintain.

### Authentication

The map requires login via **Netlify Identity**. Enable it in the Netlify
dashboard (Site settings → Identity → Enable Identity) and invite
dispatcher/supervisor email addresses — this is a dashboard step, not
something in this repo. Every `/api/*` function checks
`context.clientContext.user` and returns 401 if there's no logged-in user,
so the JO/subscriber data is never served without auth even if someone
finds the function URL directly.

### Adjusting SLA thresholds and colors

- **What counts as breached/near-breach** (day thresholds): edit `sla` in
  `netlify/functions/lib/config.js`.
- **Bubble colors / map center / refresh interval**: edit
  `public/js/config.js` — purely cosmetic, safe to change anytime.

## Configuring for your real Cartrack account

`developer.cartrack.com` wasn't reachable while this was built, so the
exact JSON field names in a `/rest/vehicles/status` response are unconfirmed.
`netlify/functions/lib/cartrackConfig.js`'s `fields` map lists a few
candidate field-name guesses per logical value (e.g. latitude might be
`location.lat`, `latitude`, or `lat`) and tries them in order — this makes
the vehicle layer resilient to a couple of plausible shapes, but it isn't a
substitute for checking the real response.

Once you have credentials:

1. Run the Cartrack smoke test (see above) and look at the raw vehicle list.
2. Load the map and check the Network tab for `/api/cartrack-vehicles` — its
   response includes a `rawSample` field (the first unprocessed vehicle
   object from `/rest/vehicles/status`) specifically so you can compare it
   against what got extracted into `vehicleId`/`lat`/`lng`/etc.
3. If anything looks wrong (or matched the wrong field), trim that field's
   candidate list in `cartrackConfig.js` down to the one confirmed real path.
4. Remove the `rawSample` field from `cartrack-vehicles.js`'s response once
   you've confirmed the mapping — it's only there to make that check easy.

Also create the **VEHICLES** sheet tab (columns: `Plate/Registration`,
`Cartrack Vehicle ID`, `Team/Technicians`, `Cluster` — see `vehicleColumns`
in `lib/config.js`) so vehicles can be matched to a team. Matching tries the
Cartrack vehicle ID first, then falls back to the plate/registration
(punctuation- and case-insensitive).

Cosmetic settings (vehicle colors, refresh interval, the "stale" cutoff, the
moving-speed threshold) are in `public/js/config.js` and
`netlify/functions/lib/cartrackConfig.js` respectively.

## Testing locally

```bash
npm install
npm run dev
```

Then open `http://localhost:8888`. Without Identity configured locally
you'll be redirected to the Netlify Identity login widget; without real
`SHEET_ID`/service-account env vars, `/api/sheet-jos` will return a 502
with the underlying Google error; without real Cartrack env vars,
`/api/cartrack-vehicles` will similarly 502 and the vehicle layer will just
log a console warning and show no vehicles — all expected until real
credentials are added to `.env`.

## Dispatch assistance (Phase 3)

Click a barangay bubble or a vehicle on the map to fill the **Dispatch
suggestions** side-panel section:

- **Click a barangay** → nearest vehicles, sorted by straight-line
  (haversine) distance to that barangay's centroid. Purely distance-based —
  no urgency weighting, since you're already looking at one specific
  barangay's queue.
- **Click a vehicle** → priority-ranked barangays, combining SLA urgency,
  open JO count, and distance into one score:

  ```
  priority = breachedCount   * w.breachedCount
           + nearBreachCount * w.nearBreachCount
           + totalOpen       * w.totalOpen
           + oldestAgeDays   * w.oldestAgeDays
           + distanceKm      * w.distanceKm   (negative weight — farther is worse)
  ```

  Weights live in `public/js/config.js`'s `dispatchWeights` — there's no
  "correct" value, tune them to match how your dispatchers actually
  prioritize. `dispatchResultLimit` controls how many results show.

Both rankings use straight-line distance only (no road routing/OSRM) — the
UI says so directly next to every ranking, since a barangay's location is
its centroid, not the actual job site, so treat the numbers as relative
"closer/farther," not turn-by-turn ETAs.

## Roadmap

1. **Phase 1 — Open installation JOs by barangay** ✅ built, needs
   verification against the real sheet (see "Configuring for your real
   sheet" above)
2. **Phase 2 — Live Cartrack vehicles** ✅ built, needs verification against
   a real Cartrack account (see "Configuring for your real Cartrack
   account" above) and the VEHICLES tab needs creating
3. **Phase 3 — Dispatch assistance** ✅ built (see above) — depends on
   Phase 1/2 data, so its accuracy inherits whatever is still unverified
   there
4. **Phase 4 — Monitoring** (daily cluster summary, idle vehicles) — to be
   scoped with the project owner before building (per the original brief,
   this phase needs discussion first, unlike 1–3)
