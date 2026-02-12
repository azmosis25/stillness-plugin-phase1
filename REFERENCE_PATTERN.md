# Stillness — Reference Pattern for Background Plugins

Defines a background plugin architecture under current SDK constraints.
Focus: deterministic behavior, scoped gestures, lifecycle integrity.
Demonstrates progressive UI reduction as a system pattern.

## Overview

Stillness is a constraint-driven example of how a background plugin can behave predictably under the current Even G2 SDK.

It is not positioned as a feature demonstration.  
It is a structural reference implementation.

This document defines the architectural pattern it models.

---

## Stillness as a Reference Pattern

### Deterministic State Transitions
- Explicit `collapsed` and `expanded` states.
- Explicit `running` flag.
- Expand and collapse paths are single-entry and single-exit.
- No ambiguous intermediate UI states.

### Scoped Gesture Routing
- Tap toggles expand/collapse only.
- Swipe up/down changes session only when expanded.
- Gesture handling is normalized and defensive against firmware variance.
- LIST container used for reliable tap capture.

Gestures are scoped to state.  
No gesture performs multiple unrelated actions.

### Lifecycle-Safe Persistence
- Session and cycle clocks are separated.
- Persistence guarded to prevent duplicate writes.
- Time is persisted on:
  - Tap collapse
  - Foreground exit
  - Page hide
  - Visibility change
  - Error boundaries
- No silent data loss.

Persistence is idempotent and state-aware.

### Progressive UI Reduction
Expanded state begins structured:
- Frame
- Header
- Breath

Over time:
- Header fades (normal → dim → off)
- Frame fades after header
- Breath remains

The interface reduces visual weight as the session continues.

This demonstrates how background plugins can lower visual intensity over time rather than increase it.

---

## Design Boundaries (Phase 1)

- No completion screens.
- No scoring or rewards.
- No confirmation states.
- No health framing.
- No forced session length.

Behavior remains minimal and reversible.

---

## Structural Characteristics

- Width-based expansion (right-anchored).
- Container rebuilds minimized; content updates preferred.
- Defensive handling of firmware event codes.
- Explicit foreground gating.

The implementation favors predictability over visual complexity.

---

## Intended Use

This file documents a pattern for:

- Background behavior design
- Gesture scoping strategy
- Lifecycle integrity under SDK constraints
- Progressive UI reduction

Stillness is a working example of that pattern.

It is meant to be reused, adapted, or extended—not treated as a standalone feature.