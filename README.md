# Stillness Engine — Phase 1 (Even G2)

## Stillness Experience

![Stillness Demo](https://github.com/user-attachments/assets/6bd48e86-612e-46c8-b800-1705134be0a4)

Ambient breathing protocol for Even G2  
Guided onboarding → Quiet Mode transition

---

A minimal, OS-native breathing plugin for Even G2.  
Designed as a reference ambient interaction pattern for Even G2 (under current SDK constraints).

---

## Why This Exists

Stillness explores a simple idea:

What if calm could exist as a system-level behavior,
not just an application?

Instead of opening an app, navigating a UI, and starting a session,
Stillness appears as a lightweight protocol that can run quietly
alongside normal device usage.

The goal of this project is to explore a reference pattern for
ambient, background-style experiences on Even OS.

---

## Purpose

Stillness models how a background-oriented plugin can behave:

- Deterministic state transitions  
- Scoped gesture routing  
- Lifecycle-safe persistence  
- Progressive UI reduction  

This is not positioned as a standalone meditation app.  
It serves as a structural reference for plugin architecture.

---

## Non‑Goals (Phase 1)

Stillness intentionally avoids solving the broader meditation or wellness application space.

This implementation does **not** include:

- Multi‑screen navigation flows  
- Audio guidance or long-form instruction  
- Analytics, streak tracking, or scoring systems  
- Persistent UI beyond the active breathing protocol  
- Sensor-triggered activation (HRV / PPG)  
- Notification-driven engagement loops  

Phase 1 focuses exclusively on validating a **stable ambient interaction pattern** under current Even G2 SDK constraints.

The goal is to demonstrate how a background-oriented behavioral protocol can run reliably with minimal UI and deterministic lifecycle behavior.

---

## Future Hooks

Stillness is structured so that future platform capabilities can integrate cleanly without redesigning the core interaction model.

Potential platform integrations include:

- **Physiological signals**  
  Automatic protocol suggestions triggered by HRV or heart-rate spikes.

- **Ambient widgets / background execution**  
  Allowing Stillness protocols to run outside a container lifecycle.

- **Context-aware activation**  
  Triggered by device state, environment, or behavioral signals.

- **Health system integration**  
  Pairing breath protocols with recovery or regulation indicators.

These hooks are intentionally **not implemented in Phase 1**, but the internal architecture and behavioral model are designed so they can be added without changing the core user interaction.

---

## Documentation

- `REFERENCE_PATTERN.md` — Architectural reference pattern
- `STILLNESS_BEHAVIOR.md` — Deterministic behavioral contract
- `BACKGROUND_PLUGIN_CHECKLIST.md` — Background plugin hardening checklist
- `createPluginScaffold.md` — Minimal plugin scaffold template
- `Demo.md` — Structured demo scripts (30s / 60s / 2min)
- `smoke_test.md` — 60-second QA checklist
- `INTEGRATION_NOTES.md` — SDK-facing integration notes

---

## Current Build Freeze Candidate

- **guided.js**  
  Flagship guided build and current submission candidate for EvenHub QA.  
  Includes guided onboarding, Quiet Mode transition, protocol-based breathing,  
  lifecycle-safe persistence, and deterministic gesture handling.

This version represents the **submission-ready build freeze candidate** for the  
first EvenHub public release wave.

## Legacy / Reference Builds

- **app.js**  
  Minimal reference implementation.

- **master.js**  
  Earlier hardened demo build retained for lineage and comparison.

---

## Core Features

- Tap to expand (start session)
- Tap to collapse (persist session quietly)
- Swipe up/down to switch protocols (expanded only)
- Guided onboarding for early breath cycles
- Automatic transition to Quiet Mode once rhythm is learned
- Deterministic gesture handling
- Lifecycle‑safe persistence
- Breath glyph rendering centered across varying phase widths
- Protocol‑based breathing structures
- Progressive UI reduction (interface fades as user internalizes rhythm)

---

## Breath Protocols

- De-stress · 4‑1‑6  
- Stabilize · 4‑4‑4‑4  
- Regulate · 4‑4‑6‑2  
- Reset · 2+1‑6 (three‑sigh recovery protocol)  
- Deep calm · 4‑7‑8  

---

## Data Persistence (localStorage)

- `stillness.totalSeconds.today`
- `stillness.date`
- `stillness.lastSessionIdx`

Persistence is lifecycle-safe and triggered on:

- Tap collapse  
- Foreground exit  
- Visibility change  
- Pagehide  
- Error / unhandled rejection  

---

## Development

### Install

```
npm install
```

### Run Dev Server

```
npm run dev
```

### Run Simulator (Viewer)

```
npm run sim
```

### Generate QR for Hardware

```
npm run qr
```

---

## Release

Current flagship build freeze candidate:

v0.3.0-guided-freeze

Built against:

@evenrealities/even_hub_sdk ^0.0.7

---

## Design Principle

Stillness follows a single design rule:

Reduce interface until only the rhythm remains.

During the first cycles the system provides minimal guidance.
Once the rhythm is learned, the interface recedes and the
breath itself becomes the primary signal.

This behavior is intentional and reflects the idea of
progressively quiet software on ambient computing devices.

---

## Known Constraints (Phase 1 SDK)

- No true background execution yet (container-bound lifecycle)
- Image container size constraints
- No OS-level widget/background API (planned future capability)

Stillness is structured to transition cleanly once background or widget capabilities are introduced in the SDK.

---

This repository defines a repeatable pattern for building stable, background-oriented Even G2 plugins under current constraints.