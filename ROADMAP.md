# Terminal-Synth Roadmap

## 🚀 Status: v2.1.1 — Active development

Terminal-Synth est un synthétiseur visuel dark/industriel pour **performeur
solo live**, piloté par **Adaptive Autoplay** (évolution music-reactive).
v2.0 marque la fin du feature freeze v1.9 et ouvre un nouveau cycle de
développement centré sur la profondeur : plus de matière visuelle, un
autoplay plus intelligent, et un outil de scène plus mature.

**Philosophie** : solo performer, autoplay-first, pas de séquenceur pas-à-pas
— ce choix reste permanent. Le MIDI Learn (v1.9.4+, avec presets hardware
depuis v2.1.0) reste un complément de contrôle live, pas un remplacement de
l'autoplay.

---

## Version History

### v2.1.1 — Fix packaging Electron + PKGBUILD Arch/Garuda (2026-07-11)
- **Fix `electron-builder.json`** — `arch` mal imbriqué sous `linux`/`mac` faisait échouer la validation de schéma d'electron-builder 26.15.0 (`npm run package`/`package:mac`/`package:linux` cassés). Config dupliquée dans `package.json` supprimée (divergeait de `electron-builder.json`, silencieusement prioritaire par défaut).
- **PKGBUILD Arch/Garuda** (`packaging/archlinux/`) — paquet pacman natif, non publié AUR. Build validé de bout en bout sur Garuda Linux.
- `npm run package:deb` reste cassé sur Arch (dépendance `libcrypt.so.1` du `fpm` embarqué, absente sur ces distros) — limite du toolchain, pas liée au fix.

### v2.1.0 — Presets MIDI Launchkey Mini MK3 + Launchpad Pro MK3, feedback LED (2026-07-11)
- **Mapping par note dans MIDI Learn** — en plus des CC/pitch bend, le système apprend maintenant aussi les pads (Note On/Off). Rétrocompatible avec les mappings CC existants.
- **Preset LKEY** (Launchkey Mini MK3) — knobs Custom Mode 1 (CC 21-28) → amounts effets 1-8 ; pads Session (Shift+Pad Mode) → scènes S1-S6 + 10 disruptors hold-to-glitch.
- **Preset LPAD** (Launchpad Pro MK3) — grille 8×8 Standalone Programmer layout → scènes S1-S6 + 58 des 61 disruptors, un pad chacun.
- **Feedback LED** — pads mappés par note s'allument selon l'état actif (scène = bleu, disruptor = rouge) via Note On de sortie, sans sysex. Diffé/cache pour éviter le spam MIDI, rattrape aussi l'autoplay.
- **Sortie MIDI ajoutée à `MidiInput`** (`sendNoteOn`) — jusqu'ici lecture seule.
- Testé en Chrome (0 erreur console) ; validation LED sur hardware réel prévue au prochain live.

### v1.0.1-delta — Foundations
- 91 generators with audio reactivity, effects/disruptors chain
- 16-step MIDI sequencer (CC mapping) — **since removed** in favor of
  Adaptive Autoplay. MIDI Learn was independently reintroduced at v1.9.4.

### v1.2.0 — Master Brightness
- Audio-reactive fade-to-black via CSS filter, exponential moving average
  smoothing, slider-controlled amplification

### v1.5.0 — Nightcall Mountains + Theming
- Nightcall Mountains generator (32 hexagonal pyramids, 3D projection)
- Light/Dark theme toggle with localStorage persistence
- 91 generators / 31 effects / 23 disruptors, Linux `.deb` packaging

### v1.6.0 — Adaptive Autoplay + Music Analysis
- Real-time BPM detection (adaptive bass-peak threshold) and energy/style
  classification (calm/driving/chaotic/peak)
- Autoplay parameters scale dynamically with music energy
- Tap tempo (`Shift+T`), MIRE ORTF startup screen

### v1.7.x — Industrial Mode
- 20 Industrial generators (monochrome, glitch-driven)
- Post-process N&B with IGN dither, 4 palettes (B&W / Phosphor / Blueprint /
  Sepia)
- 12 Industrial disruptors
- Autoplay can be restricted to the Industrial pool

