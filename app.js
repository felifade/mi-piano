/* ========================================================================
   Mi Piano — partituras + audio + cursor sincronizado
   Librería: abcjs (renderiza ABC notation, reproduce con soundfont real).
   ======================================================================== */

/* ---------- Catálogo de piezas (ABC notation, dominio público) ---------- */
const PIECES = [
  {
    id: 'estrellita',
    title: 'Estrellita',
    composer: 'Tradicional',
    abc: `X:1
T:Estrellita ¿dónde estás?
M:4/4
L:1/4
Q:1/4=100
K:C
C C G G | A A G2 | F F E E | D D C2 ::
G G F F | E E D2 | G G F F | E E D2 ::
C C G G | A A G2 | F F E E | D D C2 |]`
  },
  {
    id: 'alegria',
    title: 'Himno de la Alegría',
    composer: 'L. v. Beethoven',
    abc: `X:1
T:Himno de la Alegría
C:Beethoven — 9.ª Sinfonía
M:4/4
L:1/4
Q:1/4=104
K:C
E E F G | G F E D | C C D E | E>D D2 |
E E F G | G F E D | C C D E | D>C C2 |
D D E C | D E/F/ E C | D E/F/ E D | C D G,2 |
E E F G | G F E D | C C D E | D>C C2 |]`
  },
  {
    id: 'martinillo',
    title: 'Martinillo',
    composer: 'Tradicional',
    abc: `X:1
T:Martinillo
M:4/4
L:1/4
Q:1/4=112
K:C
C D E C | C D E C | E F G2 | E F G2 |
G/A/G/F/ E C | G/A/G/F/ E C | C G, C2 | C G, C2 |]`
  },
  {
    id: 'minueto',
    title: 'Minueto en Sol',
    composer: 'J. S. Bach',
    abc: `X:1
T:Minueto en Sol
C:J. S. Bach — BWV Anh. 114
M:3/4
L:1/8
Q:1/4=108
K:G
d2 B2 c2 | d2 G2 A2 | B2 c2 d2 | e2 G2 G2 |
c2 B2 A2 | B2 c2 d2 | A2 G2 F2 | G6 |
B2 c2 d2 | e2 d2 c2 | B2 A2 B2 | c2 B2 A2 |
B2 A2 G2 | F2 G2 A2 | B2 G2 F2 | G6 |]`
  },
  {
    id: 'elisa',
    title: 'Para Elisa',
    composer: 'L. v. Beethoven',
    abc: `X:1
T:Para Elisa
C:Beethoven — WoO 59
M:4/4
L:1/8
Q:1/8=120
K:Am
e ^d e ^d e B d c | A2 z2 C E A B | z E ^G B c2 z2 |
e ^d e ^d e B d c | A2 z2 C E A c | B A4 z3 |]`
  },
  {
    id: 'arroz',
    title: 'Arroz con leche',
    composer: 'Tradicional',
    abc: `X:1
T:Arroz con leche
M:3/4
L:1/4
Q:1/4=120
K:C
G G E | G E C | F F D | F D B, |
G G E | G E C | F D B, | C3 |]`
  }
];

/* ---------- Estado global ---------- */
let visualObj = null;
let synthControl = null;
let audioContext = null;
let needsReload = true;
let isPlaying = false;
let currentTempoPct = 100;
let lastHighlight = null;
let abcjsReady = false;
let pendingABC = PIECES[0].abc;

const $ = (id) => document.getElementById(id);

/* ---------- Inicialización ---------- */
function init() {
  // Red de seguridad: el splash nunca debería verse al iniciar
  showSplash(false);
  buildPiecesNav();
  hookControls();
  // Teclado visual abajo
  if (window.PianoKeyboard) {
    PianoKeyboard.init(document.getElementById('keyboard'));
  }
  // abcjs se carga con defer; esperamos a que esté listo
  whenAbcjsReady(() => {
    abcjsReady = true;
    renderPiece(pendingABC);
  });
}

