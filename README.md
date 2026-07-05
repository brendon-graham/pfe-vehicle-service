# PFE Vehicle Service

Vehicle and equipment service tracker for Peel Forest Estate. Single-file PWA — `index.html` holds all HTML, CSS, and JavaScript. No build step.

- **Live:** https://brendon-graham.github.io/pfe-vehicle-service/
- **Users:** Aaron (update readings, complete services, add parts, note defects) and Brendon (review overdue/upcoming work, costs, history, export reports).
- **Version:** v1.1.0

## Data

- Primary store: browser `localStorage` under key `pfe_vehicle_service_v1`.
- Optional Google Sheets sync via an Apps Script Web App (`Code.gs`). **Off by default** — sync only runs once `SCRIPT_URL` in `index.html` is set to a deployed Web App URL. Empty `SCRIPT_URL` = localStorage only, nothing leaves the device.

## Sheets sync — how to turn it on

1. Create a Google Sheet (the workbook). Extensions → Apps Script.
2. Paste `Code.gs` into the script editor. Save.
3. Deploy → New deployment → Web app → Execute as **Me** → Who has access **Anyone** → Deploy. Copy the Web app URL.
4. Paste that URL into `const SCRIPT_URL = ""` in `index.html`, commit, and push.
5. First load builds the tabs (Vehicles, Plans, History, Parts, Meta) and seeds them from the current data.

Sync design: header-mapped read/write, row-level merge by `updatedAt` (two writers editing different rows both survive), explicit deletes, response-checked push, 30s poll, pulls-never-push.

## Deploy (GitHub Pages)

Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## Notes

- Sample/seed data is for demo only — replace with the real fleet before live use.
- Do not connect sync on a device holding seed data — clear it first.
- Project docs, design specs, and version snapshots live in the AI Brain: `ai-brain/layer-4-projects/vehicle-service-app/`.
