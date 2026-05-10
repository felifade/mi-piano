# Mi Piano 🎼

App web (PWA) que muestra partituras y las reproduce con sonido de piano acústico real.
Pensada para iPad pero funciona en cualquier navegador moderno.

🔗 **En vivo:** https://felifade.github.io/mi-piano/

## Cómo instalarlo en el iPad

1. Abrir **Safari** y entrar a `https://felifade.github.io/mi-piano/`
2. Tocar el botón **Compartir** (cuadrito con flecha hacia arriba)
3. Tocar **«Añadir a pantalla de inicio»**
4. Aparece como app con ícono propio, pantalla completa, sin barra del navegador.

## Qué incluye

- **6 piezas listas** (Estrellita, Himno de la Alegría, Martinillo, Minueto en Sol de Bach, Para Elisa, Arroz con leche) — dominio público.
- **Reproducción con piano sampleado** (no MIDI sintético: usa el mismo soundfont que apps de pago).
- **Cursor que sigue la nota** en tiempo real, resaltada en color ámbar.
- **Control de velocidad** 40 % – 160 % sin cambiar el tono.
- **Subir tus propias partituras** en formato `.abc`. Bibliotecas gratis:
  - https://abcnotation.com/ (búsqueda gigante, formato ABC)
  - https://www.mutopiaproject.org/ (clásicos, también ABC)

## Cómo funciona por dentro

| Pieza | Herramienta |
|---|---|
| Renderizado de partitura | `abcjs` 6.4 (SVG, profesional) |
| Audio | `abcjs.synth` + soundfont MIDI-JS (piano acústico) |
| Cursor sincronizado | `cursorControl.onEvent` de abcjs |
| Instalable | PWA estándar (`manifest.webmanifest` + `apple-touch-icon`) |
| Offline | El HTML/CSS/JS y los soundfonts quedan en caché del navegador tras la primera carga |

No hay backend. Es 100 % estático: push a este repo → GitHub Pages deploya automáticamente.

## Probar localmente

```bash
python3 -m http.server 8090
# abrir http://localhost:8090
```

## Próximos pasos sugeridos

- Soporte para MusicXML (cargar partituras descargadas de MuseScore.com)
- Anotar con Apple Pencil sobre la partitura
- Pasar página automáticamente al llegar al final del sistema visible
- Modo "lección": loopear un compás específico hasta que salga bien
- Mostrar las notas en pentagrama + en letras grandes abajo (Do, Re, Mi…)
