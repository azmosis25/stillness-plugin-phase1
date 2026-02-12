# Stillness Engine — Phase 1 (Even G2)
A minimal, OS-native breathing plugin for Even G2.
Designed to reduce visual presence over time and allow the breath to become the primary signal.

## Documentation

- `REFERENCE_PATTERN.md` — Design rationale and system model
- `STILLNESS_BEHAVIOR.md` — Deterministic behavioral contract
- `Demo.md` — Demo walkthrough
- `smoke_test.md` — 60-second QA checklist

## Code Structure

This repo contains two primary entry points:

- **app.js**  
  Phase-1 reference implementation.  
  Minimal, instructional, and aligned with SDK documentation.

- **master.js**  
  Demo / hardware-validated build.  
  Includes gesture normalization, lifecycle-safe persistence,
  and visual deepening logic used for internal demos and pilot testing.
  Represents the current reference implementation for background plugins under Phase-1 SDK constraints.

> For demos and real-device validation, use `master.js`.  
> `app.js` is intentionally simpler and exists as a reference implementation.

## Features
- Tap to expand (start session)
- Tap to collapse (persist time silently)
- Swipe up/down to switch sessions (expanded only)
- Session timer continues across breath pattern switches
- Breath renders active phase only (inhale / hold / exhale) as a centered glyph block
- Header includes a brief pattern hint (e.g., 4-1-6) for first 2 cycles
- Header fades after 2 cycles (normal → dim → off)
- Outer frame fades after 4 cycles, leaving breath floating

## Gesture Map
- Tap: expand/collapse
- Swipe up: previous session
- Swipe down: next session

## Sessions
- De-stress: 4-1-6
- Stabilize: 4-4-4
- Energize: 2-0-2
- Release: 3-0-5
- Deep calm: 4-7-8

## Data Persistence (localStorage)
- `stillness.totalSeconds.today`
- `stillness.date`
- `stillness.lastSessionIdx`


## Run Locally (QR / Dev)
1. Install deps:
   - `npm install`
2. Start server:
   - `npm run dev`
3. Open the printed URL and scan the QR with Even G2.



## Known Firmware Notes
- Tap is normalized defensively (eventType 0 + observed fallback 13).
- Foreground enter/exit events may vary by firmware.
- Lifecycle guards persist time on collapse, visibility change, pagehide, and error paths.
- Swipe is scoped to expanded state only to avoid accidental background switching.