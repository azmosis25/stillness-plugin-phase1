# Even G2 Background Plugin Scaffold

A minimal structural template for building deterministic, lifecycle-safe background plugins on Even G2.

This scaffold reflects lessons learned from hardware validation during the Phase-1 pilot.

It intentionally prioritizes determinism and lifecycle safety over feature breadth.

---

## Design Principles

1. Plugins are background behaviors, not full apps.
2. Gesture routing must be deterministic.
3. Persistence must be idempotent.
4. Lifecycle interruptions are normal.
5. UI rebuilds should be rare and controlled.

---

## Core Structure

### 1. State Model

Maintain explicit state flags. Avoid derived ambiguity.

```js
let expanded = false;
let running = false;
let pluginForeground = true;

// lifecycle safety
let exiting = false;
let sessionPersisted = false;
```

These flags must fully describe the UI and execution state.

---

### 2. Dual Clock Model

Separate session time from pattern time.

- **Session time** tracks total elapsed duration.
- **Cycle time** tracks the current animation phase.

```js
let sessionStartedAtMs = 0;
let cycleStartedAtMs = 0;

let frozenSessionSeconds = null;
let frozenCycleSeconds = null;
```

#### Minimal Helpers

```js
const elapsedSessionSeconds = () =>
  typeof frozenSessionSeconds === "number"
    ? frozenSessionSeconds
    : Math.floor((Date.now() - sessionStartedAtMs) / 1000);

const elapsedCycleSeconds = () =>
  typeof frozenCycleSeconds === "number"
    ? frozenCycleSeconds
    : Math.floor((Date.now() - cycleStartedAtMs) / 1000);

function startSessionClock() {
  const now = Date.now();
  sessionStartedAtMs = now;
  cycleStartedAtMs = now;
  frozenSessionSeconds = null;
  frozenCycleSeconds = null;
  sessionPersisted = false;
}

function restartCycleClock() {
  cycleStartedAtMs = Date.now();
}

function freezeClocks() {
  if (typeof frozenSessionSeconds !== "number")
    frozenSessionSeconds = elapsedSessionSeconds();

  if (typeof frozenCycleSeconds !== "number")
    frozenCycleSeconds = elapsedCycleSeconds();
}

function resumeClocks() {
  if (
    typeof frozenSessionSeconds !== "number" ||
    typeof frozenCycleSeconds !== "number"
  )
    return;

  sessionStartedAtMs = Date.now() - frozenSessionSeconds * 1000;
  cycleStartedAtMs = Date.now() - frozenCycleSeconds * 1000;

  frozenSessionSeconds = null;
  frozenCycleSeconds = null;
}
```

This separation prevents time drift when switching patterns.

---

### 3. Atomic Expand / Collapse Contract

All entry and exit paths must converge into these two functions.

```js
async function expandSession() {
  expanded = true;
  running = true;

  startSessionClock();

  await rebuildUI();
  startTickLoop();
}

async function collapseSession(reason = "collapse") {
  persistIfRunning(reason);

  running = false;
  expanded = false;

  frozenSessionSeconds = null;
  frozenCycleSeconds = null;

  stopTickLoop();
  await rebuildUI();
}
```

No gesture handler should directly mutate state.  
Everything routes through these functions.

---

### 4. Idempotent Persistence

Persistence must be safe to call multiple times.

```js
function persistIfRunning(reason = "unknown") {
  try {
    if (!expanded || !running) return;
    if (sessionPersisted) return;

    const elapsed = Math.max(0, elapsedSessionSeconds());
    if (elapsed <= 0) return;

    // Save elapsed time here
    sessionPersisted = true;
  } catch {}
}
```

Persistence must:

- Never double-count
- Never throw
- Never block UI

---

### 5. Deterministic Gesture Router

All gestures must pass through a single routing layer.

```js
async function onEvenHubEvent(evt) {
  if (!pluginForeground) return;

  const t = extractEventType(evt);

  if (expanded && isSwipe(t))
    return setSessionBySwipe(t);

  if (isTap(t))
    return expanded
      ? collapseSession("tap")
      : expandSession();
}
```

Rules:

- Swipe behavior scoped to expanded state only
- Tap toggles state
- No hidden side effects

---

### 6. Lifecycle Resilience

Plugins must assume interruption.

Handle:

- Foreground exit
- Page visibility change
- Page hide
- Errors
- Unhandled promise rejections

#### SDK Foreground Handling

```js
if (code === FOREGROUND_EXIT) {
  pluginForeground = false;
  if (expanded && running) {
    freezeClocks();
    persistIfRunning("foreground-exit");
  }
}

if (code === FOREGROUND_ENTER) {
  pluginForeground = true;
  if (expanded && running) resumeClocks();
}
```

#### Browser-Level Safeguards

```js
window.addEventListener("pagehide", () =>
  persistIfRunning("pagehide")
);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden")
    persistIfRunning("visibilitychange");
});

window.addEventListener("error", () =>
  persistIfRunning("window-error")
);

window.addEventListener("unhandledrejection", () =>
  persistIfRunning("unhandledrejection")
);
```

Persistence should be safe across all these paths.

---

### 7. UI Contract

Follow these constraints:

- Width-based expansion preferred over height-based mutation
- Content updates preferred over full rebuilds
- Minimize container churn
- Avoid mid-animation gesture mutations
- Cache text before pushing to avoid redundant SDK calls

---

### 8. Background Plugin Checklist

Before shipping:

- Expand/collapse deterministic
- Swipe scoped correctly
- Session time continues across pattern switches
- Persistence fires on all exit paths
- No double-counting
- No unhandled promise rejections
- No container rebuild race conditions
- Works under repeated rapid gestures

---

## Definition of a Background Plugin

A background plugin:

- Has explicit state
- Has a single gesture router
- Has atomic entry/exit
- Survives interruption
- Never surprises the user

If those are true, the plugin is production-safe.
