# Terminal-Synth Project Instructions

> Custom project guidelines for Terminal-Synth development with Claude Code

---

## Agent skills

### Issue tracker

Issues live as GitHub issues on `obareau/terminal-synth` (use the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical roles map 1:1 to label names: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root (none yet — created lazily). See `docs/agents/domain.md`.

---

## Project Overview

**Terminal-Synth** is a dark industrial visual synthesizer built with:
- **Electron 34** + **TypeScript 5.7**
- **WebGL2** (GLSL ES 3.00) for rendering
- **Web Audio API** for FFT analysis
- **esbuild** for bundling

**Current Version**: v1.9.0  
**Status**: Active development — solo live performer tool (autoplay-focused)  
**License**: MIT

**Core philosophy**: Single performer, music-reactive, no sequencer / no MIDI Learn. Adaptive Autoplay drives the show; the user supervises and biases.

---

## Development Workflow

### Building
```bash
npm run build          # TypeScript compilation + esbuild
npm start              # Launch dev version with hot-reload
npm run package:deb    # Build .deb for Linux
npm run package:mac    # Build .app for macOS
npm run package        # Build .exe for Windows
```

### Testing
```bash
npm test               # Run test suite (36 tests)
npm run test:watch     # Watch mode for TDD
```

### Code Quality
- **No destructive binaries on GitHub** (too large)
- Build locally only: `.deb` stays in `/release/` directory
- All commits include `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>`

---

## Architecture

### Core Modules

| File | Purpose | Key Classes |
|------|---------|-------------|
| `src/renderer/gl.ts` | WebGL2 pipeline | `Pipeline` (rendering engine) |
| `src/renderer/shaders.ts` | Generator definitions | GLSL ES 3.00 generators |
| `src/renderer/effects.ts` | Post-process effects | Effect chain definitions |
| `src/renderer/disruptors.ts` | Audio-triggered glitches | Disruptor effects |
| `src/renderer/audio.ts` | FFT analysis | `AudioInput` (Web Audio API) |
| `src/renderer/musicAnalyzer.ts` | BPM/energy/onset detection | `MusicAnalyzer` |
| `src/renderer/autoplay.ts` | Base autoplay logic | `Autoplay` |
| `src/renderer/autoplayAdapter.ts` | Music-reactive bridge | Adapts autoplay to live audio |
| `src/renderer/autoplayAdvanced.ts` | Advanced evolution rules | Energy/BPM-driven changes |
| `src/renderer/isf.ts` | ISF shader support | ISF format loader |
| `src/renderer/text.ts` / `textLayer.ts` / `textsource.ts` / `texts.ts` | Text overlays | Live text rendering |
| `src/renderer/ascii.ts` | ASCII layer | ASCII art post-process |
| `src/renderer/videoExport.ts` | Recording | Frame capture / video export |
| `src/renderer/midi.ts` | MIDI input | Raw MIDI handling (NOT MIDI Learn) |
| `src/renderer/renderer.ts` | Main event loop | Frame loop + UI glue |

**Note**: Sequencer and MIDI Learn were removed — TS is autoplay-focused now.

### Data Flow
```
Audio Input → FFT Analysis → Audio Bands {bass, mid, treble, level}
                    ↓
         Generator Selection + Parameters
                    ↓
         WebGL Pipeline (multi-pass rendering)
                    ↓
         Effect Chain (ping-pong framebuffers)
                    ↓
         Disruptors (audio-reactive glitches)
                    ↓
         Canvas Output + Text/ASCII Layers
                    ↓
         Master Brightness (CSS filter)
```

---

## Key Features & Shortcuts

### Adaptive Autoplay (v1.6.0) ⭐
- **Music-reactive evolution** — generators/effects/disruptors change in sync with the music
- **BPM detection** — bass-peak counting algorithm (`musicAnalyzer.ts`)
- **Energy analysis** — drives intensity of changes
- **Tap tempo** — manual override
- **Files**: `autoplay.ts`, `autoplayAdapter.ts`, `autoplayAdvanced.ts`, `musicAnalyzer.ts`

### Master Brightness
- **Toggle**: `B` key
- **Slider**: 100% → 200% amplification at peak
- **Effect**: Audio-level fade-to-black via CSS filter
- **Files**: `renderer.ts`

### Generator Selection
- Keys: `1-9`, `q-p`, `a-k`
- **Files**: `shaders.ts` (generator definitions), `renderer.ts` (selection logic)

### Audio Controls
- **Toggle Audio**: `A` key
- **Toggle MIDI**: `M` key
- **System Audio**: Loopback or microphone input
- **FFT Analysis**: Real-time bass/mid/treble/level bands

---

## Development Guidelines

### When Adding Features

1. **Autoplay logic**: Edit `autoplay.ts` / `autoplayAdapter.ts` / `autoplayAdvanced.ts`
2. **Music analysis (BPM/energy/onsets)**: Edit `musicAnalyzer.ts`
3. **Generators**: Add to `src/renderer/shaders.ts` (GLSL code block)
4. **Effects**: Add to `src/renderer/effects.ts` (post-process shader)
5. **Disruptors**: Add to `src/renderer/disruptors.ts` (audio-triggered glitches)
6. **UI Elements**: Add to `src/renderer/index.html` + `renderer.ts` event listeners
7. **Styling**: Add to `src/renderer/index.html` `<style>` or separate CSS

**Reminder**: No sequencer, no MIDI Learn — these were deliberately removed. Don't reintroduce them.

### Code Style

- **TypeScript**: Use strict mode, explicit types
- **GLSL**: ES 3.00 (WebGL2 only), no legacy #version 120
- **Variables**: `camelCase` for JS, `u_name` for shader uniforms
- **Comments**: Only when non-obvious (why, not what)
- **No abstractions** beyond task scope (YAGNI principle)

### Testing

- Add tests to `src/renderer/__tests__/` for new modules
- Run `npm test` before committing
- Test coverage: 36 tests currently (generators, effects, audio, BPM sync)

---

## Common Tasks

### Add a New Generator
```typescript
// In shaders.ts, add to SHADERS array:
{
  name: "My Generator",
  category: "Geometry",
  shader: `vec3 render(vec2 uv, vec2 resolution) {
    // Your GLSL code here
    return vec3(...);
  }`,
  audioReactive: true,
}
```

### Add a New Effect
```typescript
// In effects.ts, add to EFFECTS array:
{
  name: "My Effect",
  effect: `vec3 process(vec2 uv) {
    // Your GLSL code here
    return vec3(...);
  }`,
  amount: 0.5,
}
```

### Add a Keyboard Shortcut
```typescript
// In renderer.ts, in keydown handler:
if (e.key === "your-key" && !inInput) {
  e.preventDefault();
  // Your action here
}
```

### Drive a Parameter from Autoplay
```typescript
// In renderer.ts frame loop, autoplay/musicAnalyzer set values from audio analysis.
// Parameters update through autoplayAdapter based on energy/BPM/onsets — not via sequencer.
```

---

## Important Files to Preserve

### UI Stability (from memory)
- **CSS Grid Layout**: `#app { display: grid; grid-template-rows: 32px 1fr 36px; }`
- **Grid Areas**: topbar, left-panel, stage, right-panel, bottom-bar
- **Never hide** topbar/panels in default state
- **If UI breaks**: Clean rebuild with `rm -rf dist node_modules && npm install && npm run build`

### Audio Processing
- **FFT Analysis**: Bands update every frame in `audio.sample()`
- **BPM Sync**: 4 beats per measure, measured timing
- **Loopback Audio**: Requires system audio configuration

### WebGL Pipeline
- **Multi-pass ping-pong**: tex[0]/tex[1] framebuffers
- **Layer B**: Separate generator with blending
- **Framebuffer size**: Auto-resized to canvas size
- **preserveDrawingBuffer**: true (for pixel reading)

---

## Master Brightness Implementation Details

**Location**: `src/renderer/renderer.ts` lines 1014-1048

**Algorithm**:
1. **Smooth audio level**: Exponential moving average (85:15 ratio)
2. **Power curve**: `normalized = pow(smoothed, 0.55)` for dramatic low-end
3. **Min brightness**: 1% to prevent complete black
4. **Slider amplification**: 100% → 200% range (1.0x → 2.0x)
5. **CSS filter**: `brightness(X%)` applied to canvas element
6. **Auto-switch safety**: Detects extreme luminance, changes generator

**Key Variables**:
- `smoothedAudioLevel`: Persists across frames
- `u.level`: Current audio level (0-1)
- `masterBrightnessAmount`: Slider value (0-1)
- `masterBrightnessEnabled`: Toggle state

---

## Release Process

1. **Version bump**: Update `package.json` version
2. **Update README**: Add features, screenshots, version
3. **Create CHANGELOG**: Document all changes
4. **Tag commit**: `git tag -a vX.Y.Z -m "Release message"`
5. **Build packages**: `npm run package:deb` (local only)
6. **Push commits & tags**: `git push && git push origin vX.Y.Z`
7. **NO binaries on GitHub**: .deb files stay local

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| UI elements vanish | `rm -rf dist node_modules && npm install && npm run build` |
| MIDI not working | Check browser audio permissions, restart app |
| WebGL errors on startup | Ensure WebGL2 device, check GPU drivers |
| BPM detection unstable | Check `musicAnalyzer.ts` thresholds, ensure bass content in audio |
| Autoplay too erratic | Tune evolution rules in `autoplayAdvanced.ts` |
| Master Brightness too subtle | Increase slider to max, check audio level |

---

## Performance Targets

- **Frame Rate**: 60 FPS on GTX 1060 or equivalent
- **Memory**: < 500MB typical usage
- **Audio Latency**: < 100ms for MIDI CC response
- **Startup Time**: < 5 seconds (dev) / < 3 seconds (prod)

---

## Git Commit Convention

All commits include:
```
<type>: <subject>

<optional body with details>

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

---

## Resources

- **GitHub Repo**: https://github.com/obareau/terminal-synth
- **Issues**: Report bugs or request features
- **ROADMAP.md**: Future features and vision
- **CHANGELOG.md**: Version history
- **README.md**: User documentation

---

## Quick Reference Commands

```bash
# Development
npm start              # Dev mode
npm test               # Run tests
npm run test:watch     # Watch mode

# Production
npm run build          # Build only
npm run package:deb    # Linux package
npm run package:mac    # macOS package
npm run package        # Windows package

# Git
git log --oneline      # See recent commits
git status             # Check state
git push               # Push to GitHub
git tag -a vX.Y.Z      # Create release tag
```

---

## Upcoming (Roadmap)

- **v1.7**: Industrial Mode — monochrome/glitch aesthetic, N&B post-process, new Industrial generators (see `ROADMAP_v1.7.md`)
- **v1.8**: Remote Control — WebSocket + PWA tablet UI with Performance / Director / Spectator modes (see `ROADMAP_v1.8.md`)
- **v2.0**: Desktop UI refresh aligned with Industrial direction + mature remote

---

**Last Updated**: 2026-06-11  
**Maintainer**: Olivier Bareau  
**For**: Claude Code
