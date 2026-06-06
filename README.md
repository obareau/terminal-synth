# terminal-synth

Synthé visuel **dark / industriel** — shaders GLSL réactifs au **son** (et bientôt au
**MIDI**), avec un **mode rendu ASCII** (esthétique terminal). Inspiré de *VS — Visual
Synthesizer* (Imaginando). Bras visuel de **ROBOTARIIS**.

**Statut** : MVP · v0.1.0 · Electron + TypeScript + WebGL2

## v0.1.0 Highlights

### Visuals & Effects
- **26+ GLSL generators** with full real-time parameter control (u_p0-p3 uniforms)
- **Floyd-Steinberg dithering effect** for ordered color quantization
- **11 blend modes** for layer composition (Normal, Add, Multiply, Screen, Overlay, Darken, Lighten, Difference, Divide, Hard Light, XOR)
- **6 perturbators** (audio-triggered glitch effects): Déchirure, Dropout, Strobe, Corrupt, Tremor, Phosphore
- **Terrain (Joy Division)** completely rewritten to match Unknown Pleasures album cover visual
- **ASCII mode** with adjustable character density

### Audio & MIDI
- Real-time FFT analysis (bass, mid, treble, level)
- System loopback audio input + microphone support
- MIDI input for generative control (organ/noise modes)

### UI & Workflow
- **3-column professional layout** (sources, canvas, effects/perturbators)
- **Keyboard shortcuts**: 1-9/q-p/a-k for source selection, Tab for focus mode
- **Layer system**: A (primary) + B (secondary) with blend mode and opacity
- **RECTA TUI overlay**: terminal-style metadata transmission
- **Preset system**: save/load (JSON-based)
- **Video export**: WebM codec with audio track

## Installation

### Windows (Pre-Built Executable)

1. Download `terminal-synth 0.1.0.exe` from [Releases](https://github.com/obareau/terminal-synth/releases)
2. Run directly (no installation needed)
3. Grant audio/MIDI permissions when prompted

Path after download: `C:\Users\[YourUsername]\Downloads\terminal-synth 0.1.0.exe`

### macOS & Linux (Build from Source)

```bash
git clone https://github.com/obareau/terminal-synth.git
cd terminal-synth
npm install
npm run package
# Executable in: ./release/
```

## Lancer (Development)

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

## Roadmap

**Fait**
- Audio-réactif sur la **sortie système Windows** (loopback) ou micro ; vues **FFT bars** / **Waveform**.
- **Pipeline** d'effets chaînés (entropie → feedback → glitch → filtre).
- **Plein écran** natif (⛶ / F, Échap pour sortir).
- **MIDI-in (contrôle)** + 2 modes de jeu : **Orgue** (dark ambient, soutenu) / **Noise** (percussif).

**En cours / suite**
- **Générateurs polyphoniques** : N passes générateur empilées (notes tenues = calques),
  vélocité = brillance, aftertouch = modulation ; blend additif.
- **Mapping MIDI complet** : zone basse = effets (note+aftertouch), zone médium = générateurs.
- **Overlay texte** (lore ROBOTARIIS — « tactiques Recta »), style terminal/glitch.
- **Lecture de fichier MIDI** pour séquencer les visuels.
- **Export** vidéo (`MediaRecorder` → ffmpeg) + *asciicast* (easter-egg).

**Plus tard**
- Support **ISF** + import Shadertoy ; **presets** de chaîne ; sortie **Spout/NDI** (VJ) ;
  bascule moteur **natif Rust** si besoin de perf.
