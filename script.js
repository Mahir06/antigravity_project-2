// ===================== DATA =====================
const RECORDS = [
  { id: 0, title: 'Blue in Green', artist: 'Miles Davis', duration: 204, color1: '#1a3a5c', color2: '#2e6b9e', labelColor: '#4a90d9', labelText: 'MILES' },
  { id: 1, title: 'Pyramid Song', artist: 'Radiohead',   duration: 242, color1: '#2c1654', color2: '#5c3381', labelColor: '#a855f7', labelText: 'OK' },
  { id: 2, title: 'Sunflower',    artist: 'Post Malone', duration: 158, color1: '#7a3a00', color2: '#c46200', labelColor: '#f97316', labelText: 'SPIDER' },
  { id: 3, title: 'God Only Knows', artist: 'Beach Boys', duration: 175, color1: '#0a4a2c', color2: '#1a7a4c', labelColor: '#34d399', labelText: 'PET' },
  { id: 4, title: 'Nightcall',    artist: 'Kavinsky',    duration: 250, color1: '#2a0a1a', color2: '#6b1a3a', labelColor: '#f43f5e', labelText: 'DRIVE' },
];

// ===================== STATE =====================
let state = {
  phase: 'idle',        // idle | grabbing | dragging | placing | playing | island
  activeRecord: null,
  isPlaying: false,
  progress: 0,
  progressTimer: null,
  tonearmAngle: 28,
  tonearmOnRecord: false,
};

// ===================== ELEMENTS =====================
const carousel       = document.getElementById('vinyl-carousel');
const playerPanel    = document.getElementById('player-panel');
const platterVinyl   = document.getElementById('platter-vinyl');
const dropHint       = document.getElementById('drop-hint');
const tonearm        = document.getElementById('tonearm');
const tonearmNeedle  = document.getElementById('tonearm-needle');
const ghost          = document.getElementById('vinyl-ghost');
const homeBlur       = document.getElementById('home-blur-overlay');
const appGrid        = document.getElementById('app-grid');
const swipeHint      = document.getElementById('swipe-hint');
const btnPlay        = document.getElementById('btn-play');
const progFill       = document.getElementById('prog-fill');
const diProgFill     = document.getElementById('di-progress-fill');
const progCurrent    = document.getElementById('prog-current');
const progTotal      = document.getElementById('prog-total');
const playerTrackName   = document.getElementById('player-track-name');
const playerTrackArtist = document.getElementById('player-track-artist');
const diTrack        = document.getElementById('di-track');
const diArtist       = document.getElementById('di-artist');
const dynamicIsland  = document.getElementById('dynamic-island');
const diMiniVinyl    = document.getElementById('di-mini-vinyl');
const diVinylDisc    = document.getElementById('di-vinyl-disc');
const platterEl      = document.getElementById('platter');
const collapseBtn    = document.getElementById('player-collapse-btn');

// ===================== BUILD CAROUSEL =====================
function buildCarousel() {
  RECORDS.forEach(rec => {
    const card = document.createElement('div');
    card.className = 'vinyl-card';
    card.dataset.id = rec.id;

    // Album art (drawn with CSS + canvas-like div)
    const art = document.createElement('div');
    art.className = 'vinyl-card-art';
    art.style.background = `linear-gradient(135deg, ${rec.color1}, ${rec.color2})`;

    // Grooves on art
    art.innerHTML = `
      <div style="position:absolute;inset:0;background:
        radial-gradient(circle at 50% 50%, ${rec.labelColor}55 0%, transparent 40%),
        radial-gradient(circle at 30% 70%, rgba(255,255,255,0.08) 0%, transparent 50%);"></div>
      <div style="position:absolute;inset:25%;border-radius:50%;
        background:radial-gradient(circle at 40% 35%, rgba(255,255,255,0.15), transparent 60%),
        ${rec.labelColor};
        display:flex;align-items:center;justify-content:center;
        font-size:9px;font-weight:800;color:rgba(255,255,255,0.9);letter-spacing:1px;">
        ${rec.labelText}
      </div>
    `;

    const label = document.createElement('div');
    label.className = 'vinyl-card-label';
    label.textContent = rec.title;

    const disc = document.createElement('div');
    disc.className = 'vinyl-disc-preview';
    disc.style.background = `
      radial-gradient(circle at 50% 50%, ${rec.labelColor}99 0%, transparent 25%),
      radial-gradient(circle at 50% 50%, #111 0%, #1a1a1a 28%, transparent 29%),
      repeating-radial-gradient(circle at 50% 50%, #080808 0px, #1c1c1c 1.5px, #080808 3px)`;

    card.appendChild(art);
    card.appendChild(label);
    card.appendChild(disc);
    carousel.appendChild(card);

    attachDragToCard(card, rec);
  });
}

