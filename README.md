# PFE Vehicle Service

Vehicle and equipment service tracker for Peel Forest Estate. Single-file PWA:
`index.html` holds all HTML, CSS, and JavaScript. No build step.

- **Live:** https://brendon-graham.github.io/pfe-vehicle-service/
- **Users:** Aaron and staff update readings, complete services, run weekly checks, add parts, and note defects. Brendon reviews overdue/upcoming work, red flags, costs, history, and export reports.
- **Version:** v1.3.3

## Data

- Source of truth: the shared Google Sheet, synced through the Apps Script Web App in `Code.gs`.
- Offline cache: browser `localStorage` under key `pfe_vehicle_service_v1`.
- Sync is live in `index.html` via `SCRIPT_URL`. Do not point test builds at the live endpoint unless the test is meant to write to the real fleet record.

Sync design: header-mapped read/write, row-level merge by `updatedAt`, explicit
deletes, response-checked push, 30s poll, pulls-never-push, empty-sheet seed
guard, and staff-array coercion.

## Current Features

- 18-unit PFE fleet: vehicles, trailers, tractors, and loaders.
- Category grouping: Vehicle / Trailer / Implement.
- Weekly Check tab with staff-stamped OK / Watch / Red flag checks.
- Dashboard and Weekly Check toolbox lists for unresolved red flags.
- Service plan, service history, parts stock, reorder warnings, JSON backup/restore, CSV export, and print review.
- 24MY Isuzu D-Max schedule loaded for D-Max utes, with manual/model confirmation notes.

## Deploy

- GitHub Pages serves the `main` branch from the repository root.
- After app changes, commit and push to `origin/main`.
- Save reference snapshots and full version notes in the AI Brain project folder:
  `ai-brain/layer-4-projects/vehicle-service-app/`.

## Open Items

- Enter/confirm last done km/date for D-Max service-plan rows.
- Confirm WOF, rego, and service intervals for non-D-Max units.
- Confirm engine hours on tractors/loaders and odometers on the Navara and Helen's D-Max.
- Confirm regos for the five trailers marked unknown and the Manitou plate/model.
- Redeploy the Apps Script after `Code.gs` changes so the live sheet endpoint uses the latest headers.
