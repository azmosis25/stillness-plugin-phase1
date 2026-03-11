/**
 * Stillness Engine — Flagship Guided Build (Even G2)
 * File: guided.js
 *
 * Purpose
 * -------
 * This file is the flagship build-freeze candidate for Stillness.
 * It represents the current submission-ready experience for Even G2,
 * combining guided onboarding, quiet-mode reduction, deterministic
 * lifecycle behavior, and protocol-based breath sessions.
 *
 * Positioning
 * -----------
 * guided.js is the primary product-facing implementation of Stillness.
 * It should be treated as the default QA / submission build unless a
 * newer release candidate supersedes it.
 *
 * Key Characteristics
 * -------------------
 * - Guided micro-instructions for early cycles
 * - Automatic transition to Quiet Mode
 * - Support for protocol-based breath structures
 * - Deterministic gesture and lifecycle behavior
 * - Submission-ready baseline for QA and build freeze
 *
 * SDK
 * ---
 * @evenrealities/even_hub_sdk ^0.0.7
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
const HEADER_W = 430;
const HEADER_BOX = {
  x: Math.floor((CANVAS_W - HEADER_W) / 2),
  y: 90,
  w: HEADER_W,
  h: 50,
};
const HEADER_PAD = 8;

// Breath box
const BREATH_BOX = {
  x: HUD_MARGIN_X,
  y: 150,
  w: CANVAS_W - HUD_MARGIN_X * 2,
  h: 104,
};
const BREATH_PAD = 16;

// Collapsed badge box
const BADGE_BOX = {
  w: COLLAPSED_W - 40,
  h: 200,
};

// Containers (IDs must be unique)
const LIST_ID = 1; // LIST container (gesture surface in collapsed)
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
const SESSION_SWITCH_MS = 180;

// Hierarchy deepening thresholds
const HEADER_HIDE_AFTER_CYCLES = 2;
const BORDER_HIDE_AFTER_CYCLES = 4;

// Micro orientation hint (header only)
const HEADER_HINT_CYCLES = 2;

// Cosmetic fade timing
const HEADER_FADE_STEP_MS = 380;
const BORDER_FADE_STEP_MS = 420;

// Guided micro-instructions (training ramp)
const GUIDED_MODE = true;
const GUIDED_TRAIN_CYCLES = 3; // show guidance during cycles 0..2
const GUIDED_JOIN = " · ";

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

function sessionPattern(s) {
  if (s.topUp && s.topUp > 0) return `${s.inhale}+${s.topUp}-${s.exhale}`;
  if (s.holdOut && s.holdOut > 0) return `${s.inhale}-${s.hold}-${s.exhale}-${s.holdOut}`;
  return `${s.inhale}-${s.hold}-${s.exhale}`;
}

function sessionCycleTotal(s) {
  return s.inhale + (s.topUp || 0) + s.hold + s.exhale + (s.holdOut || 0);
}

function sessionMaxElapsed(s) {
  return s.repeats && s.repeats > 0 ? sessionCycleTotal(s) * s.repeats : Infinity;
}

// ------------------------------
// Sessions
// ------------------------------
const SESSIONS = [
  { name: "De-stress", inhale: 4, hold: 1, exhale: 6, holdOut: 0 },
  { name: "Stabilize", inhale: 4, hold: 4, exhale: 4, holdOut: 4 },
  { name: "Regulate", inhale: 4, hold: 4, exhale: 6, holdOut: 2 },
  { name: "Reset", inhale: 3, topUp: 2, hold: 0, exhale: 6, holdOut: 0, repeats: 3 },
  { name: "Deep calm", inhale: 4, hold: 7, exhale: 8, holdOut: 0 },
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

let frozenSessionSeconds = null;
let frozenCycleSeconds = null;
let pluginForeground = true;

let tickTimer = null;
let uiUpdateInFlight = false;
let sessionSwitchInFlight = false;

let exiting = false;
let completed = false;

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

// Fade stages
let headerStage = 0;
let headerFadeInFlight = false;
let headerWatcher = null;

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
let sessionStartedAtMs = 0;
let cycleStartedAtMs = 0;

function elapsedSessionSeconds() {
  if (typeof frozenSessionSeconds === "number") return frozenSessionSeconds;
  return Math.floor((Date.now() - sessionStartedAtMs) / 1000);
}

function elapsedCycleSeconds() {
  if (typeof frozenCycleSeconds === "number") return frozenCycleSeconds;
  return Math.floor((Date.now() - cycleStartedAtMs) / 1000);
}

function startSessionClock() {
  const now = Date.now();
  sessionStartedAtMs = now;
  cycleStartedAtMs = now;
  frozenSessionSeconds = null;
  frozenCycleSeconds = null;
  sessionPersisted = false;
  completed = false;
}

function restartCycleClock() {
  cycleStartedAtMs = Date.now();
}

function elapsedSecondsNow() {
  return elapsedSessionSeconds();
}

function freezeClock() {
  if (typeof frozenSessionSeconds !== "number") {
    frozenSessionSeconds = Math.max(0, elapsedSessionSeconds());
  }
  if (typeof frozenCycleSeconds !== "number") {
    frozenCycleSeconds = Math.max(0, elapsedCycleSeconds());
  }
}

function resumeClock() {
  if (typeof frozenSessionSeconds !== "number" || typeof frozenCycleSeconds !== "number") return;

  sessionStartedAtMs = Date.now() - frozenSessionSeconds * 1000;
  cycleStartedAtMs = Date.now() - frozenCycleSeconds * 1000;

  frozenSessionSeconds = null;
  frozenCycleSeconds = null;
}

// ------------------------------
// Rendering
// ------------------------------
function collapsedBadgeText() {
  const s = SESSIONS[sessionIdx];
  const t = fmtMMSS(accumBaseSecondsToday);
  const pattern = sessionPattern(s);

  return [
    centerToBadge("STILLNESS"),
    centerToBadge(" "),
    centerToBadge(`${s.name} · ${pattern}`),
    centerToBadge(" "),
    centerToBadge(`·${t}·`),
    centerToBadge(" "),
    centerToBadge("tap to begin"),
  ].join("\n");
}

function headerText(liveAccumSeconds) {
  const s = SESSIONS[sessionIdx];
  const clockish = liveAccumSeconds < 3600 ? fmtMMSS(liveAccumSeconds) : fmtHHMM(liveAccumSeconds);

  const total = sessionCycleTotal(s);
  const cycleIndex = total > 0 ? Math.floor(Math.max(0, elapsedCycleSeconds()) / total) : 0;

  const pattern = sessionPattern(s);
  const hint = cycleIndex < HEADER_HINT_CYCLES ? ` · ${pattern}` : "";
  const line = `STILLNESS · ${s.name}${hint} · ${clockish}`;
  const base = centerToHeader(line);

  if (DEBUG_INPUT && Date.now() < debugEventShownUntilMs && debugEventText) {
    return `${base}\n${centerToHeader(debugEventText)}`;
  }

  return base;
}


function completedText() {
  const s = SESSIONS[sessionIdx];
  const countLabel = s.repeats && s.repeats > 0 ? `${s.repeats} sighs · tap to repeat` : "tap to repeat";
  return `${centerToBreath("SESSION COMPLETE")}\n${centerToBreath(countLabel)}`;
}

function breathText(elapsedSeconds) {
  const s = SESSIONS[sessionIdx];
  const topUp = s.topUp || 0;
  const holdOut = s.holdOut || 0;
  const total = sessionCycleTotal(s);
  if (total <= 0) return "";

  const cappedElapsed = Math.min(elapsedSeconds, Math.max(0, sessionMaxElapsed(s) - 1));
  const tInCycle = cappedElapsed % total;
  const cycleIndex = Math.floor(cappedElapsed / total);

  let phase = "exhale";
  let phaseLen = s.exhale;
  let phaseOffset = s.inhale + topUp + s.hold;

  if (tInCycle < s.inhale) {
    phase = "inhale";
    phaseLen = s.inhale;
    phaseOffset = 0;
  } else if (topUp > 0 && tInCycle < s.inhale + topUp) {
    phase = "topup";
    phaseLen = topUp;
    phaseOffset = s.inhale;
  } else if (tInCycle < s.inhale + topUp + s.hold) {
    phase = "hold";
    phaseLen = s.hold;
    phaseOffset = s.inhale + topUp;
  } else if (tInCycle < s.inhale + topUp + s.hold + s.exhale) {
    phase = "exhale";
    phaseLen = s.exhale;
    phaseOffset = s.inhale + topUp + s.hold;
  } else {
    phase = "pause";
    phaseLen = holdOut;
    phaseOffset = s.inhale + topUp + s.hold + s.exhale;
  }

  const phaseIndex = tInCycle - phaseOffset;

  const glyph =
    phase === "inhale"
      ? "▒"
      : phase === "topup"
      ? "■"
      : phase === "hold"
      ? "▁"
      : phase === "exhale"
      ? "□"
      : "▣";

  const row = [];
  for (let i = 0; i < phaseLen; i++) row.push(i === phaseIndex ? "█" : glyph);
  const line1 = centerToBreath(row.join(" "));

  const showGuidance = GUIDED_MODE && cycleIndex < GUIDED_TRAIN_CYCLES;

  const guidance =
    phase === "inhale"
      ? `inhale${GUIDED_JOIN}through the nose`
      : phase === "topup"
      ? `top-up${GUIDED_JOIN}sip more air`
      : phase === "hold"
      ? `hold${GUIDED_JOIN}stay still`
      : phase === "exhale"
      ? `exhale${GUIDED_JOIN}long and slow`
      : `pause${GUIDED_JOIN}stay empty`;

  const quietLabel = phase === "topup" ? "top-up" : phase === "pause" ? "pause" : phase;
  const line2 = showGuidance ? centerToBreath(guidance) : centerToBreath(quietLabel);

  return `${line1}\n${line2}`;
}

function breathNeutralTextForSession(s) {
  const topUp = s.topUp || 0;
  const holdOut = s.holdOut || 0;
  const total = sessionCycleTotal(s);
  if (total <= 0) return "";

  const bg = [];
  for (let i = 0; i < total; i++) {
    let token;
    if (i < s.inhale) token = "▒";
    else if (i < s.inhale + topUp) token = "■";
    else if (i < s.inhale + topUp + s.hold) token = "▁";
    else if (i < s.inhale + topUp + s.hold + s.exhale) token = "□";
    else token = "▣";

    bg.push(token);

    if (i === s.inhale - 1 && topUp > 0) bg.push("|");
    if (topUp > 0 && i === s.inhale + topUp - 1 && s.hold > 0) bg.push("|");
    if (i === s.inhale + topUp + s.hold - 1 && s.exhale > 0) bg.push("|");
    if (holdOut > 0 && i === s.inhale + topUp + s.hold + s.exhale - 1) bg.push("|");
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
// Fade helpers
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
    headerStage = 1;
    await rebuildUI();
    await sleep(HEADER_FADE_STEP_MS);

    headerStage = 2;
    await rebuildUI();
  } finally {
    headerFadeInFlight = false;
  }
}

async function runBorderFadeOut() {
  if (borderFadeInFlight) return;
  borderFadeInFlight = true;
  try {
    borderStage = 1;
    await rebuildUI();
    await sleep(BORDER_FADE_STEP_MS);

    borderStage = 2;
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
    const total = sessionCycleTotal(s);
    if (total <= 0) return;

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
    const total = sessionCycleTotal(s);
    if (total <= 0) return;

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

  let frameBorderWidth = 1;
  let frameBorderColor = 2;
  let frameBorderRadius = 6;

  if (expanded) {
    if (borderStage === 1) {
      frameBorderWidth = 1;
      frameBorderColor = 1;
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
async function completeSession() {
  if (!expanded || !running) return;

  persistIfRunning("protocol-complete");
  running = false;
  completed = true;
  stopTickLoop();

  await pushText(BREATH_ID, BREATH_NAME, completedText());
}

function startTickLoop() {
  if (tickTimer) clearInterval(tickTimer);

  tickTimer = setInterval(async () => {
    if (!expanded) return;
    if (!running) return;
    if (!pluginForeground) return;
    if (uiUpdateInFlight) return;

    const s = SESSIONS[sessionIdx];
    const maxElapsed = sessionMaxElapsed(s);
    if (Number.isFinite(maxElapsed) && elapsedSessionSeconds() >= maxElapsed) {
      await completeSession();
      return;
    }

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

    headerStage = 0;
    borderStage = 0;
    clearHeaderWatcher();
    clearBorderWatcher();

    sessionIdx = (nextIdx + SESSIONS.length) % SESSIONS.length;
    saveLastSessionIdx(sessionIdx);

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
// Expand / Collapse
// ------------------------------
async function expandSession() {
  expanded = true;
  running = true;

  headerStage = 0;
  borderStage = 0;
  clearHeaderWatcher();
  clearBorderWatcher();

  startSessionClock();

  await rebuildUI();
  startTickLoop();

  scheduleHeaderFadeWatcher();
  scheduleBorderFadeWatcher();
}

async function collapseSession(reason = "tap-collapse") {
  persistIfRunning(reason);

  running = false;
  expanded = false;

  frozenSessionSeconds = null;
  frozenCycleSeconds = null;

  headerStage = 0;
  borderStage = 0;
  clearHeaderWatcher();
  clearBorderWatcher();

  stopTickLoop();
  await rebuildUI();
}

// ------------------------------
// Main event handler
// ------------------------------
async function onEvenHubEvent(evt) {
  if (evt?.sysEvent) {
    const code = n(evt.sysEvent.eventType);
    if (code === OS_EVT.FOREGROUND_EXIT) {
      pluginForeground = false;
      if (expanded && running) {
        freezeClock();
        persistIfRunning("foreground-exit");
      }
      return;
    }
    if (code === OS_EVT.FOREGROUND_ENTER) {
      pluginForeground = true;
      if (expanded && running) resumeClock();
      return;
    }
  }
  if (!pluginForeground) return;

  if (headerFadeInFlight || borderFadeInFlight) return;

  const t = extractEventType(evt);

  if (expanded && (t === OS_EVT.SCROLL_TOP || t === OS_EVT.SCROLL_BOTTOM)) {
    const dir = t === OS_EVT.SCROLL_TOP ? -1 : 1;
    await setSession(sessionIdx + dir);
    return;
  }

  if (isTapEventType(t)) {
    if (exiting) return;

    if (!expanded) {
      await expandSession();
      return;
    }

    if (expanded && completed) {
      await expandSession();
      return;
    }

    if (expanded && running) {
      await collapseSession("tap-collapse");
      return;
    }

    await collapseSession("fallback-collapse");
  }
}

// ------------------------------
// Hook up bridge
// ------------------------------
function attachGestureListeners() {
  if (typeof bridge?.onEvenHubEvent === "function") {
    const maybeUnsub = bridge.onEvenHubEvent((evt) => onEvenHubEvent(evt));
    return typeof maybeUnsub === "function" ? maybeUnsub : null;
  }
  return null;
}

let unsubscribeEvenHub = null;

// Boot entry point. Accepts an optional injected bridge for viewer/testing.
export async function bootStillness(injectedBridge = null) {
  bridge = injectedBridge ?? (await waitForEvenAppBridge());

  accumBaseSecondsToday = loadAccumSecondsToday();
  sessionIdx = loadLastSessionIdx();

  expanded = false;
  running = false;

  pluginForeground = true;
  frozenSessionSeconds = null;
  frozenCycleSeconds = null;

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

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => stop());
  window.addEventListener("pagehide", () => persistIfRunning("pagehide"));
  window.addEventListener("error", () => persistIfRunning("window-error"));
  window.addEventListener("unhandledrejection", () => persistIfRunning("unhandledrejection"));
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persistIfRunning("visibilitychange");
  });
}