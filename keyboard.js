/* ========================================================================
   Piano Keyboard — SVG visual de 3 octavas con teclas que se iluminan
   con cada nota tocada. Rango fijo: C3 (MIDI 48) a B5 (MIDI 83) — cubre
   toda la música de principiante/intermedio.

   API global:
     PianoKeyboard.init(containerEl)
     PianoKeyboard.lightKey(midi, on)
     PianoKeyboard.clearAll()
   ======================================================================== */
(function () {
  const LOW = 48;   // C3
  const HIGH = 83;  // B5
  const WHITE_W = 24;
  const WHITE_H = 100;
  const BLACK_W = 14;
  const BLACK_H = 64;
  const WHITE_SEMITONES = new Set([0, 2, 4, 5, 7, 9, 11]);
  const NS = 'http://www.w3.org/2000/svg';

  let svgEl = null;
  const litKeys = new Set();

  const isWhite = (midi) => WHITE_SEMITONES.has(((midi % 12) + 12) % 12);

  function svg(name, attrs) {
    const el = document.createElementNS(NS, name);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function init(containerEl) {
    containerEl.innerHTML = '';
    const root = svg('svg', {
      preserveAspectRatio: 'xMidYMax meet',
      class: 'piano-svg',
      'aria-hidden': 'true'
    });
    root.classList.add('piano-svg');

    // Defs: sombras y gradientes para aspecto pulido
    const defs = svg('defs', {});
    defs.innerHTML = `
      <linearGradient id="whiteGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fffdf6"/>
        <stop offset="92%" stop-color="#f6e9cb"/>
        <stop offset="100%" stop-color="#c4b89a"/>
      </linearGradient>
      <linearGradient id="blackGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a2e1e"/>
        <stop offset="60%" stop-color="#1a140c"/>
        <stop offset="100%" stop-color="#0d0a06"/>
      </linearGradient>
      <linearGradient id="litWhiteGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffc879"/>
        <stop offset="100%" stop-color="#d9531e"/>
      </linearGradient>
      <linearGradient id="litBlackGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff944d"/>
        <stop offset="100%" stop-color="#a83b08"/>
      </linearGradient>
    `;
    root.appendChild(defs);

    // Capa de blancas (atrás)
    let whiteIdx = 0;
    const whiteIndexByMidi = {};
    for (let m = LOW; m <= HIGH; m++) {
      if (isWhite(m)) {
        const x = whiteIdx * WHITE_W;
        const rect = svg('rect', {
          x: x + 0.5,
          y: 0,
          width: WHITE_W - 1,
          height: WHITE_H,
          rx: 2,
          'data-midi': m,
          class: 'key white',
          fill: 'url(#whiteGrad)'
        });
        root.appendChild(rect);

        // Etiqueta "C3", "C4", "C5" sobre los Do
        if (m % 12 === 0) {
          const text = svg('text', {
            x: x + WHITE_W / 2,
            y: WHITE_H - 8,
            'text-anchor': 'middle',
            class: 'octave-label'
          });
          text.textContent = 'C' + (Math.floor(m / 12) - 1);
          root.appendChild(text);
        }
        whiteIndexByMidi[m] = whiteIdx;
        whiteIdx++;
      }
    }

    // Capa de negras (encima)
    for (let m = LOW; m <= HIGH; m++) {
      if (!isWhite(m)) {
        // La negra va justo entre dos blancas: posicionar al borde derecho de la blanca previa
        let prevWhiteX = 0;
        for (let prev = m - 1; prev >= LOW; prev--) {
          if (isWhite(prev)) {
            prevWhiteX = whiteIndexByMidi[prev] * WHITE_W;
            break;
          }
        }
        const x = prevWhiteX + WHITE_W - BLACK_W / 2;
        const rect = svg('rect', {
          x: x,
          y: 0,
          width: BLACK_W,
          height: BLACK_H,
          rx: 2,
          'data-midi': m,
          class: 'key black',
          fill: 'url(#blackGrad)'
        });
        root.appendChild(rect);
      }
    }

    const totalWidth = whiteIdx * WHITE_W;
    root.setAttribute('viewBox', `0 0 ${totalWidth} ${WHITE_H}`);

    containerEl.appendChild(root);
    svgEl = root;
  }

  function lightKey(midi, on) {
    if (!svgEl) return;
    if (midi < LOW || midi > HIGH) return;
    const el = svgEl.querySelector(`[data-midi="${midi}"]`);
    if (!el) return;
    if (on) {
      el.classList.add('lit');
      // Cambiar fill según si es blanca o negra
      const isBlackKey = el.classList.contains('black');
      el.setAttribute('fill', isBlackKey ? 'url(#litBlackGrad)' : 'url(#litWhiteGrad)');
      litKeys.add(midi);
    } else {
      el.classList.remove('lit');
      const isBlackKey = el.classList.contains('black');
      el.setAttribute('fill', isBlackKey ? 'url(#blackGrad)' : 'url(#whiteGrad)');
      litKeys.delete(midi);
    }
  }

  function clearAll() {
    if (!svgEl) return;
    [...litKeys].forEach((midi) => lightKey(midi, false));
    litKeys.clear();
  }

  window.PianoKeyboard = { init, lightKey, clearAll };
})();
