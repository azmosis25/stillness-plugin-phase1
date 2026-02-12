# Changelog

## v0.1.0-phase1
- Phase 1 candidate.
- Tap expand/collapse.
- Swipe session switching.
- Header fades (dim → off) after 1 cycle.
- Breath bar centered with `centerVisible()`.
- LocalStorage persistence for daily total and last session.

## v0.1.1-phase1 (planned)
- Optional: stronger foreground pause/resume behavior across firmware variants.
- Optional: badge updates immediately on collapse (if any lag observed).


## v0.2.0-demo
- Updated SDK dependency to `@evenrealities/even_hub_sdk@0.0.7`
- Confirmed compatibility with new SDK behavior
- Introduced master.js hardware-validated build
- Dual-clock model (session + cycle separation)
- Idempotent persistence across lifecycle paths
- Deterministic gesture router
- Progressive visual hierarchy (header + border fade)
- Orientation hint in header (first N cycles)

## [Unreleased]

### Added
- `master.js`: Hardware-Validated Demo Build:
  - deterministic tap handling (including fallback codes)
  - lifecycle-safe stillness persistence
  - dual-clock model (session vs breath cycle)
  - progressive visual quieting (header + frame fade)

### Notes
- `app.js` remains the Phase-1 reference implementation.