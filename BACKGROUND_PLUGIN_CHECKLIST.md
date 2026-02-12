# Background Plugin Checklist (Even G2)

Use this checklist before publishing a plugin intended to behave as a system-level background experience.

---

## 1. Gesture Discipline

- [ ] Is tap capture deterministic across firmware?
- [ ] Are fallback tap codes handled?
- [ ] Are swipe gestures scoped to explicit states?
- [ ] Do all collapse paths route through a single function?
- [ ] Are gestures state-isolated (no cross-state ambiguity)?

If gestures can conflict, the plugin is not ready.

---

## 2. Container Discipline

- [ ] Avoid dynamic height mutations where possible.
- [ ] Prefer content updates over full rebuilds.
- [ ] No concurrent container writes.
- [ ] Container count is minimal and intentional.
- [ ] Expansion direction is predictable (width or height, not both).

If layout depends on rebuild timing, simplify.

---

## 3. Lifecycle Resilience

- [ ] Persist state on collapse.
- [ ] Persist on foreground exit.
- [ ] Persist on visibility change.
- [ ] Persistence is idempotent (no double-save bugs).
- [ ] Freeze/resume logic is handled safely.

If a session can lose state, fix before demo.

---

## 4. Visual Hierarchy

- [ ] Does the UI reduce over time?
- [ ] Are non-essential elements allowed to fade?
- [ ] Is there unnecessary instruction text?
- [ ] Does the plugin reward or pressure the user?
- [ ] Could it coexist beside time/notifications without competing?

If it feels like an “app,” reconsider.

---

## 5. System Alignment

- [ ] Does the plugin behave like an affordance, not a destination?
- [ ] Is it useful without requiring attention?
- [ ] Can it scale without introducing complexity too early?
- [ ] Does it respect current SDK constraints?

If it depends on future SDK features, scope it down.

---

## Definition of Done (Background Plugin)

A background plugin is complete when:

- It behaves predictably.
- It never demands attention.
- It survives lifecycle interruptions.
- It feels native to the system.

Not when it has the most features.