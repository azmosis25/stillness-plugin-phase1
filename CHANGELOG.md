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

## [Unreleased]

### Added
- `master.js`: hardware-grade demo build with:
  - deterministic tap handling (including fallback codes)
  - lifecycle-safe stillness persistence
  - dual-clock model (session vs breath cycle)
  - progressive visual quieting (header + frame fade)

### Notes
- `app.js` remains the Phase-1 reference implementation.