function whenAbcjsReady(cb) {
  if (typeof ABCJS !== 'undefined') return cb();
  const i = setInterval(() => {
    if (typeof ABCJS !== 'undefined') {
      clearInterval(i);
      cb();
    }
  }, 30);
}

/* ---------- Navegación de piezas ---------- */
function buildPiecesNav() {
  const nav = $('pieces');
  nav.innerHTML = '';
  PIECES.forEach((p, idx) => {
    const btn = document.createElement('button');
    btn.className = 'piece' + (idx === 0 ? ' active' : '');
    btn.dataset.id = p.id;
    btn.innerHTML = `<span class="t">${p.title}</span><span class="c">${p.composer}</span>`;
    btn.addEventListener('click', () => selectPiece(p, btn));
    nav.appendChild(btn);
  });
}

function selectPiece(piece, btnEl) {
  document.querySelectorAll('.piece').forEach((b) => b.classList.remove('active'));
  btnEl.classList.add('active');
  // Si está sonando, lo paramos antes de cambiar
  if (isPlaying && synthControl) {
    synthControl.pause();
  }
  isPlaying = false;
  updatePlayBtn();
  if (window.PianoKeyboard) PianoKeyboard.clearAll();
  renderPiece(piece.abc);
}

/* ---------- Render de partitura ---------- */
function renderPiece(abc) {
  pendingABC = abc;
  if (!abcjsReady) return;
  try {
    const wrap = $('paper');
    const width = Math.min(wrap.clientWidth - 16, 1060);
    const arr = ABCJS.renderAbc('paper', abc, {
      responsive: 'resize',
      add_classes: true,
      staffwidth: width,
      paddingtop: 12,
      paddingbottom: 12,
      paddingleft: 8,
      paddingright: 8,
      scale: window.innerWidth < 700 ? 1.35 : 1.6,
      foregroundColor: '#2c2519',
    });
    visualObj = arr && arr[0];
    needsReload = true;
    if (lastHighlight) {
      lastHighlight.classList.remove('current-note');
      lastHighlight = null;
    }
    $('paper-empty').hidden = !!visualObj;
  } catch (e) {
    console.error('Render falló:', e);
    $('paper-empty').hidden = false;
  }
}

/* ---------- Cursor sincronizado ---------- */
const cursorControl = {
  beatSubdivisions: 1,
  onReady: function () {},
  onStart: function () {
    isPlaying = true;
    updatePlayBtn();
  },
  onFinished: function () {
    if (lastHighlight) {
      lastHighlight.classList.remove('current-note');
      lastHighlight = null;
    }
    if (window.PianoKeyboard) PianoKeyboard.clearAll();
    isPlaying = false;
    updatePlayBtn();
  },
  onBeat: function () {},
  onEvent: function (ev) {
    // 1) Resaltar la nota en la partitura
    if (lastHighlight) lastHighlight.classList.remove('current-note');
    if (ev.elements && ev.elements.length) {
      const group = ev.elements[0];
      if (group && group[0]) {
        const el = group[0];
        el.classList.add('current-note');
        lastHighlight = el;
        // Auto-scroll si la nota se sale del cuadro visible
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.bottom > vh - 180 || rect.top < 80) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    // 2) Iluminar las teclas del piano que están sonando ahora
    if (window.PianoKeyboard) {
      PianoKeyboard.clearAll();
      if (ev.midiPitches && ev.midiPitches.length) {
        ev.midiPitches.forEach((p) => {
          if (p && typeof p.pitch === 'number') {
            PianoKeyboard.lightKey(p.pitch, true);
          }
        });
      }
    }
  }
};

/* ---------- Audio: carga/sincroniza con la partitura ---------- */
async function ensureAudioReady() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  if (!synthControl) {
    synthControl = new ABCJS.synth.SynthController();
    // Carga el controlador en un div oculto (usamos nuestros propios botones)
    const hidden = document.createElement('div');
    hidden.style.display = 'none';
    document.body.appendChild(hidden);
    synthControl.load(hidden, cursorControl, {
      displayLoop: false,
      displayRestart: false,
      displayPlay: false,
      displayProgress: false,
      displayWarp: false
    });
  }
  if (needsReload && visualObj) {
    await synthControl.setTune(visualObj, false, {
      audioContext,
      soundFontUrl: 'https://paulrosen.github.io/midi-js-soundfonts/abcjs/',
      program: 0, // Acoustic Grand Piano
      midiTranspose: 0,
      chordsOff: false
    });
    synthControl.setWarp(currentTempoPct);
    needsReload = false;
  }
}

