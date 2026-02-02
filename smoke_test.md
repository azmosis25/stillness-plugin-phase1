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
- [ ] After 1 full cycle, header dims then disappears.
- [ ] Breath bar remains centered and stable.

## 45–60s: Collapse
- [ ] Tap → collapses to badge.
- [ ] Badge time updates (or updates after relaunch if firmware delays UI refresh).

PASS = no gesture failures, no UI lockups, no flicker loops.