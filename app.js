/* ========================================================================
   Mi Piano — partituras + audio + cursor sincronizado
   Librería: abcjs (renderiza ABC notation, reproduce con soundfont real).
   ======================================================================== */

/* ---------- Catálogo de piezas (ABC notation, dominio público) ---------- */
const PIECES = [
  {
    id: 'mananitas',
    title: 'Las Mañanitas',
    composer: 'Tradicional (México) 🌹',
    abc: `X:1
T:Las Mañanitas
C:Tradicional (México)
M:3/4
L:1/4
Q:1/4=110
K:G
G G G | G B A | G F E | D3 |
G G G | G B A | G F E | D3 |
B B B | B d c | B A G | A3 |
B B B | B d c | B A G | G3 |]`
  },
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
  },
  {
    id: 'aulalune',
    title: 'Al claro de la luna',
    composer: 'Tradicional (Francia)',
    abc: `X:1
T:Al claro de la luna
C:Au Clair de la Lune — Tradicional
M:4/4
L:1/4
Q:1/4=104
K:C
C C C D | E2 D2 | C E D D | C4 |
C C C D | E2 D2 | C E D D | C4 |
D D D D | A,2 A,2 | D C B, A, | G,4 |
C C C D | E2 D2 | C E D D | C4 |]`
  },
  {
    id: 'cuna',
    title: 'Canción de cuna',
    composer: 'J. Brahms',
    abc: `X:1
T:Canción de cuna
C:J. Brahms — Wiegenlied Op. 49 N.º 4
M:3/4
L:1/4
Q:1/4=84
K:F
F F A | F F A | F A c | B A2 |
G G B | A A2 | G G B | A A2 |
A c B | A G F | E D C | F2 z |
A c B | A G F | E D C | F3 |]`
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    composer: 'Tradicional (Inglaterra, s. XVI)',
    abc: `X:1
T:Greensleeves
C:Tradicional (Inglaterra)
M:6/8
L:1/8
Q:3/8=68
K:Am
A2 c d2 e | f2 e d2 B | G2 A B2 G | E2 ^F E3 |
A2 c d2 e | f2 e d2 B | G2 A B2 ^G | A2 ^G A3 |
e3 e2 ^d | e2 ^f g2 e | d2 B G2 A | B2 c A3 |
e3 e2 ^d | e2 ^f g2 e | d2 B G2 ^G | A2 ^G A3 |]`
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
// Posición actual en ms para el seek (modo ABC)
let currentMs = 0;
let totalMs = 0;
const SEEK_DELTA_SEC = 5;
// Modo activo: 'abc' (abcjs) o 'xml' (OSMD + Tone.js)
let currentMode = 'abc';
let xmlPlayerInitialized = false;

const $ = (id) => document.getElementById(id);

/* ---------- Inicialización ---------- */
function init() {
  // Red de seguridad: el splash nunca debería verse al iniciar
  showSplash(false);
  setupDedication();
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

/* ---------- Inicializar XmlPlayer cuando se necesite (perezoso) ---------- */
function ensureXmlPlayerInit() {
  if (xmlPlayerInitialized) return true;
  if (typeof opensheetmusicdisplay === 'undefined' || typeof Tone === 'undefined') {
    return false; // todavía no cargaron las librerías
  }
  if (!window.XmlPlayer) return false;
  const ok = XmlPlayer.init(document.getElementById('paper'));
  if (!ok) return false;

  // Cuando XmlPlayer dispare una nota, iluminamos el teclado
  XmlPlayer.setNoteCallback((notes) => {
    if (!window.PianoKeyboard) return;
    PianoKeyboard.clearAll();
    notes.forEach((n) => {
      if (typeof n.midi === 'number') PianoKeyboard.lightKey(n.midi, true);
    });
  });
  XmlPlayer.setStartCallback(() => {
    isPlaying = true;
    updatePlayBtn();
  });
  XmlPlayer.setFinishedCallback(() => {
    isPlaying = false;
    updatePlayBtn();
    if (window.PianoKeyboard) PianoKeyboard.clearAll();
  });

  xmlPlayerInitialized = true;
  return true;
}

/* ---------- Pantalla de Día de las Madres ---------- */
function setupDedication() {
  const el = $('dedication');
  if (!el) return;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    el.classList.add('closing');
    setTimeout(() => { el.hidden = true; }, 450);
  };
  // Cierre automático tras 6 segundos
  const autoId = setTimeout(close, 6000);
  // Botón "Tocar piano"
  $('d-close').addEventListener('click', () => { clearTimeout(autoId); close(); });
  // Tocar fuera de la tarjeta también cierra
  el.addEventListener('click', (e) => {
    if (e.target === el) { clearTimeout(autoId); close(); }
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
  // Si estaba sonando algo (abc o xml), parar antes de cambiar
  if (currentMode === 'xml' && window.XmlPlayer) {
    XmlPlayer.stop();
  }
  if (isPlaying && synthControl) {
    synthControl.pause();
  }
  isPlaying = false;
  updatePlayBtn();
  if (window.PianoKeyboard) PianoKeyboard.clearAll();
  currentMode = 'abc';
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
    // 0) Trackear tiempo actual (para los botones de retroceder/avanzar)
    if (typeof ev.milliseconds === 'number') {
      currentMs = ev.milliseconds;
    }

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
    // Duración total de la pieza (en ms) para clamp del seek
    totalMs = computeTotalMsAbc();
    currentMs = 0;
    needsReload = false;
  }
}

function computeTotalMsAbc() {
  try {
    if (synthControl && synthControl.timer && synthControl.timer.totalDuration) {
      return synthControl.timer.totalDuration * 1000;
    }
    if (visualObj && typeof visualObj.millisecondsPerMeasure === 'function') {
      const measures = (visualObj.getTotalTime && visualObj.getTotalTime()) || 16;
      return visualObj.millisecondsPerMeasure() * measures;
    }
  } catch (e) {}
  return 60000; // 1 min fallback
}

/* ---------- Controles ---------- */
function hookControls() {
  $('btn-play').addEventListener('click', onTogglePlay);
  $('btn-restart').addEventListener('click', onRestart);
  $('btn-back').addEventListener('click', () => onSeek(-SEEK_DELTA_SEC));
  $('btn-fwd').addEventListener('click', () => onSeek(+SEEK_DELTA_SEC));
  $('tempo').addEventListener('input', onTempo);
  $('file-input').addEventListener('change', onFile);

  // Estilo del slider de tempo
  paintTempo(currentTempoPct);
}

/* ---------- Seek (retroceder / avanzar unos segundos) ---------- */
async function onSeek(deltaSec) {
  if (currentMode === 'xml') {
    if (window.XmlPlayer && XmlPlayer.isReady() && typeof XmlPlayer.seek === 'function') {
      XmlPlayer.seek(deltaSec);
      if (window.PianoKeyboard) PianoKeyboard.clearAll();
    }
    return;
  }
  // Modo ABC
  if (!synthControl || needsReload) return;
  const newMs = Math.max(0, Math.min(totalMs || 60000, currentMs + deltaSec * 1000));
  try {
    // abcjs.synth.SynthController.seek(position, units) — units: "seconds" o "percent" (0-1)
    synthControl.seek(newMs / 1000, 'seconds');
    currentMs = newMs;
    if (window.PianoKeyboard) PianoKeyboard.clearAll();
  } catch (e) {
    console.warn('seek falló:', e);
  }
}

async function onTogglePlay() {
  if (currentMode === 'xml') return onTogglePlayXml();
  return onTogglePlayAbc();
}

async function onTogglePlayAbc() {
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

async function onTogglePlayXml() {
  if (!window.XmlPlayer || !XmlPlayer.isReady()) return;
  // Si arranca por primera vez, mostrar splash mientras cargan las muestras
  const willStart = !XmlPlayer.isPlaying();
  if (willStart) {
    showSplash(true);
    const timeoutId = setTimeout(() => {
      showSplash(false);
      alert('El sonido del piano tardó demasiado en cargar. Probá tocar Play de nuevo (la 2ª vez suele andar más rápido).');
    }, 30000);
    try {
      await XmlPlayer.togglePlay();
      clearTimeout(timeoutId);
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('XmlPlayer falló:', e);
      alert('No se pudo reproducir la partitura: ' + (e && e.message ? e.message : 'error desconocido'));
      showSplash(false);
      return;
    }
    showSplash(false);
  } else {
    await XmlPlayer.togglePlay();
    if (window.PianoKeyboard) PianoKeyboard.clearAll();
  }
  isPlaying = XmlPlayer.isPlaying();
  updatePlayBtn();
}

async function onRestart() {
  if (currentMode === 'xml') {
    if (window.XmlPlayer && XmlPlayer.isReady()) {
      await XmlPlayer.restart();
    }
    return;
  }
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
  if (currentMode === 'xml') {
    if (window.XmlPlayer) XmlPlayer.setTempo(currentTempoPct);
    return;
  }
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

/* ---------- Subir partitura: detecta .abc o MusicXML (.musicxml, .xml, .mxl) ---------- */
async function onFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const name = (file.name || '').toLowerCase();
  const ext = name.split('.').pop();

  // Limpiar lo que estaba pasando
  document.querySelectorAll('.piece').forEach((b) => b.classList.remove('active'));
  if (currentMode === 'abc' && isPlaying && synthControl) synthControl.pause();
  if (currentMode === 'xml' && window.XmlPlayer) XmlPlayer.stop();
  isPlaying = false;
  updatePlayBtn();
  if (window.PianoKeyboard) PianoKeyboard.clearAll();

  try {
    if (ext === 'musicxml' || ext === 'xml' || ext === 'mxl') {
      await loadMusicXmlFile(file, ext);
    } else {
      await loadAbcFile(file);
    }
  } catch (err) {
    console.error('Error cargando archivo:', err);
    alert('No se pudo cargar la partitura: ' + (err && err.message ? err.message : 'error desconocido'));
  } finally {
    // Permitir volver a subir el mismo archivo si hace falta
    e.target.value = '';
  }
}

function loadAbcFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const abc = String(reader.result || '');
      if (!abc.includes('X:')) {
        reject(new Error('El archivo no parece ser una partitura ABC válida (falta el encabezado "X:"). Buscá archivos .abc en abcnotation.com o subí un MusicXML de musescore.com.'));
        return;
      }
      currentMode = 'abc';
      renderPiece(abc);
      resolve();
    };
    reader.onerror = () => reject(reader.error || new Error('Error leyendo el archivo'));
    reader.readAsText(file);
  });
}

