# Terminal-Synth

**Synthétiseur visuel dark/industriel avec génération automatique de compositions.**

Terminal-Synth est un visualiseur audio haute-performance basé sur WebGL2 + Electron, conçu pour créer des performances visuelles dynamiques et réactives à l'audio. Intègre des shaders GLSL ES 3.00, une génération procédurale multi-couches, et un système d'automation générative pour l'univers **ROBOTARIIS**.

![Status](https://img.shields.io/badge/status-Production-brightgreen)
![Version](https://img.shields.io/badge/version-0.9.5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Caractéristiques Principales

### 🎨 Rendu Visuel
- **WebGL2 Multi-Pass**: Ping-pong framebuffers pour les chaînes d'effets
- **37 Générateurs**: Formes géométriques, patterns fractals, noise procédural
- **31 Effets**: Distortions, glitches, feedback, Floyd-Steinberg, scanlines, rotations, etc.
- **17 Perturbateurs**: Événements audio-réactifs (bursts, flickers, glitches)
- **Système de Couches**: Layer A + Layer B avec 11 modes de fusion

### 🎵 Audio-Réactif
- **Détection Bandes**: Bass, Mid, Treble, Level en temps réel (FFT)
- **Synchronisation BPM**: Timing mesuré (mesures = 4 beats)
- **MIDI Support**: Clavier MIDI + contrôleurs
- **Réactivité Intelligente**: Aggression contrôlée par l'énergie bass

### 🌀 Génération Automatique (v0.9.5+)
- **4 Presets**: Gentle, Chaotic, Psycho, Glitch
- **Boucles Génératives**: Séquences auto-évolutives avec drift configurable
- **Audio-Réactif**: Énergie bass drive le taux de changement
- **Snapshots**: Undo/Redo, historique (50 états max)
- **Sessions**: Export/Import JSON complets

### 📝 Couche Texte Pixellisée
- **Police Géante**: Texte personnalisé, pixel par pixel
- **Liste de Mots**: Affichage aléatoire configurable
- **Pixellisation**: 1-64px (ultra-pixelisé possible)
- **Réactif aux Effets**: Filters CSS appliqués en temps réel
- **Audio-Réactif**: Position + couleur wobble basées sur l'audio

### 🎮 Interface
- **Mode ASCII**: Render texte pour terminal
- **Mode Plein Écran**: F pour basculer
- **Topbar**: Presets, audio, MIDI, enregistrement, version (0.9.5)
- **Panneaux**: Sources (1-9, q-p, a-k), effets, perturbateurs
- **Statut Live**: Measures, BPM, audio levels

---

## Installation

### Prérequis
- Node.js 18+
- npm 8+
- Windows 10+ / macOS 12+ / Ubuntu 26.04+

### Setup
```bash
git clone https://github.com/obareau/terminal-synth.git
cd terminal-synth
npm install
```

---

## Utilisation

### Mode Développement
```bash
npm run dev
```
Lance l'app avec hot-reload.

### Build Production
```bash
npm run package          # Windows
npm run package:mac      # macOS
npm run package:linux    # Linux
```

Voir [BUILD.md](BUILD.md) pour les détails de build par plateforme.

### Lancer (Quick)
```bash
npm start
```

---

## Architecture

### Stack
- **Frontend**: Electron + TypeScript + WebGL2
- **Rendering**: GLSL ES 3.00 shaders
- **Audio**: Web Audio API + FFT
- **Build**: esbuild + electron-builder
- **Testing**: Jest + ts-jest (36 tests)

### Structure Clés
```
src/
  main.ts                  # Electron process principal
  renderer/
    index.html             # UI dark + canvas
    renderer.ts            # Main glue + event loop
    gl.ts                  # Pipeline WebGL2 (effects chain)
    shaders.ts             # 37 générateurs GLSL
    effects.ts             # 31 effets post-process
    disruptors.ts          # 17 perturbateurs audio-réactifs
    autoplayAdvanced.ts    # Génération automatique + presets
    textLayer.ts           # Couche texte pixellisée
    audio.ts               # Web Audio API + FFT
    midi.ts                # MIDI input
    ascii.ts               # Mode ASCII
build.ts                   # esbuild bundler
```

### Générateurs (37)
Cercle, Carré, Onde, Spirale, Mandelbrot, Julia, Voronoi, Perlin, Worley, Triangle, Hexagone, Penrose, Lissajous, Vortex, Rose, Butterfly, Dragon, Hilbert, Sierpinski, Attractor, Pendule, Tourbillon, Kaleidoscope, Halftone, Grid, Noise, Simplex, et plus.

### Effets (31)
Entropie, Feedback, Glitch, Filtre, Invert, Grain, Neon, Onde, Fisheye, Hue, Scanlines, Datamosh, Pixelate, Thermal, Kuwahara, Slit Scan, Glow Edges, Posterize Dither, Floyd-Steinberg, Continuous Rotate CW/CCW, Scanlines Distort, Wave Spiral, Flip Horizontal/Vertical, Rotate, et plus.

### Perturbateurs (17)
Déchirure, Dropout, Strobe, Corrupt, Tremor, Phosphore, Flicker, Shatter, Bloom Burst, Glitch Rows, Flip Horizontal/Vertical, Mosaic Burst, Spin Vortex, Psycho Shift, Displacement Storm, et plus.

---

## Commandes Clés

| Touche | Action |
|--------|--------|
| `1-9, q-p, a-k` | Sélectionner générateur |
| `Tab` | Focus sources list |
| `A` | Audio on/off |
| `M` | MIDI on/off |
| `X` | Mode ASCII |
| `T` | Overlay texte |
| `F` | Plein écran |
| `Ctrl+O` | Load preset |
| `Ctrl+S` | Save preset |
| `Ctrl+R` | Record vidéo |
| `Ctrl+E` | Export MP4 |
| `Ctrl+A` | Start Autoplay |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Échap` | Fullscreen toggle |

---

## Automation Générative

### 4 Presets
- **Gentle** (16-32 mesures): Changements lents, transitions smooth, séquentiel
- **Chaotic** (4-12 mesures): Changements rapides, agressif, chaotique
- **Psycho** (2-8 mesures): Ultra-rapide, chaos maximal
- **Glitch** (8-16 mesures): Focus effets/perturbateurs, très réactif

### Boucles Génératives
Enregistre une boucle de N mesures, elle évolue automatiquement:
- Mutations progressives basées sur drift speed
- Historique conservé et jouable (history stack)
- Freeze pour lock l'évolution et répéter la même boucle

### Audio-Réactif
- L'énergie bass drive le niveau d'agression générale
- Probabilités de changement augmentent avec les pics audio
- Feedback visuel en temps réel (metronome)

---

## Couche Texte

### Configuration
1. Click **📝 TEXT** (bas de l'écran) pour activer
2. Click **⚙️** pour ouvrir le panel config
3. **Liste de mots**: Entrez un mot par ligne
4. **Couleur**: Utilisez le color picker
5. **Opacité**: Slider 0-100%
6. **Duration**: Durée par mot en ms
7. Click **Apply**

### Effets sur Texte
Activez n'importe quel effet dans la chaîne → le texte réagit via CSS filters:
- Invert → inverted
- Glitch → brightness
- Hue → hue-rotate
- Thermal → sepia
- Neon → bright + contrast
- Scanlines → slight darkness pulse
- Et les autres...

---

## Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode (live reload)
```

**36 tests** couvrant:
- Générateurs (structure GLSL, paramètres)
- Effets (code valide, ranges)
- Perturbateurs (sensibilité, timing)
- Audio (bandes FFT, BPM sync)

---

## Univers ROBOTARIIS

Terminal-Synth est le **bras visuel** de **ROBOTARIIS**, univers SF d'Olivier (ex-ROBOTANS):
- **Calendrier de la Rectitude**: Timing cosmique + structures éphémériques
- **AZA Sessions**: Sessions longues génératives
- **Factions**: Couleurs + personnalités (Vortex, Flux, Écho, etc.)
- **Langue de Combat**: Palette sonore + glyphes éphémériques

Les générateurs, effets, perturbateurs incarnent les **tactiques Recta** (combat visuel).

---

## Licence

**MIT** — Libre d'usage pour des fins créatives et commerciales.

---

## Crédits

**Développé par**: Olivier Bareau  
**Framework**: Electron + WebGL2  
**Audio**: Web Audio API + FFT  
**Build**: esbuild + electron-builder  
**Testing**: Jest + ts-jest  

**Univers**: ROBOTARIIS (Calendrier de la Rectitude, AZA Sessions, Factions, Langue de Combat)

**Inspiré de**: VS (Visual Synthesizer) par Imaginando

---

**v0.9.5** — Complete generative automation + text layer system + dithering + rotation effects  
**The ultimate visual synthesizer for dark industrial performances**
