# Stillness — Integration Notes for SDK Team

## Purpose

Stillness was built as a constraint-driven reference example for background-style plugins within the current Even G2 SDK.

It prioritizes deterministic gestures, lifecycle resilience, and minimal container mutation under existing OS protocol constraints.

---

## Gesture Model

- Tap captured via LIST container for firmware reliability.
- Fallback normalization for non-zero tap codes (e.g., 13).
- Swipe (up/down) scoped strictly to expanded state.
- All collapse paths route through a single `collapseSession()` function.
- No gesture overlap between states.

**Outcome:** Predictable state transitions across hardware and firmware variance.

---

## Container Strategy

- Width-only expansion (right-anchored).
- Avoids dynamic height mutations.
- Prefers `textContainerUpgrade()` over `rebuildPageContainer()` when possible.
- No concurrent container updates.
- No assumptions about background execution.

**Outcome:** Stable behavior inside current OS container and rendering constraints.

---

## Lifecycle Handling

Persistence triggers:
- Tap collapse
- Foreground exit
- Visibility change
- Stop/unload

Implementation details:
- Idempotent persistence guard
- Separate session clock and cycle clock
- Freeze/resume logic for OS interruptions

**Outcome:** No session time loss across common lifecycle events.

---

## Visual Hierarchy Contract

Progressive reduction:

1. Full UI (header + frame + breath)
2. Header fades
3. Frame fades
4. Breath only

No reward states.
No forced completion.
No gamification.

**Outcome:** Calm interaction model aligned with system-level affordances.

---

## Phase Boundary

**Phase 1**
- Manual invocation only
- No sensor integration
- No background execution assumptions

**Future Exploration (Optional)**
- Sensor-triggered behaviors (e.g., PPG/HRV)
- Notifications as system-level triggers
- Optional, never default

---

## Why This Matters

Stillness demonstrates how a background plugin can feel:

- Deterministic
- Lightweight
- Calm
- OS-native
- Resilient under current SDK limits

It is intended as a reference pattern, not a feature showcase.