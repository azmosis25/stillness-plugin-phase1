// Stillness Engine — Phase 1
// Version: v0.1.0-phase1
// SDK: @evenrealities/even_hub_sdk@0.0.6

/**
 * ------------------------------
 * Functionality (Phase 1)
 * ------------------------------
 *
 * UI States
 * - Collapsed (right-anchored): shows STILLNESS badge + daily accumulated time.
 * - Expanded (full canvas): shows header (session + timer) + breath bar.
 *
 * Gestures
 * - Tap (eventType 0; some firmware also reports tap as 13):
 *   - Collapsed → Expanded: starts running immediately.
 *   - Expanded → Collapsed: stops, persists time, returns to badge.
 * - Swipe Up/Down (expanded only):
 *   - Switch between breathing sessions (cycle restarts cleanly).
 *
 * Deepening / Visual Hierarchy
 * - Header fades out in 2 steps (dim → off) after 1 full breath cycle at inhale boundary.
 * - Breath bar is centered for each session using `centerVisible()` so the bar stays visually centered
 *   even when sessions have different durations.
 *
 * Persistence
 * - Daily stillness time stored in localStorage and rolls over by date.
 * - Last used session stored in localStorage.
 *
 * Design intent
 * - Minimal ink, stable layout, low-noise transitions.
 * - Breath is the hero: no breath container border; glyphs define the shape.
 */

import { waitForEvenAppBridge } from "@evenrealities/even_hub_sdk";

// ------------------------------
// Config
// ------------------------------
const DEBUG_INPUT = false;

// Canvas
const CANVAS_W = 576;
const CANVAS_H = 288;

// Collapsed / Expanded sizes
const COLLAPSED_W = 352;
const EXPANDED_W = CANVAS_W;

// Right-anchored collapsed, full-height card
const CARD_Y = 0;
const CARD_H = CANVAS_H;

// Margins
const HUD_MARGIN_X = 16;

// “Premium” header
const HEADER_W = 320;
const HEADER_BOX = {
  x: Math.floor((CANVAS_W - HEADER_W) / 2),
  y: 90,
  w: HEADER_W,
  h: 50,
};

// Breath box (slightly higher so it never clips)
const BREATH_BOX = {
  x: HUD_MARGIN_X,
  y: 150,
  w: CANVAS_W - HUD_MARGIN_X * 2,
  h: 104,
};

// Collapsed badge box
const BADGE_BOX = {
  w: COLLAPSED_W - 220,
  h: 92,
};

// Containers (IDs must be unique)
const LIST_ID = 1; // LIST gesture catcher (collapsed only)
const FRAME_ID = 2; // border/frame
const HEADER_ID = 3; // header text
const BREATH_ID = 4; // breath text (gesture capture in expanded)
const BADGE_ID = 5; // collapsed badge
const DEBUG_ID = 6; // debug overlay (optional)

const LIST_NAME = "input";
const FRAME_NAME = "frame";
const HEADER_NAME = "header";
const BREATH_NAME = "breath";
const BADGE_NAME = "badge";
const DEBUG_NAME = "debug";

// Typography estimate (SDK monospace-ish)
const CHAR_PX = 11;
const HEADER_COLS = Math.floor(HEADER_BOX.w / CHAR_PX);
const BREATH_COLS = Math.floor(BREATH_BOX.w / CHAR_PX);
const BADGE_COLS = Math.floor(BADGE_BOX.w / CHAR_PX);

// Timing
const TICK_MS = 1000;
const PHASE_LABEL_FADE_MS = 980;
const SESSION_SWITCH_MS = 180;

// Header fade (after 1 cycle)
const HEADER_HIDE_AFTER_CYCLES = 1; // after 1 full cycle
const HEADER_FADE_STEP_MS = 220; // dim → off delay

// Storage
const STORAGE_KEY = "stillness.totalSeconds.today";
const STORAGE_DATE_KEY = "stillness.date";
const STORAGE_SESSION_KEY = "stillness.lastSessionIdx";

