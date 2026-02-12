# 60-Second Smoke Test — Stillness Engine (Phase 1)

## 0–10s: Launch
- [ ] Scan QR → collapsed badge appears.

## 10–20s: Expand
- [ ] Tap → expanded UI appears.
- [ ] Breath bar animates.
- [ ] Header shows session + timer.

## 20–30s: Session Switch
- [ ] Swipe down → next session.
- [ ] Swipe up → previous session.

## 30–45s: Deepening
- [ ] After 2 full cycles, header dims then disappears.
- [ ] After 4 full cycles, outer frame fades.

## 45–60s: Collapse
- [ ] Tap → collapses to badge.
- [ ] Badge time updates (or updates after relaunch if firmware delays UI refresh).

PASS: No gesture failures, no UI lockups, no rendering artifacts.