async function loadMusicXmlFile(file, ext) {
  showSplash(true);
  try {
    // 1) Asegurarnos que OSMD + Tone están cargados
    if (typeof opensheetmusicdisplay === 'undefined' || typeof Tone === 'undefined') {
      throw new Error('Las librerías de MusicXML no terminaron de cargar. Esperá unos segundos y volvé a intentar.');
    }
    if (!ensureXmlPlayerInit()) {
      throw new Error('No se pudo inicializar el lector de MusicXML.');
    }

    // 2) Obtener el contenido XML (descomprimir si es .mxl)
    let xmlString;
    if (ext === 'mxl') {
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip no cargó (necesario para .mxl). Probá subir el archivo descomprimido (.musicxml).');
      }
      const buf = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);
      // Buscar el primer .xml/.musicxml que no esté en META-INF/
      let scoreFile = null;
      for (const fname of Object.keys(zip.files)) {
        if (fname.startsWith('META-INF/')) continue;
        if (/\.(xml|musicxml)$/i.test(fname)) {
          scoreFile = zip.files[fname];
          break;
        }
      }
      if (!scoreFile) throw new Error('El archivo .mxl no contiene un score XML reconocible.');
      xmlString = await scoreFile.async('string');
    } else {
      xmlString = await file.text();
    }

    // 3) Validación básica
    const hasPartwise = xmlString && xmlString.includes('<score-partwise');
    const hasTimewise = xmlString && xmlString.includes('<score-timewise');
    if (!hasPartwise && !hasTimewise) {
      throw new Error('El archivo no parece un MusicXML válido (no encontré <score-partwise> ni <score-timewise>).');
    }

    // 4) Cargar y renderizar
    currentMode = 'xml';
    await XmlPlayer.load(xmlString);
    XmlPlayer.setTempo(currentTempoPct);

    // 5) Mostrar paper-empty oculto
    $('paper-empty').hidden = true;
  } finally {
    showSplash(false);
  }
}

/* ---------- Resize: re-render para ajustar ancho ---------- */
let resizeTO = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTO);
  resizeTO = setTimeout(() => {
    // En modo xml, OSMD tiene autoResize y se encarga solo.
    if (currentMode === 'abc' && pendingABC) renderPiece(pendingABC);
  }, 180);
});

/* ---------- Arranque ---------- */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
