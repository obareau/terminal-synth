# Terminal-Synth Roadmap

## 🔒 Status: Feature Freeze (v1.9.0-stable)

Terminal-Synth is feature-complete for its core mission: a dark industrial
visual synthesizer for **solo live performance**, driven by **Adaptive
Autoplay** (music-reactive evolution) with the performer supervising and
biasing. No sequencer, no MIDI Learn — these were deliberately removed.

**From v1.9.0 onward, development is debug/maintenance only.** No new
features are planned. Work focuses on bug fixes, performance, and
stability. See `.claude/CLAUDE.md` for the full project policy.

---

## Version History

### v1.0.1-delta — Foundations
- 91 generators with audio reactivity, effects/disruptors chain
- Sequencer + MIDI Learn (16-step automation, CC mapping) — **since removed**
  in favor of Adaptive Autoplay

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

## Current Policy

- **Debug/maintenance only.** Fix bugs, improve performance, polish UX.
- **No new major features** (Remote Control, Director Mode, etc. stay
  shelved).
- Workflow: reproduce → minimal fix → `npm test` → commit → push.
- If a change breaks app startup, prefer reverting immediately over
  incremental in-place debugging (see v1.8 postmortem above).
