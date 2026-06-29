# Terminal-Synth

> **Synthétiseur visuel dark/industriel** — outil de performance live solo, piloté par Adaptive Autoplay, rendu WebGL2 audio-réactif.

![Status](https://img.shields.io/badge/status-Feature%20Freeze%20%2F%20Stable-brightgreen)
![Version](https://img.shields.io/badge/version-1.9.7-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20|%20macOS%20|%20Linux-blueviolet)

Terminal-Synth est un visualiseur audio pensé pour un **performeur solo** : pas de séquenceur, pas de MIDI Learn — l'**Adaptive Autoplay** pilote le show en réagissant à la musique (BPM, énergie, onsets), et le performeur supervise/influence en direct.

Intègre **117 générateurs** (dont 20 Industrial monochrome), **47 effets post-process**, **36 perturbateurs audio-réactifs**, **Industrial Mode** (post-process N&B + dither, 4 palettes : B&W / Phosphor / Blueprint / Sepia), **détection BPM** (spectral flux + autocorrélation), **effets beat-réactifs** (pulse, glitch et disruptors synchronisés au tempo), **Master Brightness** audio-réactif, **cap de stages** réglable en live, **Auto-Perf** (dégradation graduée des perfs), couche texte pixellisée, mode ASCII, et export vidéo WebM.

Bras visuel de **ROBOTARIIS** — univers SF d'Olivier (ex-ROBOTANS).

---

![Terminal-Synth in Live Performance](assets/screenshots/hero-performance.png)

---

## 🚀 Quick Start

### Linux (Debian/Ubuntu)
```bash
# Download and install .deb package
sudo dpkg -i terminal-synth_1.9.1_amd64.deb
terminal-synth
```

### Windows (Executable)
1. Download `terminal-synth_1.9.1.exe` from [Releases](https://github.com/obareau/terminal-synth/releases)
2. Run directly (no installation needed)
3. Grant audio access when prompted

### macOS / Build from Source
```bash
git clone https://github.com/obareau/terminal-synth.git
cd terminal-synth
npm install
npm start              # Dev mode with hot-reload
npm run package:mac    # Build for macOS
npm run package:deb    # Build .deb for Linux
npm run package        # Build Windows .exe
```

**Requirements**: Node.js 18+, npm 8+

---

## ✨ Caractéristiques

### 🎨 Rendu Visuel
| Feature | Details |
|---------|---------|
| **117 Générateurs** | Géométrie, plasma, noise, fractals, organics, Industrial monochrome |
| **47 Effets** | Post-process audio-réactif (feedback, glitch, distortion, color, dither...) |
| **Effect Sequencer** | Syntaxe DNA BPM-synced : `FDB*4, GLT?50, VHS*2+ABR, <NEO*4 ZOM*4>` |
| **36 Perturbateurs** | Glitches déclenchés par l'audio (dropout, strobe, shatter, vortex...) |
| **WebGL2 Pipeline** | Multi-pass ping-pong avec framebuffers |
| **Modes de Fusion** | Blend modes (Normal, Add, Screen, Overlay, etc.) |
| **Layer B** | Second générateur superposable avec opacité réglable |
| **Stage Cap** | Limite le nombre de stages actifs en simultané (réglable en live) |

### ⬛ Industrial Mode (v1.7)
| Feature | Details |
|---------|---------|
| **20 Générateurs Industrial** | Monochrome, esthétique brute/glitch |
| **Post-Process N&B** | Dither IGN (Interleaved Gradient Noise) |
| **4 Palettes** | B&W / Phosphor / Blueprint / Sepia (cycle via bouton) |
| **12 Disruptors Industrial** | Perturbateurs glitch dédiés |
| **HUD Badge** | Affiche le mode + palette active |
| **Autoplay Restriction** | "Industrial Only" force l'autoplay à puiser dans ce pool |

### 🎼 Adaptive Autoplay & Music Analysis (v1.6 / v1.9 / v1.9.1)
| Feature | Details |
|---------|---------|
| **Music-Reactive Evolution** | Générateurs/effets/perturbateurs changent en sync avec la musique |
| **BPM Detection** | Spectral flux (256 bins FFT) + autocorrélation 5s + interpolation parabolique + correction d'octave |
| **Beat-Reactive Effects** | `u_beat` (sawtooth) + `u_beatEnv` (envelope) disponibles dans tous les shaders ; disruptors beat-sync |
| **Energy Display** | Indicateur temps réel (0-100%) color-coded (vert/jaune/rouge) |
| **Style Classification** | Détecte calm/driving/chaotic/peak |
| **Tap Tempo** | `Shift+T` pour caler le tempo manuellement |
| **4 Presets** | Gentle / Chaotic / Psycho / Glitch — vitesse et intensité des évolutions |
| **Snapshots & Historique** | Undo/Redo (50 états max), export/import sessions JSON |

### ⚡ Auto-Perf (v1.7.4)
| Feature | Details |
|---------|---------|
| **Dégradation Graduée** | L1 réduit le stage cap, L2/L3 réduisent le render scale |
| **Seuils** | Engage si FPS < 50 pendant 5s, récupère si FPS ≥ 58 pendant 10s |
| **Affichage** | Niveau visible dans le meter de performance |

### 🎵 Audio & MIDI
| Feature | Details |
|---------|---------|
| **FFT Analysis** | Bass, Mid, Treble, Level en temps réel |
| **System Audio** | Loopback (monitor) ou microphone — bouton ⚙ pour choisir le périphérique exact |
| **Linux/PipeWire** | Détection automatique (monitor/loopback/moniteur) + picker manuel si ambiguïté |
| **MIDI Input** | Contrôleurs MIDI bruts (pas de MIDI Learn) |

### 💡 Master Brightness (v1.2)
| Feature | Details |
|---------|---------|
| **Audio-Reactive** | Fade to black avec le volume (quasi-noir au silence) |
| **Smooth Fading** | Transitions graduelles via exponential moving average |
| **Slider Control** | Amplitude ajustable (100% → 200% brightness at peak) |
| **Power Curve** | Mapping exponentiel pour effet dramatique aux bas niveaux |
| **Keyboard Shortcut** | `B` pour toggle |
| **Perfect For** | Fade-in/fade-out musicaux, transitions début/fin morceaux |

### 🌈 Light/Dark Theme Toggle
| Feature | Details |
|---------|---------|
| **Toggle** | Press `T` (hors focus mode) ou bouton ☀ dans la topbar |
| **Persistence** | Préférence sauvegardée en localStorage |

### 📝 Couche Texte Pixellisée
- Police géante configurable (10-200%)
- Liste de mots aléatoire
- Pixellisation 1-64px
- Réactif aux effets (CSS filters) et à l'audio (position + wobble)
- Apparition/disparition aléatoire

### 🎛 Effect Sequencer (v1.9.5)

Séquenceur d'effets BPM-synced. Accessible dans le panel gauche → onglet **Controls** → champ **SEQ** au-dessus de la liste d'effets.

**Syntaxe :**
```
FDB*4, GLT?50, VHS*2+ABR, <NEO*4 ZOM*4>
```
- `ID*N` — effet ON pendant N beats, puis off → step suivant
- `ID?P` — probabilité P% de déclencher le step
- `A+B` — effets simultanés dans le même step
- `<A B C>` — alternance : cycle parmi les options à chaque passage
- Entrée ou ▶ pour lancer, ■ pour stopper

**Abréviations des 47 effets :**

| ID | Effet | ID | Effet | ID | Effet |
|----|-------|----|-------|----|-------|
| `ENT` | Entropie | `FDB` | Feedback | `GLT` | Glitch |
| `FLT` | Filtre | `INV` | Invert | `GRN` | Grain |
| `NEO` | Neon | `OND` | Onde | `FSH` | Fisheye |
| `HUE` | Hue | `SCN` | Scanlines | `DTM` | Datamosh |
| `PIX` | Pixelate | `THM` | Thermal | `ZOM` | Zoom |
| `VHS` | VHS | `SEU` | Seuil | `ABR` | Aberration |
| `BLM` | Bloom | `MIR` | Miroir | `DTH` | Dithering |
| `CHR` | Chrono | `KUW` | Kuwahara | `SLT` | Slit Scan |
| `GLW` | Glow Edges | `PDT` | Posterize Dither | `FLD` | Floyd-Steinberg |
| `RCW` | Rotate CW | `RCC` | Rotate CCW | `SCD` | Scanlines Distort |
| `WSP` | Wave Spiral | `NTC` | NTSC Chroma | `CPV` | Composite Video |
| `AGH` | Analog Ghosting | `CBL` | Color Bleed | `LUM` | Luma Separation |
| `RFN` | RF Noise | `ORL` | Orbit Ring Lines | `ONC` | Orbit Nodes Connect |
| `OSP` | Orbit Spiral | `POR` | Pulsing Orbits | `NPL` | Network Pulse |
| `ORN` | Orbital Nodes | `WRN` | Wave Rings | `BWR` | BW Orbital Ring |
| `BWG` | BW Grid Lines | `SBW` | Starfield BW | | |

### 📺 Mode ASCII
- Rendu texte haute-densité avec glitch multicolore subtil
- Toggle via `X`, easter egg overlay permanent via `Alt+A`

---

## 🎮 Interface & Raccourcis

| Touche | Action |
|--------|--------|
| `1-9`, `q-p`, `a-k` | Sélection générateur |
| `A` | Toggle audio |
| `M` | Toggle MIDI |
| `X` | Toggle mode ASCII |
| `T` | Toggle texte (ou thème light/dark hors focus mode) |
| `B` | Master Brightness (fade-to-black audio-réactif) |
| `F` / `F11` | Plein écran |
| `Tab` | Focus mode (canvas plein écran interne) |
| `Escape` | Quitte performance/focus mode, sort du plein écran |
| `Espace` | Force la tactique suivante (RECTA) |
| `Shift+T` | Tap tempo (BPM) |
| `Shift+P` | Performance mode (HUD plein écran) |
| `Shift+O` | Ouvre une fenêtre de sortie (2e écran) ou performance mode |
| `H` | Toggle HUD (en performance mode) |
| `Ctrl+A` | Toggle Adaptive Autoplay |
| `Ctrl+S` / `Ctrl+O` | Sauvegarder / charger un preset JSON |
| `Ctrl+R` | Démarrer/arrêter l'enregistrement vidéo |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |

---

## 🎬 Enregistrement Vidéo

- Click **⏺** (bouton record) ou `Ctrl+R`
- L'enregistrement démarre, re-click ou `Ctrl+R` pour arrêter
- Export **WebM** (natif, codec VP8)

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
src/
├── main.ts                  Process principal Electron (fenêtres, IPC, export vidéo)
├── preload.ts                Pont contextBridge ↔ renderer
└── renderer/
    ├── gl.ts                 Pipeline WebGL2 (multi-pass, effects chain)
    ├── shaders.ts             97 générateurs GLSL ES 3.00
    ├── industrialShaders.ts  20 générateurs Industrial monochrome
    ├── effects.ts             47 effets post-process
    ├── disruptors.ts          36 perturbateurs audio-réactifs
    ├── audio.ts               FFT + audio input (loopback/micro)
    ├── musicAnalyzer.ts       BPM / énergie / style / tap tempo
    ├── autoplay.ts            Logique autoplay de base
    ├── autoplayAdapter.ts     Pont autoplay ↔ audio live
    ├── autoplayAdvanced.ts    Presets (Gentle/Chaotic/Psycho/Glitch), génération
    ├── textLayer.ts           Couche texte pixellisée
    ├── ascii.ts               Rendu ASCII glitch
    ├── midi.ts                Input MIDI brut
    ├── videoExport.ts         Capture/export vidéo
    └── renderer.ts            Event loop + UI glue + frame loop
```

---

## 🧪 Tests

```bash
npm test              # Run test suite
npm run test:watch    # Watch mode
```

**Coverage**: Générateurs, effets, perturbateurs, audio, BPM sync

---

## 🌌 Univers ROBOTARIIS

Terminal-Synth est le **bras visuel** de ROBOTARIIS — univers SF d'Olivier.

| Concept | Description |
|---------|-------------|
| **Calendrier de la Rectitude** | Timing cosmique + structures éphémériques |
| **AZA Sessions** | Sessions longues auto-génératives |
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

**v1.9.0** · WebGL2 · 117 Generators · 47 Effects · 36 Disruptors · Industrial Mode · Adaptive Autoplay · Master Brightness
*Dark industrial visual synthesizer for solo live performance — autoplay-driven, music-reactive.*
