# Terminal-Synth

> **Synthétiseur visuel dark/industriel** avec génération automatique de compositions, audio-réactivité temps réel, et rendu WebGL2 haute-performance.

![Status](https://img.shields.io/badge/status-Alpha-yellow)
![Version](https://img.shields.io/badge/version-0.9.9--alpha-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20|%20macOS%20|%20Linux-blueviolet)

Terminal-Synth est un visualiseur audio conçu pour les performances visuelles en temps réel. Intègre **~90 générateurs minimalistes**, **23 perturbateurs audio-réactifs**, automation générative avec 4 presets, couche texte pixellisée, et système d'enregistrement vidéo.

Bras visuel de **ROBOTARIIS** — univers SF d'Olivier (ex-ROBOTANS).

---

## 🚀 Quick Start

### Windows (Executable)
1. Télécharge `terminal-synth-0.9.5.exe` depuis [Releases](https://github.com/obareau/terminal-synth/releases)
2. Lance directement (pas d'installation)
3. Autorise l'accès audio quand demandé

### macOS / Linux (Build from Source)
```bash
git clone https://github.com/obareau/terminal-synth.git
cd terminal-synth
npm install
npm start          # Mode dev avec hot-reload
npm run package    # Build production
```

**Prérequis**: Node.js 18+, npm 8+

---

## ✨ Caractéristiques

### 🎨 Rendu Visuel
| Feature | Details |
|---------|---------|
| **~90 Générateurs** | Réseaux de nœuds, systèmes orbitaux, géométrie minimaliste, fractals, noise |
| **6 Catégories** | All, Text, Plasma, Geometry, Noise, Interactive |
| **23 Perturbateurs** | Audio-triggered effects (ripple, twist, glitch, zoom, aberration, etc.) |
| **Esthétique** | Minimaliste Domestika, monochrome noir/blanc, design épuré |
| **WebGL2 Pipeline** | Multi-pass ping-pong avec framebuffers |
| **Modes de Fusion** | 11 blend modes (Normal, Add, Screen, Overlay, etc.) |

### 🎵 Audio & MIDI
| Feature | Details |
|---------|---------|
| **FFT Analysis** | Bass, Mid, Treble, Level en temps réel |
| **BPM Sync** | Timing mesuré (mesures = 4 beats) |
| **Audio Reactive** | Effets + perturbateurs déclenchés par l'audio |
| **MIDI Input** | Clavier MIDI + contrôleurs |
| **System Audio** | Loopback + microphone |

### 🌀 Automation Générative (v0.9.5)
| Preset | Behavior |
|--------|----------|
| **Gentle** | 16-32 mesures, changements lents, smooth |
| **Chaotic** | 4-12 mesures, rapide, agressif |
| **Psycho** | 2-8 mesures, ultra-rapide, chaos |
| **Glitch** | 8-16 mesures, focus effets/perturbateurs |

**Génération Avancée**:
- Boucles génératives avec mutation + drift
- Snapshots & historique (50 états max)
- Undo/Redo complet
- Export/Import sessions JSON

### 📝 Couche Texte Pixellisée
- Police géante configurable (10-200%)
- Liste de mots aléatoire
- Pixellisation 1-64px
- Réactif aux effets (CSS filters)
- Audio-réactif (position + wobble)
- Apparition/disparition aléatoire (2-3 boucles)

### 🎮 Interface
| Element | Shortcut | Details |
|---------|----------|---------|
| **Mode ASCII** | `X` | Rendu texte haute-densité avec glitch |
| **Plein Écran** | `F` | Immersif |
| **Audio Toggle** | `A` | On/off |
| **MIDI Toggle** | `M` | On/off |
| **Autoplay** | `Ctrl+A` | 4 presets (toggleable) |
| **Record** | `Ctrl+R` | WebM video |
| **Undo/Redo** | `Ctrl+Z/Y` | Snapshots |

**Sélection Générateur**: `1-9`, `q-p`, `a-k` (39 total)

---

## 🎮 Utilisation

### Mode Dev
```bash
npm start              # Electron + esbuild watch
npm run dev            # Alias
npm run test:watch     # Tests live
```

### Build Production
```bash
npm run package        # Windows portable .exe
npm run package:mac    # macOS
npm run package:linux  # Linux
```

### Enregistrement Vidéo
1. Click **⏺** (record button) ou `Ctrl+R`
2. L'enregistrement démarre
3. Re-click ou `Ctrl+R` pour arrêter
4. Sauvegarde `.webm` dans répertoire dialog

### Export Sessions
```
Ctrl+A     → Start autoplay (presets, toggleable)
Ctrl+S     → Save preset JSON
Ctrl+O     → Load preset JSON
Ctrl+Z/Y   → Undo/Redo snapshots
```

---

## 🏗️ Architecture

### Stack
```
Electron 34
├── TypeScript 5.7
├── WebGL2 (GLSL ES 3.00)
├── Web Audio API (FFT)
└── esbuild + electron-builder
```

### Fichiers Clés
```
src/renderer/
├── gl.ts              ✓ Pipeline WebGL (multi-pass, effects chain)
├── shaders.ts         ✓ 37 générateurs GLSL ES 3.00
├── effects.ts         ✓ 31 effets post-process
├── disruptors.ts      ✓ 17 perturbateurs audio-réactifs
├── autoplayAdvanced.ts ✓ Génération automatique + 4 presets
├── textLayer.ts       ✓ Couche texte pixellisée
├── audio.ts           ✓ FFT + audio input
├── ascii.ts           ✓ ASCII glitch multicolore
├── midi.ts            ✓ MIDI input handler
└── renderer.ts        ✓ Event loop + UI glue
```

### Générateurs (37)
**Géométrie**: Cercle, Carré, Triangle, Hexagone, Penrose, Lissajous, Rose, Dragon  
**Fractals**: Mandelbrot, Julia, Sierpinski, Hilbert  
**Noise**: Perlin, Simplex, Worley, Voronoi  
**Organics**: Butterfly, Attractor, Pendule, Vortex, Tourbillon  
**Autres**: Kaleidoscope, Halftone, Grid, Wave, Spiral

### Effets (31)
**Feedback**: Entropie, Feedback, Slit Scan, Glitch  
**Distortion**: Fisheye, Onde, Datamosh, Glitch Rows  
**Color**: Invert, Hue, Thermal, Neon, Posterize Dither  
**Dither**: Floyd-Steinberg dithering  
**Rotation**: Continuous Rotate CW/CCW, Rotate  
**Textures**: Grain, Scanlines, Glow Edges, Kuwahara  
**Flip**: Flip Horizontal/Vertical (miroir X/Y)  
**Autres**: Pixelate, Wave Spiral, Scanlines Distort

### Perturbateurs (17)
**Audio Triggers**: Déchirure, Dropout, Strobe, Corrupt, Tremor  
**Visual**: Phosphore, Flicker, Shatter, Bloom Burst, Glitch Rows  
**Glitch**: Flip Horizontal/Vertical, Mosaic Burst  
**Advanced**: Spin Vortex, Psycho Shift, Displacement Storm

---

## 🧪 Tests

```bash
npm test              # Run 36 tests once
npm run test:watch    # Watch mode
```

**Coverage**: Générateurs, effets, perturbateurs, audio, BPM sync

---

## 📺 Rendu ASCII

**Mode ASCII** (`X`):
- Caractères variés avec incrustation semi-transparente
- Glitch multicolore subtil (~2% des chars)
- Opacité réduite pour discrétion
- Centré et dynamique

---

## 🎬 Export Video

### WebM (Recommandé)
- ✓ Natif Electron
- ✓ Codec VP8
- ✓ Haute qualité
- ✓ Petite taille
- Sauvegarde directe dans dialog

---

## 🌌 Univers ROBOTARIIS

Terminal-Synth est le **bras visuel** de ROBOTARIIS — univers SF d'Olivier.

| Concept | Description |
|---------|-------------|
| **Calendrier de la Rectitude** | Timing cosmique + structures éphémériques |
| **AZA Sessions** | Sessions longues auto-générative |
| **Factions** | Couleurs + personnalités (Vortex, Flux, Écho, etc.) |
| **Langue de Combat** | Palette sonore + glyphes éphémériques |

Générateurs, effets, perturbateurs = **tactiques Recta** (combat visuel).

---

## 📋 Licence

**MIT** — Libre pour usage créatif & commercial.

---

## 👨‍💻 Crédits

**Développeur**: Olivier Bareau

**Tech Stack**:
- Electron 34 + TypeScript 5.7
- WebGL2 + GLSL ES 3.00
- Web Audio API (FFT)
- esbuild + electron-builder
- Jest + ts-jest (testing)

**Inspirations**: VS (Visual Synthesizer) par Imaginando

---

**v0.9.5** · WebGL2 · 37 Generators · 31 Effects · Generative Automation  
*The ultimate dark industrial visual synthesizer*