### v1.7.4 — Performance Pass
- Auto-Perf: graduated degrade (stage cap squeeze, then render scale
  reduction) when FPS drops below 50 for 5s, recovers when FPS ≥ 58 for 10s
- Audio capture and MIRE startup fixes

### v1.9.0 — Stage Cap, HUD, Master Brightness Rework → **Freeze**
- Stage Cap slider (1–12, default 6) limits simultaneous effects+disruptors
- Extended HUD: FPS, frame time, resolution, audio bands, version overlay
- Master Brightness slider now controls the floor (0 = identity, 1 =
  aggressive fade-to-black), fixing the previous always-black bug
- **Feature freeze declared** — tagged `v1.9.0-stable`

### v2.0.0 — Autoplay refonte + 25 disruptors + textLayer (2026-06-29)
- **Autoplay rearchitecturé** — 3 cycles indépendants : generator (2–4 mesures), effets/disruptors (1–2 mesures), principal (blend/filtre/sliders). Fade-in/fade-out sur les transitions d'effets et disruptors.
- **+25 disruptors** — total 61 : STB Static Burst, RGX RGB Explosion, HCL H-Collapse, TSC Tile Scramble, DBL Datableed, SIG Signal Cut, PRN Pixel Rain, ACD Acid Wash, FRZ Freeze Glitch, WML Wave Melt, VTR Vertical Tear, ECD Echo Drift, HSM Heat Shimmer, NGS Negative Spike, SLB Scanline Burn, BLS Blink Strip, CFG Chroma Fog, DGE Digital Echo, CLM Color Melt, WRL Warp Lens, PCR Pixel Crush, CHB Crosshatch Burn, BWD Bandwidth, NFR Neon Flare, SBK Static Block.
- **textLayer** — adaptive width (% de la largeur canvas), 35 mots lexique ROBOTARIIS/indus, police aléatoire cross-platform par mot, timing revu (3s par mot, 25s pause).
- **Fix u_beat/u_beatEnv** — déclarés dans COMMON_UNIFORMS, disponibles dans tous les shaders.
- **Fix autoplay sélecteurs** — generators distribués équitablement, disruptors réellement randomisés.

### v1.9.9 — 14 générateurs Lofi + 8 remplaçants 2D
- **Lofi generators** — onglet dédié : VHS Static, Super 8, Lo-Fi Waves, Cassette Hiss, Pixel Plasma, Game Boy, Chiptune Bars, Sine Chip, ASCII Density, ASCII Rain, Block Art, Teletext, Minitel 3615 (avec font bitmap "3615 ROBOTARIIS" en GLSL ES 3.00)
- **Remplacement 8 générateurs 3D cassés** par des alternatives 2D fonctionnelles (Cross Hatch, Signal Jam, Barcode Rush, Bayer Storm, Spoke Wheel, Redacted, Stroboscope, Hex Grid)
- Fix : onglet Lofi vide (`s.category` prioritaire sur heuristique nom), Chiptune Bars y inversé

### v1.9.8 — Disruptors dans le SEQ + indicateur de step
- Syntaxe `D:ID` pour les disruptors dans le pattern SEQ
- 36 ids courts sur tous les disruptors
- Indicateur step `2/4` à côté du ▶

### v1.9.7 — Disruptors MIDI + preset nanoKONTROL2
- Disruptors learnable (sensitivité + toggle on/off)
- Bouton KORG : preset nanoKONTROL2 Scene 1 en un clic (knobs/faders/S/M/R câblés)

### v1.9.6 — Effect Sequencer fixes
- SEQ déplacé dans le panel gauche (Controls), visible au-dessus de la liste d'effets
- Parser robuste : `VHS*2+ABR` et `VHS+ABR*2` équivalents

### v1.9.5 — Effect Sequencer
- Syntaxe DNA (inspirée BANG!) : `FDB*4, GLT?50, VHS*2+ABR, <NEO*4 ZOM*4>` — durée en beats, probabilité, simultané `+`, alternance `<>`
- 47 IDs courts mnémotechniques sur tous les effets
- UI : champ SEQ + ▶/■ dans la bottom bar, BPM-synced, boucle infinie

