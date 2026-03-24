# Go Ride — Project Overview

## What this is
- Next.js + Tailwind frontend with passenger/driver dashboards and live map routing.
- Node/Socket.io backend for taxi rides and Social Pool (shared rides), with live driver tracking.
- Leaflet/OSRM for routes and ETA; resilient fallback for very long routes.

## Core flows
- Taxi: passenger searches destination → requests ride → driver accepts/rejects → status/ETA updates → completion/cancel.
- Social Pool: driver “Activate Trip” → passenger in Social Pool joins matching shared ride → driver sees accept/reject card → both see live tracking and seat updates.

## Key code locations
- Frontend passenger/driver UI: `frontend/app/user/dashboard/page.tsx`
- Driver console: `frontend/app/driver/dashboard/page.tsx`
- Map & routing: `frontend/components/map/MapComponent.tsx`
- Sockets (backend): `backend/src/config/socket.ts`

## Run it locally
1) Backend: `cd backend && npm install && npm run dev`
2) Frontend: `cd frontend && npm install && npm run dev`
3) Open http://localhost:3000 and use two tabs (passenger + driver) to exercise both flows.

## Socket events (shared ride)
- `create-shared-ride` (driver) → `shared-rides` broadcast
- `join-shared-ride` (passenger) → `shared-ride-passenger-request` (to driver)
- `accept-shared-ride-passenger` / `reject-shared-ride-passenger`
- `shared-ride-updated` / `shared-ride-joined` broadcast to keep UIs in sync

## Notes
- Shared rides are kept in-memory in `socket.ts`; taxi rides persist via the existing Ride model.
- Long routes fall back to straight-line display to avoid OSRM 400s.
