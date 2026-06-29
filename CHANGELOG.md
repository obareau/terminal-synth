# Changelog

All notable changes to Terminal-Synth are documented in this file.

## [1.9.7] - 2026-06-29

### Added
- **Disruptors en MIDI Learn** — `disruptor:N` (sensitivité) et `disruptor:N:toggle` (on/off, value≥0.5=on) disponibles comme targets dans le MIDI Learn
- **Preset nanoKONTROL2** — bouton KORG (visible si MIDI on) charge le mapping factory Scene 1 en un clic : knobs→effets, faders→brightness/scènes/stageCap, S/M/R buttons→disruptors 1-24

## [1.9.6] - 2026-06-29

### Fixed
- Effect Sequencer déplacé dans le panel gauche (onglet Controls, au-dessus de la liste d'effets) — n'était pas visible dans la bottom bar surchargée
- Parser SEQ : accepte `VHS*2+ABR` et `VHS+ABR*2` indifféremment (extraction de `*N`/`?P` indépendante de la position)

## [1.9.5] - 2026-06-29

### Added
- **Effect Sequencer** — champ SEQ + bouton ▶/■ dans la bottom bar. Syntaxe DNA inspirée de BANG! :
  - `FDB*4` : Feedback ON pendant 4 beats puis off
  - `GLT?50` : Glitch avec 50% de probabilité
  - `VHS*2+ABR` : VHS + Aberration simultanément, 2 beats
  - `<NEO*4 ZOM*4>` : alternance Neon/Zoom à chaque cycle
  - Exécution BPM-synced, boucle infinie, Entrée ou ▶ pour lancer
- **IDs courts pour les 47 effets** — ENT, FDB, GLT, FLT, INV, GRN, NEO, OND, FSH, HUE, SCN, DTM, PIX, THM, ZOM, VHS, SEU, ABR, BLM, MIR, DTH, CHR, KUW, SLT, GLW, PDT, FLD, RCW, RCC, SCD, WSP, NTC, CPV, AGH, CBL, LUM, RFN, ORL, ONC, OSP, POR, NPL, ORN, WRN, BWR, BWG, SBW

## [1.9.4] - 2026-06-29

### Added
- **MIDI Learn** — bouton LEARN (visible si MIDI on) : clic sur un paramètre → bouge un CC ou le pitch bend → mapping persistant (localStorage). Targets : 47 amounts d'effets, stage cap, layer B opacity, master brightness, scènes S1-S6 (trigger CC≥64), pitch bend. Clic droit = débind. Badge `[CC7]` / `[PB]` dans les tooltips, halo bleu sur les controls mappés.
- **MIDI Program Change** — PC 0-5 → recall scènes S1-S6 (pour les contrôleurs qui supportent PC)

### Fixed
- MIDI Learn : `box-shadow` à la place de `outline` (invisible sur les `input[type=range]` dans Electron). Couleur bleue.

## [1.9.3] - 2026-06-29

### Fixed
- **Scene Bank raccourcis** — déplacé dans `before-input-event` Electron (avant le DOM) + IPC → fonctionne quelle que soit la focus. Pavé numérique (Numpad1-6) ajouté en plus des touches de chiffres (Digit1-6).

## [1.9.2] - 2026-06-29

### Added
- **Scene Bank** — 6 slots persistants (localStorage) qui capturent l'intégralité du look visuel : générateur A, layer B, effets, disruptors, Industrial mode + palette, stage cap. `Ctrl+Shift+1-6` pour sauvegarder, `Ctrl+1-6` pour rappeler. Boutons S1–S6 dans la bottom bar (Ctrl+clic = save, clic = recall).

### Fixed
- **Export vidéo** — remplacement du transfert IPC binaire (crash silencieux > 50 MB) par `URL.createObjectURL` + handler `will-download` Electron avec Save As dialog natif.

## [1.9.1] - 2026-06-29

### Added
- **Audio device picker** — bouton ⚙ dans la topbar : énumère tous les périphériques d'entrée audio et permet de choisir la source exacte (résout les ambiguïtés PipeWire/Linux)
- **Uniforms beat** — `u_beat` (sawtooth 0→1/beat) et `u_beatEnv` (enveloppe 1→0 par beat) disponibles dans tous les shaders et effets GLSL

### Fixed
- **Capture audio Linux/PipeWire** — regex élargie (monitor|loopback|moniteur), log diagnostic des périphériques détectés, message d'erreur avec commande `pactl` actionnable
- **BPM câblé dans l'autoplay** — `setBPM()` et `updateAudioEnergy()` enfin branchés dans la boucle principale (code mort `wrappedFrame` supprimé)

### Improved
- **Détection BPM** — réécriture complète : spectral flux half-wave rectifiée sur 256 bins FFT (style Mixxx) + autocorrélation sur fenêtre 5s + interpolation parabolique sub-frame + correction d'octave. Bien plus fiable que le peak counting sur le bass band.
- **Réactivité BPM des effets** — `u_level` boosté de +25% sur chaque beat → tous les effets réagissant à `u_level` pulsent en rythme. Disruptors déclenchés en priorité sur les frontières de beat (durée courte pour glitch net). `metronomeCallback` branché pour aligner le beat sur l'autoplay.

### Removed
- Boutons ISF, SPOUT et export MP4 — jamais utilisés en pratique, libèrent de l'espace dans la toolbar

## [1.9.0] - 2026-06-12

### Added
- **Industrial Mode** ⬛ — Post-process N&B avec dither IGN (Interleaved Gradient Noise, Jiménez), gamma 0.85, contraste 1.4, quantification 2 steps :
  - 4 palettes : **B&W**, **Phosphor** (vert CRT), **Blueprint** (cyan), **Sepia**
  - Bouton toggle + cycle palette dans la barre du bas, badge HUD dans le topbar
  - Quand actif, l'autoplay est biaisé sur les générateurs de catégorie Industrial uniquement
- **20 générateurs Industrial** — GRID PULSE, DATAMATRIX RAIN, CONTOUR MAP, TUNNEL SCHEMATIC, GLYPH FIELD, HALFTONE SPHERE, SCAN BARS, WIRE CUBE ARRAY, PLOTTER LINES, SIGNAL SPECTRUM, BINARY STATIC, ISO MOUNTAINS, CIRCUIT TRACE, PHOSPHOR TRAILS, ASCII TUNNEL, GLYPH TUNNEL, STROBE GRID, NOISE BANDS, BITMAP SMEAR, CODE CASCADE
- **12 disruptors glitch industriels** — Block Displace, Scan Tear, Frame Hold, Datamosh, Signal Loss, Sync Lost, Bit Crush, Glyph Storm, Halftone Pulse, Scanline Density, Contour Shock, Negative Flash
- **Stage Cap** — slider STAGES 1–12 (default 6) : limite les effects+disruptors simultanés. Gain visuel (moins de mush) + gain de perf. Post-process (Industrial Mode, Master Brightness) exclus du cap.
- **HUD** — FPS, frame time (ms), résolution canvas + bands bass/mid/hi affichés en continu dans le meter ; version du programme dans l'overlay TERMINAL·SYNTH.

### Fixed
- **Master Brightness algorithm** — Refonte : le slider contrôle maintenant le **plancher** (0 = identité, 1 = fade-to-black agressif original). Auparavant l'image partait au noir complet quel que soit le preset.
- **Conflit raccourci `I`** — Industrial Mode déplacé sur bouton UI (cohérent avec Master Brightness), suppression de la collision avec la sélection de shader.

### Performance
- Trim d'itérations : PHOSPHOR TRAILS 14→8, PLOTTER LINES 24→14, BITMAP SMEAR 6→3
- Stage cap réduit la longueur du chain de rendu en live

### Technical
- **New Files** : `industrialShaders.ts`, `industrialDisruptors.ts`, `ROADMAP_v1.7.md`, `ROADMAP_v1.8.md`
- **Modified** : `shaders.ts`, `disruptors.ts`, `renderer.ts`, `autoplayAdvanced.ts`, `index.html`

---

## [1.6.0] - 2026-06-10

### Added
- **Adaptive Autoplay System** ⭐ — Music-reactive parameter scaling:
  - Real-time music analysis: BPM detection, energy trending, style classification
  - Autoplay parameters scale dynamically based on music energy and style
  - Energy-based multipliers: calm (0.6x) → driving (0.9x) → chaotic (1.3x) → peak (1.5x)
  - BPM & Energy display prominently in topbar (live updates)
  - Tap Tempo feature (Shift+T) for manual BPM setting

- **Lightweight Music Analysis** — Minimal CPU overhead:
  - Adaptive beat detection from bass pattern
  - Threshold = average_bass + 30% (adapts to audio level)
  - BPM smoothing via median of last 10 estimates (prevents jitter)
  - Energy trend and style classification (calm/driving/chaotic/peak)
  - Updates display 10x/sec for smooth real-time feedback

### Improved
- **Performance** — Ultra-lightweight music analyzer:
  - Analyzes every frame but displays only when needed (10Hz DOM updates)
  - No buffering overhead, simple adaptive threshold algorithm
  - Peak detection with 167ms minimum interval (prevents false positives)
  - Zero CPU impact on rendering pipeline

### Fixed
- **MIRE Overlay** — Now properly disappears after startup:
  - Added visibility:hidden + pointer-events:none on opacity transition
  - Text overlay no longer lingers after MIRE is hidden

### Technical Details
- **New Files**: `src/renderer/musicAnalyzer.ts`, `src/renderer/autoplayAdapter.ts`
- **Modified Files**: `src/renderer/renderer.ts`, `src/renderer/index.html`
- **Music Analysis**: Adaptive threshold peak detection with median BPM smoothing
- **UI**: Large 20px BPM/Energy display in topbar with color-coded feedback

---

## [1.5.0] - 2026-06-09

### Added
- **Nightcall Mountains Generator** ⭐ — 32 hexagonal pyramidal mountains in procedural valley with:
  - Hidden-face culling algorithm for proper 3D perspective
  - True 3D projection with vanishing point perspective
  - Adaptive LOD (contour rings decrease with distance for performance)
  - Forward-scrolling motion with wrapping depth cycle
  - Cyan wireframe floor grid (rotated 20°, fast scroll)
  - Synthwave aesthetic: magenta mountains, blue/cyan grid, black background
  - Procedurally generated mountain shapes for visual variation
  - Performance optimized with screen-space bounding box early-out

- **Light/Dark Theme Toggle** — Persistent UI theme switching:
  - Press `T` key or click ☀ button in topbar
  - Dark mode: Original #1a1a1a background with neon green/cyan accents
  - Light mode: #f5f3ef background with dark text for readability
  - Theme preference saved to localStorage, restored on app restart
  - Smooth CSS filter-based transitions

### Improved
- **Shader Performance** — Optimizations for 32-mountain rendering:
  - Added screen-space bounding box culling (`length(p - sCenter) > screenRadius`)
  - Adaptive contour ring reduction (fewer rings on distant mountains wz > 8.0)
  - Reduced per-frame shader compilation overhead
  - Maintained 60 FPS on GTX 1060 equivalent hardware

### Technical Details
- **Files Modified**: `src/renderer/shaders.ts`, `src/renderer/index.html`, `src/renderer/renderer.ts`
- **GLSL Changes**: New Nightcall Mountains shader with 32-mountain hexagonal polyhedra
- **CSS Changes**: Dark/light theme variables, smooth color transitions
- **TypeScript**: Theme toggle logic with localStorage persistence, keyboard handler integration

---

## [1.2.0] - 2026-05-15

### Added
- **Master Brightness** (v1.2.0) — Audio-reactive fade to black effect:
  - Smooth exponential moving average for audio level
  - Power curve (0.55) for dramatic low-end response
  - Slider control: 100% → 200% brightness amplification at peak
  - Minimum 1% brightness to prevent complete black
  - Toggle with `B` key
  - Perfect for fade-in/fade-out music transitions

### Improved
- Refined autoplay preset mutation algorithm
- Better BPM sync timing precision
- Enhanced MIDI learn mode visual feedback

---

## [1.1.0] - 2026-04-10

### Added
- **Sequencer** (v1.0.1) — Ableton Live-style automation:
  - 16-step BPM-synced grid
  - Keyframe editing with full easing support (linear, ease-in, ease-out, ease-in-out)
  - Copy/Paste/Randomize operations
  - Real-time waveform visualization
  - Sequencer state persisted in presets

- **MIDI Learn** — CC-to-parameter mapping:
  - Enter learn mode with `Shift+L`
  - Unlimited CC mappings with 3 curve types (linear, log, exp)
  - 10 automation targets: shader params, effects, disruptors, layer B opacity
  - Mappings saved/loaded with presets

### Features
- Keyboard shortcuts: `Shift+Q` (toggle), `Shift+Space` (play/stop), `C`/`V` (copy/paste), `Shift+R` (randomize), `Shift+L` (learn)
- Pulsing visual feedback for learn mode
- Current step highlighting during playback

---

## [1.0.1] - 2026-03-20

### Initial Release
- **91 Generators** across 6 categories (All, Text, Plasma, Geometry, Noise, Interactive)
- **23 Audio-triggered Disruptors** (ripple, twist, glitch, zoom, aberration, etc.)
- **31 Post-process Effects** with blend mode support (11 modes)
- **4 Automation Presets**: Gentle, Chaotic, Psycho, Glitch
- **ASCII Mode** with pixel glitch effects
- **Video Recording** (WebM format)
- **Full Undo/Redo** with snapshot history
- **Session Save/Load** (JSON presets)
- **WebGL2 Multi-pass Pipeline** with ping-pong framebuffers
- **FFT Audio Analysis** (bass, mid, treble, level bands)
- **MIDI Input** support (notes, CC, pitch bend, aftertouch)
- **System Audio** input (loopback + microphone)
- **BPM Sync** with measured timing (4 beats per measure)

---

## Version History

- v1.5.0 — Nightcall Mountains + Light Theme + Performance (2026-06-09)
- v1.2.0 — Master Brightness (2026-05-15)
- v1.1.0 — Sequencer + MIDI Learn (2026-04-10)
- v1.0.1 — Initial Release (2026-03-20)