// ===================== DRAG LOGIC =====================
let dragState = null;

function attachDragToCard(card, rec) {
  card.addEventListener('pointerdown', e => {
    e.preventDefault();
    card.setPointerCapture(e.pointerId);

    const rect = card.getBoundingClientRect();
    const screenRect = document.getElementById('screen-content').getBoundingClientRect();

    // Build ghost from record colors
    ghost.innerHTML = `
      <div class="vinyl-ghost-inner" style="
        background: radial-gradient(circle at 50% 50%, ${rec.labelColor}99 0%, transparent 25%),
          radial-gradient(circle at 50% 50%, #111 0%, #1a1a1a 28%, transparent 29%),
          repeating-radial-gradient(circle at 50% 50%, #080808 0px, #1c1c1c 1.5px, #080808 3px);
        border-radius:50%; width:100%;height:100%;
        box-shadow:0 20px 50px rgba(0,0,0,0.6);
      "></div>`;

    dragState = {
      rec,
      card,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left + rect.width/2 - screenRect.left,
      originY: rect.top + rect.height/2 - screenRect.top,
      screenRect,
      moved: false,
    };

    state.activeRecord = rec;
    card.classList.add('hover-state');
    state.phase = 'grabbing';
  });

  card.addEventListener('pointermove', e => {
    if (!dragState || dragState.card !== card) return;
    e.preventDefault();

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist > 6 && !dragState.moved) {
      dragState.moved = true;
      state.phase = 'dragging';

      // Show player
      playerPanel.classList.add('visible');
      homeBlur.classList.add('active');
      appGrid.classList.add('dimmed');
      swipeHint.style.opacity = '0';
      ghost.classList.add('active');
    }

    if (!dragState.moved) return;

    const sx = e.clientX - dragState.screenRect.left;
    const sy = e.clientY - dragState.screenRect.top;

    ghost.style.left = sx + 'px';
    ghost.style.top  = sy + 'px';

    // Check proximity to platter
    const platterRect = platterEl.getBoundingClientRect();
    const platterCX = platterRect.left + platterRect.width/2 - dragState.screenRect.left;
    const platterCY = platterRect.top + platterRect.height/2 - dragState.screenRect.top;
    const pDist = Math.sqrt((sx - platterCX)**2 + (sy - platterCY)**2);

    if (pDist < 60) {
      platterEl.classList.add('snap-ready');
      dropHint.classList.add('visible');
    } else {
      platterEl.classList.remove('snap-ready');
      dropHint.classList.remove('visible');
    }
  });

  card.addEventListener('pointerup', e => {
    if (!dragState || dragState.card !== card) return;
    card.classList.remove('hover-state');

    if (!dragState.moved) {
      dragState = null;
      state.phase = 'idle';
      return;
    }

    const sx = e.clientX - dragState.screenRect.left;
    const sy = e.clientY - dragState.screenRect.top;
    const platterRect = platterEl.getBoundingClientRect();
    const platterCX = platterRect.left + platterRect.width/2 - dragState.screenRect.left;
    const platterCY = platterRect.top + platterRect.height/2 - dragState.screenRect.top;
    const pDist = Math.sqrt((sx - platterCX)**2 + (sy - platterCY)**2);

    ghost.classList.remove('active');
    platterEl.classList.remove('snap-ready');
    dropHint.classList.remove('visible');

    if (pDist < 80) {
      placeRecord(dragState.rec);
    }

    dragState = null;
  });
}

// ===================== PLACE RECORD =====================
function placeRecord(rec) {
  state.phase = 'placing';
  state.activeRecord = rec;
  state.progress = 0;

  // Style the platter vinyl with this record's colors
  platterVinyl.style.background = `
    radial-gradient(circle at 50% 50%, ${rec.labelColor}cc 0%, transparent 14%),
    radial-gradient(circle at 50% 50%, ${rec.color1} 0%, ${rec.color1} 13%,
      transparent 14%, transparent 28%,
      ${rec.color1}aa 29%, ${rec.color1}aa 100%),
    repeating-radial-gradient(circle at 50% 50%,
      #080808 0px, #1a1a1a 1.5px, #080808 3px)`;

  // Snap animation
  platterVinyl.classList.add('has-record');
  platterVinyl.classList.add('snap-anim');

  // Update track info
  playerTrackName.textContent = rec.title;
  playerTrackArtist.textContent = rec.artist;
  diTrack.textContent = rec.title;
  diArtist.textContent = rec.artist;
  progTotal.textContent = formatTime(rec.duration);

  // Move tonearm onto record after a moment
  setTimeout(() => {
    tonearm.classList.add('on-record');
    tonearmNeedle.classList.add('active');
    state.tonearmOnRecord = true;
    setTimeout(() => startPlayback(), 600);
  }, 400);

  setTimeout(() => platterVinyl.classList.remove('snap-anim'), 600);
}

