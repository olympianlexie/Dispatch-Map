# Dispatch Map

Live map for Olympian ICT dispatchers: open installation JOs by barangay,
plus live Cartrack vehicle locations, so dispatchers can decide which team
goes where.

**Status: scaffolding.** Phase 1 (JOs by barangay) hasn't started yet — it's
waiting on sheet column confirmation and status/threshold values from the
project owner. This README will grow with each phase.

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

## Roadmap

1. **Phase 1 — Open installation JOs by barangay** (pending: sheet column
   confirmation, open-installation status/type values, SLA bucket
   thresholds)
2. **Phase 2 — Live Cartrack vehicles**
3. **Phase 3 — Dispatch assistance** (nearest-vehicle / nearest-barangay
   ranking)
4. **Phase 4 — Monitoring** (daily cluster summary, idle vehicles) — to be
   scoped after Phase 1–3 are live

Maintaining the `VEHICLES` and `BARANGAY_COORDS` sheet tabs, and adjusting
SLA thresholds / dispatch-scoring weights, will be documented here once
those phases land.