// OS events (pilot build mapping)
const OS_EVT = {
  CLICK: 0,
  SCROLL_BOTTOM: 1, // swipe down
  SCROLL_TOP: 2, // swipe up
  FOREGROUND_ENTER: 4,
  FOREGROUND_EXIT: 5,
};

const BLANK = "\u2800"; // invisible character
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function n(v) {
  if (typeof v === "number") return v;
  const x = Number(String(v ?? "").trim());
  return Number.isFinite(x) ? x : null;
}

// Center based on visible content (trim ends for measurement)
function centerVisible(text, cols) {
  const raw = String(text ?? "");
  const trimmed = raw.trim();
  if (!trimmed) return " ".repeat(cols);

  const clamped = trimmed.length > cols ? trimmed.slice(0, cols) : trimmed;
  const pad = Math.max(0, Math.floor((cols - clamped.length) / 2));
  return " ".repeat(pad) + clamped;
}

function centerToCols(text, cols) {
  if (text.length > cols) text = text.slice(0, cols);
  const pad = Math.max(0, Math.floor((cols - text.length) / 2));
  return " ".repeat(pad) + text;
}

const centerToHeader = (t) => centerToCols(t, HEADER_COLS);
const centerToBadge = (t) => centerToCols(t, BADGE_COLS);

// ------------------------------
// Sessions
// ------------------------------
const SESSIONS = [
  { name: "De-stress", inhale: 4, hold: 1, exhale: 6 },
  { name: "Stabilize", inhale: 4, hold: 4, exhale: 4 },
  { name: "Energize", inhale: 2, hold: 0, exhale: 2 },
  { name: "Release", inhale: 3, hold: 0, exhale: 5 },
  { name: "Deep calm", inhale: 4, hold: 6, exhale: 8 },
];

// ------------------------------
// Storage helpers
// ------------------------------
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function loadAccumSecondsToday() {
  try {
    const d = todayKey();
    const last = localStorage.getItem(STORAGE_DATE_KEY);
    if (last !== d) {
      localStorage.setItem(STORAGE_DATE_KEY, d);
      localStorage.setItem(STORAGE_KEY, "0");
      return 0;
    }
    const v = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function saveAccumSecondsToday(v) {
  try {
    localStorage.setItem(STORAGE_DATE_KEY, todayKey());
    localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(v))));
  } catch {}
}

function loadLastSessionIdx() {
  try {
    const v = parseInt(localStorage.getItem(STORAGE_SESSION_KEY) || "0", 10);
    if (!Number.isFinite(v)) return 0;
    return ((v % SESSIONS.length) + SESSIONS.length) % SESSIONS.length;
  } catch {
    return 0;
  }
}

function saveLastSessionIdx(idx) {
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, String(idx));
  } catch {}
}

function fmtMMSS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function fmtHHMM(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds)) % 86400;
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// ------------------------------
// State
// ------------------------------
let bridge = null;
let uiReady = false;

let expanded = false;
let running = false;

let sessionIdx = 0;
let accumBaseSecondsToday = 0;

let startedAtMs = 0;
let frozenAtSeconds = null;
let pluginForeground = true;

let tickTimer = null;
let uiUpdateInFlight = false;
let sessionSwitchInFlight = false;

let exiting = false;

// Phase whisper
let lastPhase = null;
let phaseWord = "";
let phaseHideAtMs = 0;

// Header fade stages: 0 normal, 1 dim, 2 off
let headerStage = 0;
let headerFadeInFlight = false;
let headerFadeInterval = null;

// Debug
let debugEventText = "";
let debugEventShownUntilMs = 0;

// Caches (per container)
let lastBadgeText = null;
let lastHeaderText = null;
let lastBreathText = null;
let lastDebugText = null;

// ------------------------------
// Time helpers
// ------------------------------
function elapsedSecondsNow() {
  if (typeof frozenAtSeconds === "number") return frozenAtSeconds;
  return Math.floor((Date.now() - startedAtMs) / 1000);
}