/* ---------- Controles ---------- */
function hookControls() {
  $('btn-play').addEventListener('click', onTogglePlay);
  $('btn-restart').addEventListener('click', onRestart);
  $('tempo').addEventListener('input', onTempo);
  $('file-input').addEventListener('change', onFile);

  // Estilo del slider de tempo
  paintTempo(currentTempoPct);
}

async function onTogglePlay() {
  if (!visualObj) return;
  showSplash(true);
  // Timeout de seguridad: si el soundfont tarda >25s, no dejamos al usuario colgado
  const timeoutId = setTimeout(() => {
    showSplash(false);
    alert('El sonido del piano tardó demasiado en cargar. Probá tocar Play de nuevo (la 2ª vez suele andar más rápido).');
  }, 25000);
  try {
    await ensureAudioReady();
    clearTimeout(timeoutId);
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('Audio falló al cargar:', e);
    alert('No se pudo cargar el sonido del piano: ' + (e && e.message ? e.message : 'error desconocido') + '. Revisá la conexión a internet.');
    showSplash(false);
    return;
  }
  showSplash(false);
  // play() del controlador alterna entre reproducir y pausar
  const wasPlaying = isPlaying;
  synthControl.play();
  isPlaying = !wasPlaying;
  updatePlayBtn();
  // Si pausamos, apagar las teclas (no se dispara onFinished al pausar)
  if (wasPlaying && window.PianoKeyboard) {
    PianoKeyboard.clearAll();
  }
}

function onRestart() {
  if (!synthControl) return;
  synthControl.restart();
  if (!isPlaying) {
    synthControl.play();
  }
}

function onTempo(e) {
  currentTempoPct = parseInt(e.target.value, 10) || 100;
  $('tempo-value').textContent = currentTempoPct + '%';
  paintTempo(currentTempoPct);
  if (synthControl && !needsReload) {
    synthControl.setWarp(currentTempoPct);
  }
}

function paintTempo(pct) {
  const min = 40, max = 160;
  const p = ((pct - min) / (max - min)) * 100;
  $('tempo').style.setProperty('--p', p + '%');
}

function updatePlayBtn() {
  $('icon-play').hidden = isPlaying;
  $('icon-pause').hidden = !isPlaying;
  $('btn-play').setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reproducir');
}

function showSplash(on) {
  $('splash').hidden = !on;
}

/* ---------- Subir archivo .abc ---------- */
function onFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const abc = String(reader.result || '');
    if (!abc.includes('X:')) {
      alert('El archivo no parece ser una partitura ABC válida. Buscá archivos .abc en abcnotation.com.');
      return;
    }
    // Quitar selección activa de las piezas
    document.querySelectorAll('.piece').forEach((b) => b.classList.remove('active'));
    if (isPlaying && synthControl) synthControl.pause();
    isPlaying = false;
    updatePlayBtn();
    renderPiece(abc);
  };
  reader.readAsText(file);
}

/* ---------- Resize: re-render para ajustar ancho ---------- */
let resizeTO = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTO);
  resizeTO = setTimeout(() => {
    if (pendingABC) renderPiece(pendingABC);
  }, 180);
});

/* ---------- Arranque ---------- */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
