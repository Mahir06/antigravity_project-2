const records = [
  { id: "r1", title: "Blue in Green", artist: "Miles Davis", art: "assets/references/1.png", duration: 204 },
  { id: "r2", title: "Electric Bloom", artist: "Nora Flux", art: "assets/references/2.png", duration: 238 },
  { id: "r3", title: "Night Circuit", artist: "Astra Mono", art: "assets/references/3.png", duration: 194 },
  { id: "r4", title: "Kind of Blue", artist: "Miles Davis", art: "assets/references/1.png", duration: 286 },
  { id: "r5", title: "Solar Drift", artist: "Nova Unit", art: "assets/references/2.png", duration: 212 },
];

const ui = {
  screen: document.getElementById("screen-content"),
  carousel: document.getElementById("vinyl-carousel"),
  appGrid: document.getElementById("app-grid"),
  homeBlurOverlay: document.getElementById("home-blur-overlay"),
  swipeHint: document.getElementById("swipe-hint"),
  ghost: document.getElementById("vinyl-ghost"),
  playerPanel: document.getElementById("player-panel"),
  turntable: document.getElementById("turntable"),
  playerTrackName: document.getElementById("player-track-name"),
  playerTrackArtist: document.getElementById("player-track-artist"),
  platter: document.getElementById("platter"),
  spindle: document.getElementById("platter-spindle"),
  platterVinyl: document.getElementById("platter-vinyl"),
  dropHint: document.getElementById("drop-hint"),
  tonearm: document.getElementById("tonearm"),
  tonearmPivot: document.getElementById("tonearm-pivot"),
  tonearmNeedle: document.getElementById("tonearm-needle"),
  btnPlay: document.getElementById("btn-play"),
  btnPrev: document.getElementById("btn-prev"),
  btnNext: document.getElementById("btn-next"),
  progFill: document.getElementById("prog-fill"),
  progCurrent: document.getElementById("prog-current"),
  progTotal: document.getElementById("prog-total"),
  progTrack: document.getElementById("prog-track"),
  playerCollapseBtn: document.getElementById("player-collapse-btn"),
  dynamicIsland: document.getElementById("dynamic-island"),
  diExpanded: document.getElementById("di-expanded"),
  diTrack: document.getElementById("di-track"),
  diArtist: document.getElementById("di-artist"),
  diProgressFill: document.getElementById("di-progress-fill"),
  diMiniVinyl: document.getElementById("di-mini-vinyl"),
  diVinylDisc: document.getElementById("di-vinyl-disc"),
  diPlayPause: document.getElementById("di-play-pause"),
};

const state = {
  mode: "idle",
  island: "collapsed",
  isPanelVisible: false,
  isPlaying: false,
  activeRecord: null,
  placedRecord: null,
  dragCardEl: null,
  pointerId: null,
  dragStartX: 0,
  dragStartY: 0,
  dragStarted: false,
  holdTimer: null,
  holdActive: false,
  ghostX: 0,
  ghostY: 0,
  snapReady: false,
  playbackProgress: 0,
  duration: 204,
  rafId: null,
  lastTickMs: null,
  tonearmDragging: false,
  tonearmAngle: 28,
};

const REST_ANGLE = 28;
const CONTACT_ANGLE = 5;
const PLAY_ANGLE = 0;

function setMode(next) {
  state.mode = next;
  document.body.dataset.mode = next;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function renderCarousel() {
  ui.carousel.innerHTML = "";
  records.forEach((record) => {
    const card = document.createElement("div");
    card.className = "vinyl-card";
    card.dataset.recordId = record.id;
    card.innerHTML = `
      <div class="vinyl-card-art">
        <img src="${record.art}" alt="${record.title}" style="width:100%;height:100%;object-fit:cover;">
      </div>
      <div class="vinyl-disc-preview"></div>
      <div class="vinyl-card-label">${record.title}</div>
      <div class="haptic-pulse"></div>
    `;
    ui.carousel.appendChild(card);
  });
}

function showPanel() {
  if (state.isPanelVisible) return;
  state.isPanelVisible = true;
  ui.playerPanel.classList.add("visible");
}

function hidePanel() {
  state.isPanelVisible = false;
  ui.playerPanel.classList.remove("visible");
}

function syncTrackMeta(record) {
  if (!record) return;
  ui.playerTrackName.textContent = record.title;
  ui.playerTrackArtist.textContent = record.artist;
  ui.diTrack.textContent = record.title;
  ui.diArtist.textContent = record.artist;
  state.duration = record.duration;
  ui.progTotal.textContent = formatTime(state.duration);
}

function updateProgressUI() {
  const pct = Math.max(0, Math.min(100, (state.playbackProgress / state.duration) * 100));
  ui.progFill.style.width = `${pct}%`;
  ui.diProgressFill.style.width = `${pct}%`;
  ui.progCurrent.textContent = formatTime(state.playbackProgress);
}

function setPlaying(nextPlaying) {
  state.isPlaying = nextPlaying;
  ui.btnPlay.textContent = nextPlaying ? "⏸" : "▶";
  ui.diPlayPause.textContent = nextPlaying ? "⏸" : "▶";
  ui.platterVinyl.classList.toggle("playing", nextPlaying);
  ui.diMiniVinyl.classList.toggle("playing", nextPlaying);
  ui.diVinylDisc.classList.toggle("playing", nextPlaying);
  ui.tonearmNeedle.classList.toggle("active", nextPlaying);
}

function tick(ts) {
  if (!state.lastTickMs) state.lastTickMs = ts;
  const dt = (ts - state.lastTickMs) / 1000;
  state.lastTickMs = ts;
  if (state.isPlaying && state.placedRecord) {
    state.playbackProgress += dt;
    if (state.playbackProgress >= state.duration) {
      state.playbackProgress = state.duration;
      setPlaying(false);
    }
    updateProgressUI();
  }
  state.rafId = requestAnimationFrame(tick);
}

function ensureTicking() {
  if (!state.rafId) state.rafId = requestAnimationFrame(tick);
}

function applyGhostStyle(record) {
  ui.ghost.innerHTML = `<div class="vinyl-ghost-inner"></div>`;
  const inner = ui.ghost.querySelector(".vinyl-ghost-inner");
  inner.style.background = `
    radial-gradient(circle at 50% 50%, transparent 0%, transparent 16%, rgba(0,0,0,0.92) 17%, rgba(20,20,20,0.95) 100%),
    repeating-radial-gradient(circle at 50% 50%, #0a0a0a 0px, #1f1f1f 1px, #0a0a0a 2px)
  `;
  const label = document.createElement("div");
  label.className = "ghost-label";
  label.style.backgroundImage = `url("${record.art}")`;
  inner.appendChild(label);
}

function playerCenter() {
  const r = ui.platter.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, radius: r.width / 2 };
}