function setRunClockToNow() {
  startedAtMs = Date.now();
  frozenAtSeconds = null;
}

function freezeClock() {
  if (typeof frozenAtSeconds === "number") return;
  frozenAtSeconds = Math.max(0, elapsedSecondsNow());
}

function resumeClock() {
  if (typeof frozenAtSeconds !== "number") return;
  startedAtMs = Date.now() - frozenAtSeconds * 1000;
  frozenAtSeconds = null;
}

// ------------------------------
// Rendering
// ------------------------------
function collapsedBadgeText() {
  const t = fmtMMSS(accumBaseSecondsToday);
  return [
    centerToBadge("STILLNESS"),
    centerToBadge(`•${t}•`),
    centerToBadge("Tap to begin"),
  ].join("\n");
}

function phaseAt(t, s) {
  if (t < s.inhale) return "inhale";
  if (t < s.inhale + s.hold) return "hold";
  return "exhale";
}

function headerText(liveAccumSeconds) {
  const s = SESSIONS[sessionIdx];
  const clockish = liveAccumSeconds < 3600 ? fmtMMSS(liveAccumSeconds) : fmtHHMM(liveAccumSeconds);
  const line = `STILLNESS • ${s.name} • ${clockish}`;
  const base = centerToHeader(line);

  if (DEBUG_INPUT && Date.now() < debugEventShownUntilMs && debugEventText) {
    return `${base}\n${centerToHeader(debugEventText)}`;
  }
  return base;
}

function breathText(elapsedSeconds) {
  const s = SESSIONS[sessionIdx];
  const total = s.inhale + s.hold + s.exhale;
  if (total <= 0) return "";

  const tInCycle = elapsedSeconds % total;
  const idx = tInCycle;
  const cycleIndex = Math.floor(elapsedSeconds / total);

  const bg = [];
  const mapIdx = [];
  let displayPos = 0;

  for (let i = 0; i < total; i++) {
    let token;
    if (i < s.inhale) token = "▒";
    else if (i < s.inhale + s.hold) token = "▁";
    else token = "□";

    bg.push(token);
    mapIdx[i] = displayPos;
    displayPos++;

    // separators only first cycle; spacing stable by replacing later
    if (i === s.inhale - 1 && s.hold > 0) {
      bg.push("|");
      displayPos++;
    }
    if (i === s.inhale + s.hold - 1 && s.hold > 0) {
      bg.push("|");
      displayPos++;
    }
  }

  const activeIdx = mapIdx[idx];
  if (typeof activeIdx === "number") bg[activeIdx] = "█";

  // Hide separators after first cycle
  if (cycleIndex >= 1) {
    for (let j = 0; j < bg.length; j++) if (bg[j] === "|") bg[j] = " ";
  }

  const line1 = centerVisible(bg.join(" "), BREATH_COLS);

  // Whisper first 3 cycles
  const phase = phaseAt(tInCycle, s);
  const now = Date.now();

  if (cycleIndex < 3) {
    if (phase !== lastPhase) {
      lastPhase = phase;
      phaseWord = phase;
      phaseHideAtMs = now + PHASE_LABEL_FADE_MS;
    }
  } else {
    phaseWord = "";
  }

  if (phaseWord && now > phaseHideAtMs) phaseWord = "";
  const phaseLine = phaseWord ? centerVisible(phaseWord, BREATH_COLS) : " ".repeat(BREATH_COLS);

  return `${line1}\n${phaseLine}`;
}

function breathNeutralTextForSession(s) {
  const total = s.inhale + s.hold + s.exhale;
  if (total <= 0) return "";

  const bg = [];
  for (let i = 0; i < total; i++) {
    let token;
    if (i < s.inhale) token = "▒";
    else if (i < s.inhale + s.hold) token = "▁";
    else token = "□";
    bg.push(token);
    if (i === s.inhale - 1 && s.hold > 0) bg.push("|");
    if (i === s.inhale + s.hold - 1 && s.hold > 0) bg.push("|");
  }

  return `${centerVisible(bg.join(" "), BREATH_COLS)}\n${" ".repeat(BREATH_COLS)}`;
}