// ===================== PLAYBACK =====================
function startPlayback() {
  state.phase = 'playing';
  state.isPlaying = true;

  platterVinyl.classList.add('playing');
  diVinylDisc.classList.add('playing');
  diMiniVinyl.classList.add('playing');
  btnPlay.textContent = '⏸';
  document.getElementById('di-play-pause').textContent = '⏸';

  runProgress();
}

function pausePlayback() {
  state.isPlaying = false;
  platterVinyl.classList.remove('playing');
  diVinylDisc.classList.remove('playing');
  diMiniVinyl.classList.remove('playing');
  btnPlay.textContent = '▶';
  document.getElementById('di-play-pause').textContent = '▶';
  clearInterval(state.progressTimer);
}

function runProgress() {
  clearInterval(state.progressTimer);
  const rec = state.activeRecord;
  state.progressTimer = setInterval(() => {
    state.progress += 1;
    if (state.progress >= rec.duration) {
      state.progress = 0; // loop
    }
    const pct = (state.progress / rec.duration) * 100;
    progFill.style.width = pct + '%';
    diProgFill.style.width = pct + '%';
    progCurrent.textContent = formatTime(state.progress);
  }, 1000);
}

function togglePlay() {
  if (!state.activeRecord) return;
  if (state.isPlaying) pausePlayback();
  else {
    state.isPlaying = true;
    platterVinyl.classList.add('playing');
    diVinylDisc.classList.add('playing');
    diMiniVinyl.classList.add('playing');
    btnPlay.textContent = '⏸';
    document.getElementById('di-play-pause').textContent = '⏸';
    runProgress();
  }
}

// ===================== COLLAPSE TO ISLAND =====================
collapseBtn.addEventListener('click', () => {
  playerPanel.classList.remove('visible');
  homeBlur.classList.remove('active');
  appGrid.classList.remove('dimmed');
  dynamicIsland.classList.add('expanded');
  state.phase = 'island';
  setTimeout(() => dynamicIsland.classList.add('expanded'), 10);
});

dynamicIsland.addEventListener('click', () => {
  if (state.phase === 'island') {
    dynamicIsland.classList.remove('expanded');
    playerPanel.classList.add('visible');
    homeBlur.classList.add('active');
    appGrid.classList.add('dimmed');
    state.phase = 'playing';
  }
});

// ===================== CONTROLS =====================
btnPlay.addEventListener('click', togglePlay);
document.getElementById('di-play-pause').addEventListener('click', e => { e.stopPropagation(); togglePlay(); });

document.getElementById('btn-prev').addEventListener('click', () => {
  if (!state.activeRecord) return;
  const idx = (state.activeRecord.id - 1 + RECORDS.length) % RECORDS.length;
  resetAndLoad(RECORDS[idx]);
});
document.getElementById('btn-next').addEventListener('click', () => {
  if (!state.activeRecord) return;
  const idx = (state.activeRecord.id + 1) % RECORDS.length;
  resetAndLoad(RECORDS[idx]);
});

function resetAndLoad(rec) {
  clearInterval(state.progressTimer);
  state.progress = 0;
  progFill.style.width = '0%';
  diProgFill.style.width = '0%';
  platterVinyl.classList.remove('playing');
  tonearm.classList.remove('on-record');
  tonearmNeedle.classList.remove('active');
  state.tonearmOnRecord = false;
  setTimeout(() => placeRecord(rec), 300);
}

// Progress bar click seek
document.getElementById('prog-track').addEventListener('click', e => {
  if (!state.activeRecord) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  state.progress = Math.floor(pct * state.activeRecord.duration);
  progFill.style.width = (pct * 100) + '%';
  diProgFill.style.width = (pct * 100) + '%';
  progCurrent.textContent = formatTime(state.progress);
});

// ===================== UTILS =====================
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

// ===================== INIT =====================
buildCarousel();