function updateDragVisual(x, y) {
  state.ghostX = x;
  state.ghostY = y;
  ui.ghost.style.left = `${x}px`;
  ui.ghost.style.top = `${y}px`;
  const c = playerCenter();
  const dx = c.x - x;
  const dy = c.y - y;
  const dist = Math.hypot(dx, dy);
  const near = dist < c.radius * 0.95;
  state.snapReady = near;
  ui.platter.classList.toggle("snap-ready", near);
  ui.dropHint.classList.toggle("visible", near);
  if (near) setMode("placement");
}

function placeRecord() {
  const record = state.activeRecord;
  if (!record) return;
  state.placedRecord = record;
  state.playbackProgress = 0;
  updateProgressUI();
  syncTrackMeta(record);

  ui.platterVinyl.classList.add("has-record", "snap-anim");
  ui.platterVinyl.innerHTML = `<div class="platter-vinyl-label" style="background-image:url('${record.art}')"></div><div class="groove-glow"></div>`;
  setTimeout(() => ui.platterVinyl.classList.remove("snap-anim"), 550);
  setMode("placement");
  hideGhost();
}

function showGhost() {
  ui.ghost.classList.add("active");
}

function hideGhost() {
  ui.ghost.classList.remove("active");
  ui.platter.classList.remove("snap-ready");
  ui.dropHint.classList.remove("visible");
}

function clearHold() {
  if (state.holdTimer) window.clearTimeout(state.holdTimer);
  state.holdTimer = null;
}

function enterGrab(cardEl) {
  state.holdActive = true;
  setMode("grab");
  cardEl.classList.add("hover-state");
  cardEl.classList.add("micro-haptic");
  ui.homeBlurOverlay.classList.add("active");
  ui.appGrid.classList.add("dimmed");
}

function leaveGrab(cardEl, forceReset = false) {
  state.holdActive = false;
  if (cardEl) {
    cardEl.classList.remove("hover-state", "micro-haptic");
  }
  if (!state.dragStarted || forceReset) {
    ui.homeBlurOverlay.classList.remove("active");
    ui.appGrid.classList.remove("dimmed");
    if (!state.placedRecord) setMode("idle");
  }
}

function startDrag(cardEl, e) {
  state.dragStarted = true;
  setMode("reveal");
  showPanel();
  ui.swipeHint.style.opacity = "0";
  const id = cardEl.dataset.recordId;
  state.activeRecord = records.find((r) => r.id === id);
  applyGhostStyle(state.activeRecord);
  showGhost();
  updateDragVisual(e.clientX, e.clientY);
}

function endRecordDrag() {
  if (!state.dragStarted) {
    leaveGrab(state.dragCardEl);
    state.dragCardEl = null;
    state.pointerId = null;
    return;
  }
  if (state.snapReady) {
    placeRecord();
  } else {
    hideGhost();
    if (!state.placedRecord) {
      hidePanel();
      setMode("idle");
    } else {
      setMode("placement");
    }
  }
  state.dragStarted = false;
  leaveGrab(state.dragCardEl, true);
  state.dragCardEl = null;
  state.pointerId = null;
}

function pointerDownCard(e) {
  const card = e.target.closest(".vinyl-card");
  if (!card) return;
  e.preventDefault();
  state.dragCardEl = card;
  state.pointerId = e.pointerId;
  state.dragStartX = e.clientX;
  state.dragStartY = e.clientY;
  card.setPointerCapture(e.pointerId);
  clearHold();
  state.holdTimer = window.setTimeout(() => enterGrab(card), 120);
}

