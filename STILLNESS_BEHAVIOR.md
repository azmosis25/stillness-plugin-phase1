# Stillness — Behavioral Specification (Phase 1 Master)

This document defines the deterministic runtime behavior of the Phase 1 Master build.

---

## State Model

Two explicit UI states:

**Collapsed**
- `expanded = false`
- `running = false`
- LIST container captures gestures
- Header renders badge text only

**Expanded**
- `expanded = true`
- `running = true`
- Breath container captures gestures
- Session timer increments

State transitions are atomic and mutually exclusive.

---

## Gesture Contract

**Tap**
- Collapsed → Expanded: start session clock
- Expanded → Collapsed: persist session time and collapse
- Tap codes normalized (`CLICK = 0`, fallback `13` observed)

**Swipe Up / Down**
- Active only in Expanded state
- Cycles session index
- Restarts cycle clock
- Does not reset session clock

No gestures are processed while fade transitions are in-flight.

---

## Timing Model

Two clocks operate independently:

- **Session Clock** — total elapsed time for current expansion
- **Cycle Clock** — breath phase timing

Session clock persists across pattern switches.  
Cycle clock resets per pattern.

---

## Visual Reduction Hierarchy

After configured cycle thresholds:

1. Header fades (normal → dim → off)
2. Frame fades after header
3. Breath remains alone

Fade transitions occur at inhale boundary to maintain visual stability.

---

## Persistence Model

Time accumulation is idempotent per session via guard.

Persistence triggers:
- Tap collapse
- Foreground exit
- Page hide
- Visibility change
- Unhandled JS error
- Explicit stop()

No duplicate accumulation.  
No silent time loss.

---

## Explicit Non-Goals

- No progress indicators
- No completion states
- No health scoring
- No forced endings

Behavior remains ambient and system-aligned.