### v1.9.4 — MIDI Learn
- Bouton LEARN (visible si MIDI on) : clic sur un param → bouge un CC/PB → mappé. Targets : 47 effets, stage cap, layer B opacity, master brightness, scènes S1-S6, pitch bend. Persistance localStorage. Clic droit = débind.
- MIDI Program Change PC 0-5 → recall scènes S1-S6

### v1.9.3 — Scene Bank shortcuts fix
- Raccourcis Ctrl+1-6 / Ctrl+Shift+1-6 déplacés dans `before-input-event` Electron + IPC pour contourner les interceptions DOM. Pavé numérique supporté (Numpad1-6).

### v1.9.2 — Scene Bank, Video Export Fix
- **Scene Bank** — 6 slots persistants (localStorage) pour préparer des looks avant le show et les rappeler instantanément en live. `Ctrl+Shift+1-6` pour sauvegarder, `Ctrl+1-6` pour rappeler. Chaque scène capture : générateur A, layer B, effets, disruptors, Industrial mode + palette, stage cap.
- **Export vidéo** — `URL.createObjectURL` + `will-download` handler ; plus de crash silencieux sur les longues vidéos

### v1.9.1 — BPM Overhaul, Beat-Reactive Effects, Linux Audio Fix
- **BPM detection rewrite** — spectral flux (256-bin FFT, half-wave rectified)
  + 5s autocorrelation window + parabolic interpolation + octave correction.
  BPM now wired into autoplayAdvanced (was dead code)
- **Beat-reactive uniforms** — `u_beat` (sawtooth 0→1/beat) and `u_beatEnv`
  (1→0 decay envelope) available in all shaders and effects; `u_level` boosted
  +25% on beats so all existing effects pulse in tempo
- **Beat-sync disruptors** — disruptors fire preferentially on beat boundaries
  for a sharp glitch-on-beat effect
- **Linux/PipeWire audio** — wider device matching, audio device picker (⚙)
  lets you select any input directly, diagnotic logs for troubleshooting
- Removed unused ISF, SPOUT, MP4 export buttons from toolbar

---

## Abandoned Attempt: v1.8 Remote Control

A WebSocket server (port 7777) + PWA tablet UI was built to allow
Performance/Director/Spectator control modes from a phone/tablet over the
local network, with a JSON-schema-driven adaptive UI and QR pairing.

After implementation, the app crashed ~5–9 seconds after startup and the
root cause could not be identified (candidates: an unhandled exception in
the remote-state push loop, the WebSocketServer interfering with the
Electron `BrowserWindow` lifecycle, or the QR/schema-builder integration).
Given the low tolerance for a broken live-performance tool, the entire
effort was reverted via `git reset --hard` to the last known-good commit
and force-pushed.

**The v1.8 code no longer exists in this repository.** The original design
is preserved at `docs/archive/ROADMAP_v1.8.md` for reference if remote
control is ever revisited — any future attempt should start by instrumenting
`main.ts` for uncaught exceptions and `render-process-gone` events before
porting any of the old code.

---

## v2.x — Pistes envisagées

Ces pistes sont exploratoires — elles ne sont pas commitées et peuvent être
abandonnées. Priorité : stabilité live avant tout.

- **Générateurs** — nouveaux shaders (fluid sim, reaction-diffusion, SDF 2D)
- **Effets** — plus de post-process (liquid lens, chroma key, feedback chaos)
- **textLayer** — transitions entre mots (fondu, glitch swap, slide), taille variable par mot
- **Remote Control** — si tentative v1.8 retentée, partir de `main.ts` avec uncaught exception handlers et `render-process-gone` avant tout code métier
- **UI** — panel resizable, layout persistant, thème indus pur

## Politique de développement

- Stabilité live > features. Reverter immédiatement si l'app crash au démarrage.
- Workflow : reproduire → fix minimal → `npm test` → commit → push.
- Pas de séquenceur pas-à-pas — permanent. (MIDI Learn existe depuis v1.9.4 : contrôle live complémentaire, pas un remplacement de l'autoplay.)
- Binaires (`.deb`, `.exe`) : locaux uniquement, jamais sur GitHub.
