> Demo is run using `master.js` (hardware-validated build), not `app.js`.

# Stillness Engine — Internal Demo Script

This document is a short, read-aloud script for presenting the Stillness Engine
during internal demos or reviews.

Target length: ~90 seconds.

---

## Demo Script

> “This is Stillness — a Phase-1 community plugin exploring calm as an OS-level behavior on Even G2."

> “When it launches, you’ll see a small, right-anchored badge. 
> Nothing is moving yet. It’s intentionally low-noise.”

(Pause for a second)

> “A single tap expands the container. The right edge stays fixed, and the interface opens 
> leftward—so it feels like information is being revealed, not pushed at you.”

(Tap to expand)

> “The session starts immediately. There’s no setup screen, no instruction text. 
> Breath is the primary signal.”

(Let the breath bar animate for a few seconds)

> “At the top, you have context—what session you’re in and elapsed time. 
> At the bottom, the breath bar and a subtle phase label. Everything else fades away.”

(Swipe up/down once)

> “Swiping changes the breath pattern. The cycle restarts cleanly, without visual jumps.”

(Pause, let it run briefly)

> “After the first cycle, the header fades out. The goal is to progressively reduce visual 
> presence as attention settles.”

(Tap to collapse)

> “Tapping again collapses the container. The session stops, and the time spent is 
> quietly accumulated—no confirmation, no score.”

> “The idea here isn’t meditation as an app. It’s calm as a system overlay—something that can live 
> alongside time, weather, and notifications without competing with them.”

> “This build intentionally focuses on gesture reliability and layout stability under current SDK constraints. 
> Feedback from this phase is helping define best practices for background plugins.”


> “In later phases, this could collapse further into a widget-level presence, with the plugin opening 
> only when someone wants to go deeper.”


---

## Demo Notes

- Single tap expands and starts the session
- Swipe up/down switches breath sessions
- Tap again collapses and saves time
- Header fades after first full breath cycle

---

## Phase-1 Context

- Focus is on gesture reliability and layout stability
- Foreground/background events are intentionally handled conservatively
- Visual noise is progressively reduced during a session
