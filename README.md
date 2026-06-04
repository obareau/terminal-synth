# terminal-synth

Synthé visuel **dark / industriel** — shaders GLSL réactifs au **son** (et bientôt au
**MIDI**), avec un **mode rendu ASCII** (esthétique terminal). Inspiré de *VS — Visual
Synthesizer* (Imaginando). Bras visuel de **ROBOTARIIS**.

**Statut** : MVP · v0.1.0 · Electron + TypeScript + WebGL2

## MVP (présent)

- Fenêtre WebGL2 plein écran rendant un **shader** (3 intégrés : Plasma indus, Tunnel, Scan grid).
- **Audio-réactif** : FFT du micro/carte son → bandes graves/médiums/aigus + niveau → uniforms.
- **Mode ASCII** (toggle) : le rendu est converti en art ASCII (vert sur noir, lueur).
- UI sombre minimale : choix du shader, activation audio, ASCII, plein écran, VU-mètre.

Uniforms exposés aux shaders : `u_time`, `u_resolution`, `u_bass`, `u_mid`, `u_treble`, `u_level`.

## Lancer

```bash
npm install
npm start      # build (esbuild) + lance Electron
```

Clique **🎤 audio** pour autoriser l'entrée son, **ASCII** pour le mode terminal,
**⛶** pour le plein écran.

## Structure

```
src/
  main.ts              # process principal Electron (fenêtre, permissions audio/MIDI)
  renderer/
    index.html         # UI sombre (canvas + <pre> ASCII + barre)
    renderer.ts        # glue : WebGL + audio + UI + boucle
    gl.ts              # moteur WebGL2 (shader plein écran + rendu offscreen)
    audio.ts           # Web Audio : FFT → bandes
    ascii.ts           # pixels → art ASCII
    shaders.ts         # shaders intégrés (fonction render(uv, res))
build.ts               # bundle esbuild (main = node, renderer = browser) + copie html
```

## Roadmap (idées)

- **MIDI-in** (Web MIDI) : notes/CC → uniforms ; recevoir de Live / BANG!.
- **Ableton Link** / sync tempo.
- **Presets** + multi-couches (blend de shaders).
- **Support ISF** (bibliothèque de shaders ouverts) + import Shadertoy.
- **Export** : vidéo (`MediaRecorder` / rendu offline → ffmpeg) + *asciicast* pour le mode terminal.
- **Glyph atlas** pour un ASCII plus rapide/coloré ; sortie **Spout/NDI** (VJ).
- Bascule moteur **natif Rust** (`wgpu` + `cpal` + `midir`) si besoin de perf VJ.
