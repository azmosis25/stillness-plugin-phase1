> Demo is run using `master.js` (hardware-validated build), not `app.js`.

# Stillness Engine — Internal Demo Script

This document provides three concise demo formats for internal reviews.

---

# 30‑Second Version (Executive Overview)

> “This is Stillness — a Phase‑1 background plugin for Even G2.  
> It launches as a right‑anchored badge with no motion.”

(Tap to expand)

> “A single tap expands the container and starts the session immediately.  
> Breath is the primary signal.”

(Let it animate briefly)

> “Swipe up or down changes the breath pattern.  
> Tap again collapses the container and persists the session time.”

> “This build focuses on gesture reliability, deterministic state transitions, and progressive visual reduction under current SDK constraints.”

---

# 60‑Second Version (Product + Pattern)

> “Stillness is a background plugin built to behave like a system affordance rather than a full app.”

> “In the collapsed state, it presents a minimal badge with accumulated time.”

(Tap to expand)

> “On tap, it expands leftward while keeping the right edge fixed.  
> The session starts immediately — no setup screen.”

> “The header provides session context and elapsed time.  
> The breath glyph is centered and phase‑aware.”

(Swipe once)

> “Swipe up or down switches sessions.  
> The breath cycle restarts cleanly while the overall session timer continues.”

(Pause)

> “After two full cycles, the header fades.  
> After four cycles, the outer frame fades.  
> The interface reduces itself over time.”

(Tap to collapse)

> “Tap again collapses the plugin and persists accumulated time.  
> No confirmation screen.”

---

# 2‑Minute Version (Reference Implementation Framing)

> “Stillness is a Phase‑1 reference implementation for background plugins on Even G2.”

> “It demonstrates deterministic state transitions:
> collapsed → expanded → reduced visual state.”

(Tap to expand)

> “Expansion is width‑based to reduce layout instability.  
> Tap detection is normalized through LIST container capture.”

> “Two internal clocks are maintained:
> – Session clock (continues across pattern switches)  
> – Cycle clock (restarts on session change).”

(Swipe up/down)

> “Swiping changes breath patterns without resetting the session timer.  
> This avoids accidental loss of accumulated time.”

> “Lifecycle events are handled conservatively:
> foreground exit freezes clocks; collapse persists time.”

(Pause through fade sequence)

> “Visual hierarchy reduces over time:
> – Header fades after two cycles  
> – Frame fades after four cycles  
> The breath remains.”

(Tap to collapse)

> “Collapse persists accumulated time and returns to badge state.”

> “The intent of this build is not feature breadth.  
> It demonstrates stability, gesture determinism, and minimal‑rebuild layout behavior under current SDK constraints.”

---

# Demo Checklist (Quick QA)

- Tap expands and starts session
- Swipe changes sessions (expanded only)
- Session timer continues across pattern switches
- Header fades after 2 cycles
- Frame fades after 4 cycles
- Tap collapses and persists time

---

# Phase‑1 Scope

- Focus: stability and predictable gesture handling
- Conservative lifecycle management
- Minimal rebuild strategy
- Designed as a background behavior, not a full application