function pointerMoveCard(e) {
  if (!state.dragCardEl || e.pointerId !== state.pointerId) return;
  const movedEnough = Math.hypot(e.clientX - state.dragStartX, e.clientY - state.dragStartY) > 8;
  if (state.holdActive && !state.dragStarted && movedEnough) {
    startDrag(state.dragCardEl, e);
  }
  if (state.dragStarted) updateDragVisual(e.clientX, e.clientY);
}

function pointerUpCard(e) {
  if (!state.dragCardEl || e.pointerId !== state.pointerId) return;
  clearHold();
  endRecordDrag();
}

function calcTonearmAngle(clientX, clientY) {
  const rect = ui.tonearmPivot.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const raw = Math.atan2(dx, dy) * (180 / Math.PI);
  return Math.max(PLAY_ANGLE, Math.min(REST_ANGLE, raw));
}

function applyTonearmAngle(angle) {
  state.tonearmAngle = angle;
  ui.tonearm.style.transform = `rotate(${angle}deg)`;
  const touching = state.placedRecord && angle <= CONTACT_ANGLE;
  if (touching) {
    setMode("playback");
    setPlaying(true);
  } else if (state.isPlaying && angle > CONTACT_ANGLE + 2) {
    setPlaying(false);
  }
}

function onTonearmDown(e) {
  if (!state.placedRecord) return;
  state.tonearmDragging = true;
  ui.tonearmPivot.setPointerCapture(e.pointerId);
}

function onTonearmMove(e) {
  if (!state.tonearmDragging) return;
  applyTonearmAngle(calcTonearmAngle(e.clientX, e.clientY));
}

function onTonearmUp(e) {
  if (!state.tonearmDragging) return;
  ui.tonearmPivot.releasePointerCapture(e.pointerId);
  state.tonearmDragging = false;
}

function collapseToIsland() {
  hidePanel();
  ui.homeBlurOverlay.classList.remove("active");
  ui.appGrid.classList.remove("dimmed");
  state.island = "collapsed";
  ui.dynamicIsland.classList.remove("expanded");
  ui.dynamicIsland.classList.add("island-playing");
  setMode(state.isPlaying ? "playback" : (state.placedRecord ? "placement" : "idle"));
}

function toggleIslandExpand() {
  if (state.island === "collapsed") {
    state.island = "expanded";
    ui.dynamicIsland.classList.add("expanded");
  } else {
    state.island = "collapsed";
    ui.dynamicIsland.classList.remove("expanded");
  }
}

function togglePlayPause() {
  if (!state.placedRecord) return;
  if (!state.isPlaying) {
    if (state.tonearmAngle > CONTACT_ANGLE) applyTonearmAngle(CONTACT_ANGLE);
    setPlaying(true);
  } else {
    setPlaying(false);
  }
}

function onOutsideTap(e) {
  const tapInsidePanel = !!e.target.closest("#player-panel");
  const tapInsideIsland = !!e.target.closest("#dynamic-island");
  if (state.isPanelVisible && !tapInsidePanel && !tapInsideIsland) collapseToIsland();
}

function seekFromProgressBar(e) {
  if (!state.placedRecord) return;
  const rect = ui.progTrack.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
  state.playbackProgress = (x / rect.width) * state.duration;
  updateProgressUI();
}

function jumpTrack(delta) {
  const currentIdx = Math.max(0, records.findIndex((r) => r.id === (state.placedRecord?.id || records[0].id)));
  const nextIdx = (currentIdx + delta + records.length) % records.length;
  state.activeRecord = records[nextIdx];
  placeRecord();
  applyTonearmAngle(REST_ANGLE);
  setPlaying(false);
}

function initEvents() {
  ui.carousel.addEventListener("pointerdown", pointerDownCard);
  ui.carousel.addEventListener("pointermove", pointerMoveCard);
  ui.carousel.addEventListener("pointerup", pointerUpCard);
  ui.carousel.addEventListener("pointercancel", pointerUpCard);

  ui.tonearmPivot.addEventListener("pointerdown", onTonearmDown);
  window.addEventListener("pointermove", onTonearmMove);
  window.addEventListener("pointerup", onTonearmUp);

  ui.btnPlay.addEventListener("click", togglePlayPause);
  ui.diPlayPause.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePlayPause();
  });
  ui.btnPrev.addEventListener("click", () => jumpTrack(-1));
  ui.btnNext.addEventListener("click", () => jumpTrack(1));
  ui.progTrack.addEventListener("click", seekFromProgressBar);
  ui.playerCollapseBtn.addEventListener("click", collapseToIsland);
  ui.dynamicIsland.addEventListener("click", toggleIslandExpand);
  ui.turntable.addEventListener("dblclick", collapseToIsland);
  ui.screen.addEventListener("click", onOutsideTap);
}

function init() {
  renderCarousel();
  setMode("idle");
  applyTonearmAngle(REST_ANGLE);
  setPlaying(false);
  updateProgressUI();
  initEvents();
  ensureTicking();
}

init();
