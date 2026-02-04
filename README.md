# Stillness Engine — Phase 1 (Even G2)
A minimal, OS-native breathing plugin for Even G2.
Designed to progressively reduce visual noise and let the breath take over.

## Code Structure

This repo contains two primary entry points:

- **app.js**  
  Phase-1 reference implementation.  
  Minimal, instructional, and aligned with SDK documentation.

- **master.js**  
  Demo / hardware-validated build.  
  Includes gesture normalization, lifecycle-safe persistence,
  and visual deepening logic used for internal demos and pilot testing.

For first-time readers, start with `app.js`.  
For demos or real-device behavior, see `master.js`.

## Features
- Tap to expand (start session)
- Tap to collapse (save time)
- Swipe up/down to switch sessions (expanded)
- Header fades after one full cycle (dim → off)
- Breath bar uses `centerVisible()` to remain visually centered across sessions

## Gesture Map
- Tap: expand/collapse
- Swipe up: previous session
- Swipe down: next session

## Sessions
- De-stress: 4-1-6
- Stabilize: 4-4-4
- Energize: 2-0-2
- Release: 3-0-5
- Deep calm: 4-6-8

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
- Some firmware builds report taps inconsistently; this build treats tap primarily as eventType 0.
- Foreground enter/exit events may vary by firmware. If you observe issues, enable `DEBUG_INPUT`.