/**
 * Stillness Engine — Master Demo Build (Even G2)
 * File: master.js
 *
 * Purpose
 * -------
 * This file represents the **hardware-grade demo build** of Stillness used for
 * internal presentations, pilot testing, and real-device validation.
 *
 * It incorporates lessons learned from running on physical Even G2 hardware
 * (gesture variance, lifecycle interruptions, persistence edge cases) while
 * preserving the same visual language and interaction model defined in `app.js`.
 *
 * Reference vs Demo
 * -----------------
 * - app.js    → Phase-1 reference implementation (minimal, instructional)
 * - master.js → Demo implementation (defensive, lifecycle-aware, hardware-tested)
 *
 * Key Characteristics
 * -------------------
 * - Breath-first UI with progressively reduced visual presence
 * - Deterministic tap-to-expand / tap-to-collapse behavior
 * - Session time persists quietly on *all* collapse and exit paths
 * - Session timer continues across breath pattern switches
 *
 * Visual Hierarchy (Deepening)
 * ----------------------------
 * 1) Breath container has no border (glyphs define form)
 * 2) Header fades: normal → dim → off after N breath cycles
 * 3) Outer frame fades after header, leaving breath floating alone
 *
 * Gesture Handling
 * ----------------
 * - Tap reliably detected via LIST container capture
 * - Tap codes normalized (CLICK = 0, fallback = 13 observed on some firmware)
 * - Swipe up/down (expanded only) cycles breath sessions cleanly
 *
 * Intent
 * ------
 * Stillness is not a “meditation app.”
 * It is a calm, ambient system overlay that can coexist with time,
 * notifications, and daily flow—without demanding attention.
 *
 * SDK
 * ---
 * @evenrealities/even_hub_sdk ^0.0.6
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
const HEADER_W = 410;
const HEADER_BOX = {
  x: Math.floor((CANVAS_W - HEADER_W) / 2),
  y: 90,
  w: HEADER_W,
  h: 50,
};
const HEADER_PAD = 8; // ✅ was 10

// Breath box (moved up)
const BREATH_BOX = {
  x: HUD_MARGIN_X,
  y: 150, // ✅ was 100
  w: CANVAS_W - HUD_MARGIN_X * 2,
  h: 104,
};
const BREATH_PAD = 16;

// Collapsed badge box
const BADGE_BOX = {
  w: COLLAPSED_W - 220,
  h: 92,
};

// Containers (IDs must be unique)
const LIST_ID = 1; // LIST gesture catcher (collapsed only)
const FRAME_ID = 2; // outer border/frame
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

// Typography estimate
const CHAR_PX = 11;
const HEADER_COLS = Math.floor(HEADER_BOX.w / CHAR_PX);
const BREATH_COLS = Math.floor(BREATH_BOX.w / CHAR_PX);
const BADGE_COLS = Math.floor(BADGE_BOX.w / CHAR_PX);

// Timing
const TICK_MS = 1000;
const PHASE_LABEL_FADE_MS = 980;
const SESSION_SWITCH_MS = 180;

// Hierarchy deepening thresholds
const HEADER_HIDE_AFTER_CYCLES = 2; // Mid (fade header after 2 full breath cycles)
const BORDER_HIDE_AFTER_CYCLES = 4; // Deep (fade outer frame after 4 full breath cycles)

// Micro orientation hint (header only)
const HEADER_HINT_CYCLES = 2; // show pattern hint for first 2 cycles

// Cosmetic fade timing
// Softer fade pacing (more like a slow exhale)
const HEADER_FADE_STEP_MS = 380;
const BORDER_FADE_STEP_MS = 420;

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

// Tap fallback codes observed on your device tests.
const TAP_FALLBACK = new Set([OS_EVT.CLICK, 13]);

const BLANK = "\u2800"; // invisible character
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function n(v) {
  if (typeof v === "number") return v;
  const x = Number(String(v ?? "").trim());
  return Number.isFinite(x) ? x : null;
}

function centerToCols(text, cols) {
  text = String(text ?? "");
  if (text.length > cols) text = text.slice(0, cols);
  const pad = Math.max(0, Math.floor((cols - text.length) / 2));
  return " ".repeat(pad) + text;
}

const centerToHeader = (t) => centerToCols(t, HEADER_COLS);
const centerToBreath = (t) => centerToCols(t, BREATH_COLS);
const centerToBadge = (t) => centerToCols(t, BADGE_COLS);

// ------------------------------
// Sessions
// ------------------------------
const SESSIONS = [
  { name: "De-stress", inhale: 4, hold: 1, exhale: 6 },
  { name: "Stabilize", inhale: 4, hold: 4, exhale: 4 },
  { name: "Energize", inhale: 2, hold: 0, exhale: 2 },
  { name: "Release", inhale: 3, hold: 0, exhale: 5 },
  { name: "Deep calm", inhale: 4, hold: 7, exhale: 8 },
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

// Persistence guard (persist once per session)
let sessionPersisted = false;

function persistIfRunning(reason = "unknown") {
  try {
    if (!expanded || !running) return;
    if (sessionPersisted) return;

    const elapsed = Math.max(0, elapsedSecondsNow());
    if (elapsed <= 0) return;

    accumBaseSecondsToday += elapsed;
    saveAccumSecondsToday(accumBaseSecondsToday);
    sessionPersisted = true;

    if (DEBUG_INPUT) {
      console.log("[stillness] persisted", { reason, elapsed, total: accumBaseSecondsToday });
    }
  } catch {}
}

// Phase whisper
let lastPhase = null;
let phaseWord = "";
let phaseHideAtMs = 0;

// Header fade stage: 0 normal, 1 dim, 2 off
let headerStage = 0;
let headerFadeInFlight = false;
let headerWatcher = null;

// Outer frame fade stage: 0 normal, 1 dim, 2 off
let borderStage = 0;
let borderFadeInFlight = false;
let borderWatcher = null;

// Debug
let debugEventText = "";
let debugEventShownUntilMs = 0;

// Caches
let lastBadgeText = null;
let lastHeaderText = null;
let lastBreathText = null;
let lastDebugText = null;

// ------------------------------
// Time helpers
// ------------------------------
// Two clocks:
// - session clock continues across pattern switches
// - cycle clock restarts on pattern switches
let sessionStartedAtMs = 0;
let cycleStartedAtMs = 0;

function elapsedSessionSeconds() {
  if (typeof frozenAtSeconds === "number") return frozenAtSeconds;
  return Math.floor((Date.now() - sessionStartedAtMs) / 1000);
}

function elapsedCycleSeconds() {
  if (typeof frozenAtSeconds === "number") return frozenAtSeconds;
  return Math.floor((Date.now() - cycleStartedAtMs) / 1000);
}

function startSessionClock() {
  const now = Date.now();
  sessionStartedAtMs = now;
  cycleStartedAtMs = now;
  frozenAtSeconds = null;
  sessionPersisted = false;
}

function restartCycleClock() {
  cycleStartedAtMs = Date.now();
}

function elapsedSecondsNow() {
  // For legacy code, use session clock.
  return elapsedSessionSeconds();
}

function freezeClock() {
  if (typeof frozenAtSeconds === "number") return;
  frozenAtSeconds = Math.max(0, elapsedSessionSeconds());
}

function resumeClock() {
  if (typeof frozenAtSeconds !== "number") return;
  sessionStartedAtMs = Date.now() - frozenAtSeconds * 1000;
  cycleStartedAtMs = Date.now() - (frozenAtSeconds % (SESSIONS[sessionIdx].inhale + SESSIONS[sessionIdx].hold + SESSIONS[sessionIdx].exhale)) * 1000;
  frozenAtSeconds = null;
}

// ------------------------------
// Rendering
// ------------------------------
function collapsedBadgeText() {
  const t = fmtMMSS(accumBaseSecondsToday);
  return [centerToBadge("STILLNESS"), centerToBadge(`·${t}·`), centerToBadge("Tap to begin")].join(
    "\n"
  );
}

function phaseAt(t, s) {
  if (t < s.inhale) return "inhale";
  if (t < s.inhale + s.hold) return "hold";
  return "exhale";
}

function headerText(liveAccumSeconds) {
  const s = SESSIONS[sessionIdx];
  const clockish = liveAccumSeconds < 3600 ? fmtMMSS(liveAccumSeconds) : fmtHHMM(liveAccumSeconds);

  const cycleIndex = Math.floor(Math.max(0, elapsedCycleSeconds()) / (s.inhale + s.hold + s.exhale));

  const hint = cycleIndex < HEADER_HINT_CYCLES
    ? ` · ${s.inhale}-${s.hold}-${s.exhale}`
    : "";

  const line = `STILLNESS · ${s.name}${hint} · ${clockish}`;
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
  const cycleIndex = Math.floor(elapsedSeconds / total);

  // Determine active phase and index within that phase
  let phase = "exhale";
  let phaseLen = s.exhale;
  let phaseOffset = s.inhale + s.hold;

  if (tInCycle < s.inhale) {
    phase = "inhale";
    phaseLen = s.inhale;
    phaseOffset = 0;
  } else if (tInCycle < s.inhale + s.hold) {
    phase = "hold";
    phaseLen = s.hold;
    phaseOffset = s.inhale;
  }

  const phaseIndex = tInCycle - phaseOffset;

  // Render ONLY the active phase glyphs, centered as a block
  const glyph = phase === "inhale" ? "▒" : phase === "hold" ? "▁" : "□";
  const row = [];
  for (let i = 0; i < phaseLen; i++) {
    row.push(i === phaseIndex ? "█" : glyph);
  }

  const line1 = centerToBreath(row.join(" "));

  // Whisper: first 5 cycles
  const now = Date.now();
  if (cycleIndex < 5) {
    if (phase !== lastPhase) {
      lastPhase = phase;
      phaseWord = phase;
      phaseHideAtMs = now + PHASE_LABEL_FADE_MS;
    }
  } else {
    phaseWord = "";
  }

  if (phaseWord && now > phaseHideAtMs) phaseWord = "";
  const phaseLine = phaseWord ? centerToBreath(phaseWord) : " ".repeat(BREATH_COLS);

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

  return `${centerToBreath(bg.join(" "))}\n${" ".repeat(BREATH_COLS)}`;
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
// Cosmetic fade helpers
// ------------------------------
function clearHeaderWatcher() {
  if (headerWatcher) clearInterval(headerWatcher);
  headerWatcher = null;
}
function clearBorderWatcher() {
  if (borderWatcher) clearInterval(borderWatcher);
  borderWatcher = null;
}

async function runHeaderFadeOut() {
  if (headerFadeInFlight) return;
  headerFadeInFlight = true;
  try {
    headerStage = 1; // dim
    await rebuildUI();
    await sleep(HEADER_FADE_STEP_MS);

    headerStage = 2; // off
    await rebuildUI();
  } finally {
    headerFadeInFlight = false;
  }
}

async function runBorderFadeOut() {
  if (borderFadeInFlight) return;
  borderFadeInFlight = true;
  try {
    borderStage = 1; // dim
    await rebuildUI();
    await sleep(BORDER_FADE_STEP_MS);

    borderStage = 2; // off
    await rebuildUI();
  } finally {
    borderFadeInFlight = false;
  }
}

function scheduleHeaderFadeWatcher() {
  clearHeaderWatcher();
  headerWatcher = setInterval(async () => {
    if (!expanded || !running) return;
    if (headerStage >= 2) return;
    if (headerFadeInFlight) return;
    if (!pluginForeground) return;
    if (sessionSwitchInFlight) return;
    if (uiUpdateInFlight) return;

    const s = SESSIONS[sessionIdx];
    const total = s.inhale + s.hold + s.exhale;
    if (total <= 0) return;

    // Fade hierarchy is tied to breath cycles (cycle clock), not session time.
    const t = Math.max(0, elapsedCycleSeconds());
    const cycleIndex = Math.floor(t / total);
    const tInCycle = t % total;

    if (cycleIndex < HEADER_HIDE_AFTER_CYCLES) return;
    if (tInCycle !== 0) return;

    uiUpdateInFlight = true;
    try {
      await runHeaderFadeOut();
    } finally {
      uiUpdateInFlight = false;
      clearHeaderWatcher();
    }
  }, 60);
}

function scheduleBorderFadeWatcher() {
  clearBorderWatcher();
  borderWatcher = setInterval(async () => {
    if (!expanded || !running) return;
    if (borderStage >= 2) return;
    if (borderFadeInFlight) return;
    if (!pluginForeground) return;
    if (sessionSwitchInFlight) return;
    if (uiUpdateInFlight) return;

    const s = SESSIONS[sessionIdx];
    const total = s.inhale + s.hold + s.exhale;
    if (total <= 0) return;

    // Fade hierarchy is tied to breath cycles (cycle clock), not session time.
    const t = Math.max(0, elapsedCycleSeconds());
    const cycleIndex = Math.floor(t / total);
    const tInCycle = t % total;

    if (cycleIndex < BORDER_HIDE_AFTER_CYCLES) return;
    if (tInCycle !== 0) return;

    uiUpdateInFlight = true;
    try {
      await runBorderFadeOut();
    } finally {
      uiUpdateInFlight = false;
      clearBorderWatcher();
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

  // Outer frame stages
  let frameBorderWidth = 1;
  let frameBorderColor = 2;
  let frameBorderRadius = 6;

  if (expanded) {
    if (borderStage === 1) {
      frameBorderWidth = 1;
      frameBorderColor = 1; // dim
      frameBorderRadius = 6;
    } else if (borderStage >= 2) {
      frameBorderWidth = 0;
      frameBorderColor = 0;
      frameBorderRadius = 0;
    }
  }

  const frame = {
    xPosition: x,
    yPosition: CARD_Y,
    width,
    height: CARD_H,
    borderWidth: expanded ? frameBorderWidth : 1,
    borderColor: expanded ? frameBorderColor : 2,
    borderRdaius: expanded ? frameBorderRadius : 6,
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
    const textObject = [frame, badge];

    if (DEBUG_INPUT) {
      textObject.push({
        xPosition: x + 8,
        yPosition: CANVAS_H - 60,
        width: 220,
        height: 50,
        borderWidth: 0,
        borderColor: 0,
        borderRdaius: 0,
        paddingLength: 0,
        containerID: DEBUG_ID,
        containerName: DEBUG_NAME,
        content: "",
        isEventCapture: 0,
      });
    }

    payload = {
      containerTotalNum: 1 + textObject.length,
      listObject: [list],
      textObject,
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
      paddingLength: headerOff ? 0 : HEADER_PAD,
      containerID: HEADER_ID,
      containerName: HEADER_NAME,
      content: headerOff ? "" : headerText(accumBaseSecondsToday),
      isEventCapture: 0,
    };

    // ✅ Breath box: NO BORDER EVER
    const breath = {
      xPosition: BREATH_BOX.x,
      yPosition: BREATH_BOX.y,
      width: BREATH_BOX.w,
      height: BREATH_BOX.h,
      borderWidth: 0,
      borderColor: 0,
      borderRdaius: 0,
      paddingLength: BREATH_PAD,
      containerID: BREATH_ID,
      containerName: BREATH_NAME,
      content: breathText(0),
      isEventCapture: 1,
    };

    const textObject = [frame, header, breath];

    if (DEBUG_INPUT) {
      textObject.push({
        xPosition: 8,
        yPosition: CANVAS_H - 60,
        width: 220,
        height: 50,
        borderWidth: 0,
        borderColor: 0,
        borderRdaius: 0,
        paddingLength: 0,
        containerID: DEBUG_ID,
        containerName: DEBUG_NAME,
        content: "",
        isEventCapture: 0,
      });
    }

    payload = {
      containerTotalNum: 1 + textObject.length,
      listObject: [],
      textObject,
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
    if (!expanded) return;
    if (!running) return;
    if (!pluginForeground) return;
    if (uiUpdateInFlight) return;

    uiUpdateInFlight = true;
    try {
      const headerTime = Math.max(0, elapsedSessionSeconds());
      const breathTime = Math.max(0, elapsedCycleSeconds());
      await pushText(BREATH_ID, BREATH_NAME, breathText(breathTime));
      if (headerStage < 2) {
        await pushText(HEADER_ID, HEADER_NAME, headerText(accumBaseSecondsToday + headerTime));
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

    // Re-show hierarchy immediately
    headerStage = 0;
    borderStage = 0;
    clearHeaderWatcher();
    clearBorderWatcher();

    const current = SESSIONS[sessionIdx];
    await pushText(BREATH_ID, BREATH_NAME, breathNeutralTextForSession(current));

    sessionIdx = (nextIdx + SESSIONS.length) % SESSIONS.length;
    saveLastSessionIdx(sessionIdx);

    // reset phase
    lastPhase = null;
    phaseWord = "";
    phaseHideAtMs = 0;

    // restart cycle
    restartCycleClock();

    await rebuildUI();

    await pushText(HEADER_ID, HEADER_NAME, headerText(accumBaseSecondsToday));
    await sleep(SESSION_SWITCH_MS);
    await pushText(BREATH_ID, BREATH_NAME, breathText(0));

    scheduleHeaderFadeWatcher();
    scheduleBorderFadeWatcher();
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

function isTapEventType(t) {
  if (t == null) return false;
  return TAP_FALLBACK.has(t);
}

// ------------------------------
// Main event handler
// ------------------------------
async function onEvenHubEvent(evt) {
  // Foreground gating
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

  if (DEBUG_INPUT && t != null) {
    debugEventText = `evt:${t}`;
    debugEventShownUntilMs = Date.now() + 1200;
    if (headerStage < 2) {
      await pushText(
        HEADER_ID,
        HEADER_NAME,
        headerText(accumBaseSecondsToday + Math.max(0, elapsedSessionSeconds()))
      );
    } else {
      await pushText(DEBUG_ID, DEBUG_NAME, debugEventText);
    }
  }

  // Swipe sessions (expanded only)
  if (expanded && (t === OS_EVT.SCROLL_TOP || t === OS_EVT.SCROLL_BOTTOM)) {
    const dir = t === OS_EVT.SCROLL_TOP ? -1 : 1;
    await setSession(sessionIdx + dir);
    return;
  }

  // Tap collapse / expand
  if (isTapEventType(t)) {
    if (exiting) return;

    if (!expanded) {
      expanded = true;
      running = true;

      // reset phase
      lastPhase = null;
      phaseWord = "";
      phaseHideAtMs = 0;

      // reset hierarchy
      headerStage = 0;
      borderStage = 0;
      clearHeaderWatcher();
      clearBorderWatcher();

      startSessionClock();

      await rebuildUI();
      startTickLoop();

      scheduleHeaderFadeWatcher();
      scheduleBorderFadeWatcher();
      return;
    }

    if (expanded && running) {
      persistIfRunning("tap-collapse");

      running = false;
      expanded = false;

      frozenAtSeconds = null;

      headerStage = 0;
      borderStage = 0;
      clearHeaderWatcher();
      clearBorderWatcher();

      stopTickLoop();
      await rebuildUI();
      return;
    }

    // fallback reset
    running = false;
    expanded = false;
    frozenAtSeconds = null;
    headerStage = 0;
    borderStage = 0;
    clearHeaderWatcher();
    clearBorderWatcher();
    stopTickLoop();
    await rebuildUI();
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
  borderStage = 0;
  clearHeaderWatcher();
  clearBorderWatcher();

  uiReady = false;
  resetCaches();

  await rebuildUI();
  unsubscribeEvenHub = attachGestureListeners();
}

async function stop() {
  try {
    persistIfRunning("stop");
    if (exiting) return;
    exiting = true;

    clearHeaderWatcher();
    clearBorderWatcher();
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

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      persistIfRunning("visibilitychange");
    }
  });
}