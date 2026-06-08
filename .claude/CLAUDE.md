# Terminal-Synth Project Instructions

> Custom project guidelines for Terminal-Synth development with Claude Code

---

## Project Overview

**Terminal-Synth** is a dark industrial visual synthesizer built with:
- **Electron 34** + **TypeScript 5.7**
- **WebGL2** (GLSL ES 3.00) for rendering
- **Web Audio API** for FFT analysis
- **esbuild** for bundling

**Current Version**: v1.2.0  
**Status**: Active development  
**License**: MIT

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
| `src/renderer/shaders.ts` | Generator definitions | 91 GLSL ES 3.00 generators |
| `src/renderer/effects.ts` | Post-process effects | 31 effect definitions |
| `src/renderer/disruptors.ts` | Audio-triggered glitches | 23 disruptor effects |
| `src/renderer/sequencer.ts` | Automation system | `Sequencer` (16-step grid) |
| `src/renderer/midiLearn.ts` | CC mapping | `MidiLearner` (learn mode) |
| `src/renderer/audio.ts` | FFT analysis | `AudioInput` (Web Audio API) |
| `src/renderer/renderer.ts` | Main event loop | Frame loop + UI glue |

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

### Master Brightness (v1.2.0) ⭐
- **Toggle**: `B` key
- **Slider**: Adjust amplitude (100% → 200% at peak)
- **Effect**: Fade to black with audio level (smooth transitions)
- **Files**: `renderer.ts` (lines 1014-1048)

### Sequencer (v1.0.1)
- **Toggle**: `Shift+Q`
- **Play/Stop**: `Shift+Space`
- **Copy/Paste**: `C` / `V`
- **Randomize**: `Shift+R`
- **MIDI Learn**: `Shift+L`
- **Files**: `sequencer.ts`, `midiLearn.ts`, `renderer.ts` (handlers)

### Generator Selection
- Keys: `1-9`, `q-p`, `a-k` (91 total generators)
- **Files**: `shaders.ts` (generator definitions), `renderer.ts` (selection logic)

### Audio Controls
- **Toggle Audio**: `A` key
- **Toggle MIDI**: `M` key
- **System Audio**: Loopback or microphone input
- **FFT Analysis**: Real-time bass/mid/treble/level bands

---

## Development Guidelines

### When Adding Features

1. **Sequencer/Automation**: Edit `src/renderer/sequencer.ts` + `renderer.ts` frame loop
2. **MIDI Mapping**: Edit `src/renderer/midiLearn.ts` + `renderer.ts` CC handlers
3. **Generators**: Add to `src/renderer/shaders.ts` (GLSL code block)
4. **Effects**: Add to `src/renderer/effects.ts` (post-process shader)
5. **UI Elements**: Add to `src/renderer/index.html` + `renderer.ts` event listeners
6. **Styling**: Add to `src/renderer/index.html` `<style>` or separate CSS

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

### Update a Parameter
```typescript
// In renderer.ts frame loop:
// Parameters are applied via sequencer or MIDI Learn
const value = sequencer.getParameterValue("shader.u_p0");
if (value !== null) currentParamValues[0] = value;
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
| Memory leak in long sessions | Check sequencer snapshot history (50 max) |
| WebGL errors on startup | Ensure WebGL2 device, check GPU drivers |
| Sequencer not syncing | Verify BPM setting, check audio.sample() timing |
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

**Last Updated**: June 2026  
**Maintainer**: Olivier Bareau  
**For**: Claude Code (Claude Haiku 4.5)