// ------------------------------
// SDK helpers (cached)
// ------------------------------
async function pushText(containerID, containerName, content) {
  if (!bridge || !uiReady) return;

  if (containerID === BADGE_ID && content === lastBadgeText) return;
  if (containerID === HEADER_ID && content === lastHeaderText) return;
  if (containerID === BREATH_ID && content === lastBreathText) return;
  if (containerID === DEBUG_ID && content === lastDebugText) return;

  try {
    await bridge.textContainerUpgrade({
      containerID,
      containerName,
      contentOffset: 0,
      contentLength: content.length,
      content,
    });

    if (containerID === BADGE_ID) lastBadgeText = content;
    if (containerID === HEADER_ID) lastHeaderText = content;
    if (containerID === BREATH_ID) lastBreathText = content;
    if (containerID === DEBUG_ID) lastDebugText = content;
  } catch {}
}

function resetCaches() {
  lastBadgeText = null;
  lastHeaderText = null;
  lastBreathText = null;
  lastDebugText = null;
}

// ------------------------------
// LIST payload (collapsed only)
// ------------------------------
function listPayloadCollapsed(x, width) {
  return {
    xPosition: x,
    yPosition: CARD_Y,
    width,
    height: CARD_H,
    borderWidth: 0,
    borderColor: 0,
    borderRdaius: 0,
    paddingLength: 0,
    containerID: LIST_ID,
    containerName: LIST_NAME,
    itemContainer: {
      itemCount: 1,
      itemWidth: 0,
      isItemSelectBorderEn: 0,
      itemName: [BLANK],
    },
    isEventCapture: 1,
  };
}

// ------------------------------
// Header fade watcher
// ------------------------------
function clearHeaderFadeWatcher() {
  if (headerFadeInterval) clearInterval(headerFadeInterval);
  headerFadeInterval = null;
}

async function runHeaderFadeOut() {
  if (headerFadeInFlight) return;
  headerFadeInFlight = true;
  try {
    headerStage = 1;
    await rebuildUI();
    await sleep(HEADER_FADE_STEP_MS);

    headerStage = 2;
    await rebuildUI();
  } finally {
    headerFadeInFlight = false;
  }
}

function scheduleHeaderFadeWatcher() {
  clearHeaderFadeWatcher();

  headerFadeInterval = setInterval(async () => {
    if (!expanded || !running) return;
    if (!pluginForeground) return;
    if (sessionSwitchInFlight) return;
    if (uiUpdateInFlight) return;
    if (headerStage >= 2) return;

    const s = SESSIONS[sessionIdx];
    const total = s.inhale + s.hold + s.exhale;
    if (total <= 0) return;

    const t = Math.max(0, elapsedSecondsNow());
    const cycleIndex = Math.floor(t / total);
    const tInCycle = t % total;

    if (cycleIndex < HEADER_HIDE_AFTER_CYCLES) return;
    if (tInCycle !== 0) return;

    uiUpdateInFlight = true;
    try {
      await runHeaderFadeOut();
    } finally {
      uiUpdateInFlight = false;
      clearHeaderFadeWatcher();
    }
  }, 60);
}

