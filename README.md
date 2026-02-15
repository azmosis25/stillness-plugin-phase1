# Stillness Engine — Phase 1 (Even G2)

A minimal, OS-native breathing plugin for Even G2.  
Designed as a reference implementation for background-style plugins under current SDK constraints.

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

## Documentation

- `REFERENCE_PATTERN.md` — Architectural reference pattern
- `STILLNESS_BEHAVIOR.md` — Deterministic behavioral contract
- `BACKGROUND_PLUGIN_CHECKLIST.md` — Background plugin hardening checklist
- `createPluginScaffold.md` — Minimal plugin scaffold template
- `Demo.md` — Structured demo scripts (30s / 60s / 2min)
- `smoke_test.md` — 60-second QA checklist
- `INTEGRATION_NOTES.md` — SDK-facing integration notes

---

## Code Structure

This repository contains two primary entry points:

### `app.js`
Phase-1 reference implementation.  
Minimal, instructional, aligned directly with SDK documentation.

### `master.js`
Hardware-validated demo build.  
Includes:

- Gesture normalization  
- Lifecycle-resilient persistence  
- Defensive state handling  
- Progressive UI deepening  
- Simulator + hardware compatibility  

`master.js` represents the current hardened reference implementation.

> For demos, simulator testing, and real-device validation, use `master.js`.

---

## Core Features

- Tap to expand (start session)
- Tap to collapse (persist time silently)
- Swipe up/down to switch sessions (expanded only)
- Session timer continues across breath pattern switches
- Active phase rendering only (inhale / hold / exhale)
- Breath glyphs centered consistently across varying phase widths
- Header pattern hint (e.g., 4-1-6) for first 2 cycles
- Header fades after 2 cycles (normal → dim → off)
- Outer frame fades after 4 cycles

---

## Sessions

- De-stress: 4-1-6  
- Stabilize: 4-4-4  
- Energize: 2-0-2  
- Release: 3-0-5  
- Deep calm: 4-7-8  

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

Current hardened demo release:

```
v0.2.0-demo-hardened
```

Built against:

```
@evenrealities/even_hub_sdk ^0.0.7
```

---

## Known Constraints (Phase 1 SDK)

- No true background execution yet (container-bound lifecycle)
- Image container size constraints
- No OS-level widget/background API (planned future capability)

Stillness is structured to transition cleanly once background or widget capabilities are introduced in the SDK.

---

This repository defines a repeatable pattern for building stable, background-oriented Even G2 plugins under current constraints.