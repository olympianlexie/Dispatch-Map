# Dispatch Map

Live map for Olympian ICT dispatchers: open installation JOs by barangay,
plus live Cartrack vehicle locations, so dispatchers can decide which team
goes where.

**Status: Phase 1 built, pending real-data verification.** The JO-by-
barangay map, filters, side panel, and the barangay-coordinate tooling
(geocoding + click-to-pin) are implemented, but built against **placeholder**
sheet column names, status/JO-type values, and SLA thresholds — see
"Configuring for your real sheet" below. Phase 2 (Cartrack vehicles) is
blocked on live Cartrack credentials.

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

## Current deliverable: Cartrack access smoke test

`netlify/functions/cartrack-test.js` calls the Cartrack vehicles list
endpoint and returns the raw response, so we can confirm API access works
and see the exact field names before building anything else.

```bash
netlify dev
curl http://localhost:8888/api/cartrack-test
```

If this returns a vehicle list, credentials and network access are good and
Phase 2 (live vehicle layer) can build on the confirmed response shape.

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

## Testing Phase 1 locally

```bash
npm install
npm run dev
```

Then open `http://localhost:8888`. Without Identity configured locally
you'll be redirected to the Netlify Identity login widget; without real
`SHEET_ID`/service-account env vars, `/api/sheet-jos` will return a 502
with the underlying Google error — that's expected until real credentials
are added to `.env`.

## Roadmap

1. **Phase 1 — Open installation JOs by barangay** ✅ built, needs
   verification against the real sheet (see "Configuring for your real
   sheet" above)
2. **Phase 2 — Live Cartrack vehicles** — blocked on Cartrack credentials;
   run `/api/cartrack-test` once they're available to confirm access and
   see the real response shape before the vehicles layer is built
3. **Phase 3 — Dispatch assistance** (nearest-vehicle / nearest-barangay
   ranking)
4. **Phase 4 — Monitoring** (daily cluster summary, idle vehicles) — to be
   scoped after Phase 1–3 are live

Dispatch-scoring weights (Phase 3) will be documented here once that phase
lands.