// ------------------------------
// UI build / rebuild
// ------------------------------
async function rebuildUI() {
  if (!bridge) return;

  const width = expanded ? EXPANDED_W : COLLAPSED_W;
  const x = expanded ? 0 : CANVAS_W - COLLAPSED_W;

  const frame = {
    xPosition: x,
    yPosition: CARD_Y,
    width,
    height: CARD_H,
    borderWidth: 1,
    borderColor: 2,
    borderRdaius: 6,
    paddingLength: 0,
    containerID: FRAME_ID,
    containerName: FRAME_NAME,
    content: "",
    isEventCapture: 0,
  };

  let payload;

  if (!expanded) {
    const bx = x + Math.floor((width - BADGE_BOX.w) / 2);
    const by = Math.floor((CANVAS_H - BADGE_BOX.h) / 2);

    const badge = {
      xPosition: bx,
      yPosition: by,
      width: BADGE_BOX.w,
      height: BADGE_BOX.h,
      borderWidth: 0,
      borderColor: 0,
      borderRdaius: 0,
      paddingLength: 0,
      containerID: BADGE_ID,
      containerName: BADGE_NAME,
      content: collapsedBadgeText(),
      isEventCapture: 0,
    };

    const list = listPayloadCollapsed(x, width);

    payload = {
      containerTotalNum: 1 + 2,
      listObject: [list],
      textObject: [frame, badge],
    };
  } else {
    const headerOff = headerStage >= 2;
    const headerDim = headerStage === 1;

    const header = {
      xPosition: HEADER_BOX.x,
      yPosition: HEADER_BOX.y,
      width: HEADER_BOX.w,
      height: headerOff ? 1 : HEADER_BOX.h,
      borderWidth: headerOff ? 0 : 1,
      borderColor: headerOff ? 0 : headerDim ? 1 : 2,
      borderRdaius: headerOff ? 0 : 6,
      paddingLength: headerOff ? 0 : 10,
      containerID: HEADER_ID,
      containerName: HEADER_NAME,
      content: headerOff ? "" : headerText(accumBaseSecondsToday),
      isEventCapture: 0,
    };

    const breath = {
      xPosition: BREATH_BOX.x,
      yPosition: BREATH_BOX.y,
      width: BREATH_BOX.w,
      height: BREATH_BOX.h,
      borderWidth: 0,
      borderColor: 0,
      borderRdaius: 0,
      paddingLength: 16,
      containerID: BREATH_ID,
      containerName: BREATH_NAME,
      content: breathText(0),
      isEventCapture: 1,
    };

    payload = {
      containerTotalNum: 1 + 3,
      listObject: [],
      textObject: [frame, header, breath],
    };
  }

  if (!uiReady) {
    const r = await bridge.createStartUpPageContainer(payload);
    if (r !== 0) throw new Error(`createStartUpPageContainer failed: ${r}`);
    uiReady = true;
  } else if (bridge.rebuildPageContainer) {
    await bridge.rebuildPageContainer(payload);
  }

  resetCaches();

  if (!expanded) {
    await pushText(BADGE_ID, BADGE_NAME, collapsedBadgeText());
  } else {
    if (headerStage < 2) await pushText(HEADER_ID, HEADER_NAME, headerText(accumBaseSecondsToday));
    await pushText(BREATH_ID, BREATH_NAME, breathText(0));
  }
}

// ------------------------------
// Tick loop
// ------------------------------
function startTickLoop() {
  if (tickTimer) clearInterval(tickTimer);

  tickTimer = setInterval(async () => {
    if (!expanded || !running || !pluginForeground) return;
    if (uiUpdateInFlight) return;

    uiUpdateInFlight = true;
    try {
      const t = Math.max(0, elapsedSecondsNow());
      await pushText(BREATH_ID, BREATH_NAME, breathText(t));
      if (headerStage < 2) {
        await pushText(HEADER_ID, HEADER_NAME, headerText(accumBaseSecondsToday + t));
      }
    } finally {
      uiUpdateInFlight = false;
    }
  }, TICK_MS);
}

function stopTickLoop() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
}

// ------------------------------
// Session switching
// ------------------------------
async function setSession(nextIdx) {
  if (sessionSwitchInFlight) return;
  sessionSwitchInFlight = true;

  try {
    if (!expanded) return;

    await pushText(BREATH_ID, BREATH_NAME, breathNeutralTextForSession(SESSIONS[sessionIdx]));

    sessionIdx = (nextIdx + SESSIONS.length) % SESSIONS.length;
    saveLastSessionIdx(sessionIdx);

    lastPhase = null;
    phaseWord = "";
    phaseHideAtMs = 0;

    // Restore header visibility on session change
    headerStage = 0;
    clearHeaderFadeWatcher();

    setRunClockToNow();

    await rebuildUI();

    await pushText(HEADER_ID, HEADER_NAME, headerText(accumBaseSecondsToday));
    await sleep(SESSION_SWITCH_MS);
    await pushText(BREATH_ID, BREATH_NAME, breathText(0));

    scheduleHeaderFadeWatcher();
  } finally {
    sessionSwitchInFlight = false;
  }
}

