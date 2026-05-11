/* ========================================================================
   xml-player.js — Motor de partituras MusicXML
   ----------------------------------------------------------------------
   - Renderizado: OpenSheetMusicDisplay (OSMD)
   - Audio:       Tone.Sampler con muestras de piano Salamander
                  (las mismas que usan apps de pago para sonar real)
   - Sincronía:   Tone.Transport schedule + Tone.Draw para el cursor
   - Eventos:     llamamos onNote(notesArray) y onFinished() para que
                  el teclado visual se ilumine igual que con abcjs.

   API global:
     XmlPlayer.init(paperEl)
     XmlPlayer.load(xmlString)   // async
     XmlPlayer.togglePlay()      // async
     XmlPlayer.restart()         // async
     XmlPlayer.stop()
     XmlPlayer.setTempo(pct)
     XmlPlayer.setNoteCallback(cb)
     XmlPlayer.setFinishedCallback(cb)
     XmlPlayer.setStartCallback(cb)
     XmlPlayer.isReady()         // true si hay timeline cargado
     XmlPlayer.isPlaying()
   ======================================================================== */
(function () {
  // Muestras del piano Salamander Grand alojadas por Tone.js (CDN gratuito)
  const SAMPLER_URLS = {
    A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', A1: 'A1.mp3',
    C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', A2: 'A2.mp3',
    C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3',
    C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', A4: 'A4.mp3',
    C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', A5: 'A5.mp3',
    C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', A6: 'A6.mp3',
    C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', A7: 'A7.mp3',
    C8: 'C8.mp3'
  };
  const SAMPLER_BASE = 'https://tonejs.github.io/audio/salamander/';

  // Estado
  let osmd = null;
  let sampler = null;
  let timeline = [];          // [{ timeQuarters, notes:[{midi,durQuarters}] }]
  let baseBpm = 100;
  let totalSeconds = 0;
  let tempoFactor = 1.0;
  let onNoteCb = null;
  let onFinishedCb = null;
  let onStartCb = null;

  /* ---------- Utilidades de pitch ---------- */
  function noteToMidi(note) {
    if (!note || !note.Pitch) return null;
    // Camino A: si OSMD expone frequency (Hz)
    if (typeof note.Pitch.frequency === 'number' && note.Pitch.frequency > 0) {
      return Math.round(12 * Math.log2(note.Pitch.frequency / 440) + 69);
    }
    // Camino B: reconstruir desde FundamentalNote + Octave + alter
    const semitones = [0, 2, 4, 5, 7, 9, 11];
    const fund = note.Pitch.FundamentalNote;
    const oct = note.Pitch.Octave;
    const alter = note.Pitch.AccidentalHalfTones || 0;
    if (typeof fund === 'number' && typeof oct === 'number') {
      return 12 * (oct + 1) + semitones[fund] + alter;
    }
    return null;
  }

  function isRestNote(note) {
    if (!note) return true;
    if (note.isRest === true) return true;
    if (typeof note.isRest === 'function') {
      try { if (note.isRest()) return true; } catch (e) {}
    }
    if (note.Pitch === undefined || note.Pitch === null) return true;
    if (note.PrintObject === false) return true;
    return false;
  }

  /* ---------- Inicialización ---------- */
  function init(paperEl) {
    if (typeof opensheetmusicdisplay === 'undefined') {
      console.error('OSMD no está cargado');
      return false;
    }
    if (typeof Tone === 'undefined') {
      console.error('Tone.js no está cargado');
      return false;
    }
    if (osmd) return true;
    osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(paperEl, {
      backend: 'svg',
      autoResize: true,
      drawTitle: true,
      drawComposer: true,
      drawCredits: false,
      drawPartNames: false,
      drawMeasureNumbers: true,
      cursorsOptions: [{ type: 0, color: '#d9531e', alpha: 0.55, follow: true }]
    });
    return true;
  }

  async function ensureSampler() {
    if (sampler) return;
    await Tone.start(); // requiere user gesture
    sampler = new Tone.Sampler({
      urls: SAMPLER_URLS,
      baseUrl: SAMPLER_BASE,
      release: 1.0,
      attack: 0.005
    }).toDestination();
    sampler.volume.value = -6; // un toque más suave
    await Tone.loaded(); // espera todas las muestras
  }

  /* ---------- Cargar partitura MusicXML ---------- */
  async function load(xmlString) {
    if (!osmd) throw new Error('XmlPlayer no inicializado');
    // Para del transport por si había algo sonando
    stop();
    await osmd.load(xmlString);
    osmd.render();
    // Recorremos el cursor para armar el timeline; lo ocultamos antes para
    // que no se vea "saltando" por toda la partitura durante el cálculo.
    try { osmd.cursor.hide(); } catch (e) {}
    osmd.cursor.reset();
    buildTimeline();
    osmd.cursor.reset();
    osmd.cursor.show();
  }

  /* ---------- Construir timeline desde el cursor de OSMD ---------- */
  function buildTimeline() {
    timeline = [];
    // BPM por defecto desde la partitura, o 100 si no hay
    let bpmRaw = null;
    if (osmd.Sheet) {
      bpmRaw = osmd.Sheet.DefaultStartTempoInBpm
        || osmd.Sheet.UserStartTempoInBPM
        || osmd.Sheet.HasBPMInfo && osmd.Sheet.DefaultStartTempoInBpm;
    }
    baseBpm = (typeof bpmRaw === 'number' && bpmRaw > 20 && bpmRaw < 300) ? bpmRaw : 100;

    osmd.cursor.reset();
    let elapsedQuarters = 0;
    let safetyCounter = 0;
    const SAFETY_MAX = 10000;

    while (!osmd.cursor.iterator.EndReached && safetyCounter < SAFETY_MAX) {
      safetyCounter++;
      const voiceEntries = osmd.cursor.iterator.CurrentVoiceEntries || [];
      const notesAtStop = [];
      let minDuration = Infinity;

      for (const ve of voiceEntries) {
        const notes = ve.Notes || ve.notes || [];
        for (const note of notes) {
          let lenQuarters = 0;
          if (note.Length && typeof note.Length.RealValue === 'number') {
            lenQuarters = note.Length.RealValue * 4;
          }
          if (lenQuarters > 0 && lenQuarters < minDuration) {
            minDuration = lenQuarters;
          }
          if (!isRestNote(note)) {
            const midi = noteToMidi(note);
            // rango piano: A0 (21) a C8 (108)
            if (midi !== null && midi >= 21 && midi <= 108) {
              notesAtStop.push({ midi, durQuarters: lenQuarters });
            }
          }
        }
      }

      timeline.push({ timeQuarters: elapsedQuarters, notes: notesAtStop });

      if (!isFinite(minDuration) || minDuration <= 0) minDuration = 1;
      elapsedQuarters += minDuration;
      try { osmd.cursor.next(); } catch (e) { break; }
    }

    totalSeconds = elapsedQuarters * (60 / baseBpm);
    osmd.cursor.reset();
  }

  /* ---------- Convertir índice de evento a segundos (en el bpm actual) ---------- */
  function eventTimeSec(index) {
    const ev = timeline[index];
    if (!ev) return 0;
    const tBase = (ev.timeQuarters * 60) / baseBpm;
    return tBase / tempoFactor;
  }

  /* ---------- Encontrar el índice de evento más cercano a un tiempo (seg) ---------- */
  function indexAtSec(sec) {
    let idx = 0;
    for (let i = 0; i < timeline.length; i++) {
      if (eventTimeSec(i) > sec) { idx = Math.max(0, i - 1); return idx; }
      idx = i;
    }
    return idx;
  }

  /* ---------- Reagendar desde un índice (común a play y seek) ---------- */
  function scheduleFromIndex(startIndex) {
    Tone.Transport.cancel();
    for (let i = startIndex; i < timeline.length; i++) {
      const event = timeline[i];
      const tNow = eventTimeSec(i);
      // Solo agendar los eventos del futuro relativo al inicio (ya seteamos Transport.seconds)
      Tone.Transport.schedule((time) => {
        // 1) Audio
        if (sampler) {
          event.notes.forEach((n) => {
            const freq = Tone.Frequency(n.midi, 'midi').toFrequency();
            const durSec = Math.max(
              0.08,
              (n.durQuarters * 60) / Math.max(1, Tone.Transport.bpm.value)
            );
            try { sampler.triggerAttackRelease(freq, durSec, time); } catch (e) {}
          });
        }
        // 2) Visual: avanza cursor + ilumina teclado
        Tone.Draw.schedule(() => {
          if (i > startIndex) {
            try { osmd.cursor.next(); } catch (e) {}
          }
          if (onNoteCb) onNoteCb(event.notes);
        }, time);
      }, tNow);
    }

    // Final
    const totalNow = totalSeconds / tempoFactor + 0.4;
    Tone.Transport.scheduleOnce((time) => {
      Tone.Draw.schedule(() => {
        Tone.Transport.stop();
        if (onFinishedCb) onFinishedCb();
      }, time);
    }, totalNow);
  }

  /* ---------- Posicionar cursor OSMD en un índice de evento ---------- */
  function positionCursorAtIndex(index) {
    try {
      osmd.cursor.reset();
      for (let i = 0; i < index; i++) {
        osmd.cursor.next();
      }
    } catch (e) { /* ignorar */ }
  }

  /* ---------- Reproducción ---------- */
  async function play() {
    if (!timeline.length) return;
    await ensureSampler();

    // Limpiar Transport y resetear cursor
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    Tone.Transport.bpm.value = baseBpm * tempoFactor;

    try { osmd.cursor.reset(); } catch (e) {}

    scheduleFromIndex(0);

    await Tone.Transport.start();
    if (onStartCb) onStartCb();
  }

  /* ---------- Seek: avanzar/retroceder unos segundos ---------- */
  function seek(deltaSec) {
    if (!timeline.length) return;
    const wasStarted = Tone.Transport.state === 'started';
    Tone.Transport.pause();
    if (sampler) { try { sampler.releaseAll(); } catch (e) {} }

    const currentSec = Tone.Transport.seconds;
    const maxSec = totalSeconds / tempoFactor;
    const newSec = Math.max(0, Math.min(maxSec - 0.1, currentSec + deltaSec));

    // Encontrar índice del evento más cercano al nuevo tiempo
    const newIndex = indexAtSec(newSec);
    const alignedSec = eventTimeSec(newIndex);

    // Reagendar y mover cursor + Transport
    scheduleFromIndex(newIndex);
    positionCursorAtIndex(newIndex);
    Tone.Transport.seconds = alignedSec;

    if (wasStarted) Tone.Transport.start();
  }

  function pauseInternal() {
    Tone.Transport.pause();
    if (sampler) {
      try { sampler.releaseAll(); } catch (e) {}
    }
  }

  function resumeInternal() {
    Tone.Transport.start();
  }

  async function togglePlay() {
    if (!timeline.length) return;
    const state = Tone.Transport.state;
    if (state === 'started') {
      pauseInternal();
    } else if (state === 'paused') {
      resumeInternal();
    } else {
      await play();
    }
  }

  async function restart() {
    stop();
    await play();
  }

  function stop() {
    if (typeof Tone === 'undefined') return;
    Tone.Transport.stop();
    Tone.Transport.cancel();
    if (sampler) {
      try { sampler.releaseAll(); } catch (e) {}
    }
    if (osmd) {
      try { osmd.cursor.reset(); } catch (e) {}
    }
  }

  function setTempo(pct) {
    tempoFactor = (parseInt(pct, 10) || 100) / 100;
    if (typeof Tone !== 'undefined' && Tone.Transport) {
      Tone.Transport.bpm.value = baseBpm * tempoFactor;
    }
    // Nota: las notas ya programadas usan el bpm de Transport al disparar, así
    // que el cambio de tempo se siente en el tiempo entre notas siguientes y en
    // las duraciones que calculamos en cada schedule callback.
  }

  function setNoteCallback(cb) { onNoteCb = cb; }
  function setFinishedCallback(cb) { onFinishedCb = cb; }
  function setStartCallback(cb) { onStartCb = cb; }
  function isReady() { return timeline.length > 0; }
  function isPlaying() {
    return typeof Tone !== 'undefined' && Tone.Transport.state === 'started';
  }

  window.XmlPlayer = {
    init, load, togglePlay, restart, stop, setTempo, seek,
    setNoteCallback, setFinishedCallback, setStartCallback,
    isReady, isPlaying
  };
})();