// ------------------------------
// Event extraction
// ------------------------------
function extractEventType(evt) {
  if (evt?.textEvent) return n(evt.textEvent.eventType);
  if (evt?.listEvent) return n(evt.listEvent.eventType);
  if (evt?.sysEvent) return n(evt.sysEvent.eventType);
  if (evt?.jsonData?.sysEvent) return n(evt.jsonData.sysEvent.eventType);
  return n(evt?.jsonData?.eventType);
}

// ------------------------------
// Main event handler
// ------------------------------
async function onEvenHubEvent(evt) {
  if (evt?.sysEvent) {
    const code = n(evt.sysEvent.eventType);
    if (code === OS_EVT.FOREGROUND_EXIT) {
      pluginForeground = false;
      if (expanded && running) freezeClock();
      return;
    }
    if (code === OS_EVT.FOREGROUND_ENTER) {
      pluginForeground = true;
      if (expanded && running) resumeClock();
      return;
    }
  }
  if (!pluginForeground) return;

  const t = extractEventType(evt);

  // Swipe sessions (expanded only)
  if (expanded && (t === OS_EVT.SCROLL_TOP || t === OS_EVT.SCROLL_BOTTOM)) {
    const dir = t === OS_EVT.SCROLL_TOP ? -1 : 1;
    await setSession(sessionIdx + dir);
    return;
  }

  // Tap
  if (t === OS_EVT.CLICK) {
    if (exiting) return;

    if (!expanded) {
      expanded = true;
      running = true;

      lastPhase = null;
      phaseWord = "";
      phaseHideAtMs = 0;

      headerStage = 0;
      clearHeaderFadeWatcher();

      setRunClockToNow();

      await rebuildUI();
      startTickLoop();
      scheduleHeaderFadeWatcher();
      return;
    }

    if (expanded && running) {
      const elapsed = Math.max(0, elapsedSecondsNow());
      accumBaseSecondsToday += elapsed;
      saveAccumSecondsToday(accumBaseSecondsToday);

      running = false;
      expanded = false;
      frozenAtSeconds = null;

      headerStage = 0;
      clearHeaderFadeWatcher();

      stopTickLoop();
      await rebuildUI();
      return;
    }
  }
}

// ------------------------------
// Start / Stop
// ------------------------------
function attachGestureListeners() {
  if (typeof bridge?.onEvenHubEvent === "function") {
    const maybeUnsub = bridge.onEvenHubEvent((evt) => onEvenHubEvent(evt));
    return typeof maybeUnsub === "function" ? maybeUnsub : null;
  }
  return null;
}

let unsubscribeEvenHub = null;

async function start() {
  bridge = await waitForEvenAppBridge();

  accumBaseSecondsToday = loadAccumSecondsToday();
  sessionIdx = loadLastSessionIdx();

  expanded = false;
  running = false;

  pluginForeground = true;
  frozenAtSeconds = null;

  headerStage = 0;
  clearHeaderFadeWatcher();

  uiReady = false;
  resetCaches();

  await rebuildUI();
  unsubscribeEvenHub = attachGestureListeners();
}

async function stop() {
  try {
    if (exiting) return;
    exiting = true;

    if (expanded && running) {
      const elapsed = Math.max(0, elapsedSecondsNow());
      accumBaseSecondsToday += elapsed;
      saveAccumSecondsToday(accumBaseSecondsToday);
    }

    clearHeaderFadeWatcher();
    stopTickLoop();

    if (typeof unsubscribeEvenHub === "function") {
      unsubscribeEvenHub();
      unsubscribeEvenHub = null;
    }

    await bridge?.shutDownPageContainer?.(0);
  } catch {}
}

start();

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => stop());
}