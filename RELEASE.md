# terminal-synth Release Guide

## Current Version: v0.1.0

### Windows Executable (Pre-Built)

The Windows portable executable is available in the `release/` directory:
- **File**: `terminal-synth 0.1.0.exe` (69.8 MB)
- **Location**: `C:\Users\obare\DEV\terminal-synth\release\terminal-synth 0.1.0.exe`
- **Type**: Portable (no installation required)
- **Run**: Double-click to launch

### Building for Other Platforms

#### macOS

```bash
npm run package:mac
# Outputs: release/terminal-synth 0.1.0.dmg (Intel x64)
#          release/terminal-synth 0.1.0-arm64.dmg (Apple Silicon)
#          release/terminal-synth 0.1.0.zip (Intel)
#          release/terminal-synth 0.1.0-arm64.zip (Apple Silicon)
```

#### Linux

```bash
npm run package:linux
# Outputs: release/terminal-synth 0.1.0.AppImage
```

### Creating a GitHub Release

1. Go to: https://github.com/obareau/terminal-synth/releases
2. Click "Draft a new release"
3. Tag: `v0.1.0` (or increment as needed)
4. Title: `terminal-synth v0.1.0`
5. Description: (see below)
6. Attach binaries:
   - Windows: `release/terminal-synth 0.1.0.exe`
   - macOS: `release/terminal-synth 0.1.0.dmg` + `release/terminal-synth 0.1.0-arm64.dmg`
   - Linux: `release/terminal-synth 0.1.0.AppImage`
7. Publish Release

#### Release Notes Template

```markdown
# terminal-synth v0.1.0

Dark/industrial visual synthesizer with real-time audio-reactive GLSL shaders.

## What's New

### Features
- **26+ GLSL generators** with real-time parameter control (u_p0-p3 uniforms)
- **Floyd-Steinberg dithering effect** for ordered color quantization
- **11 blend modes** for layer composition
- **6 perturbators** (audio-triggered glitch effects)
- **Terrain (Joy Division)** rewritten for Unknown Pleasures album cover visual
- **ASCII mode** with adjustable character density
- Real-time FFT analysis (bass, mid, treble, level)
- MIDI input for generative control
- **3-column professional layout** (sources, canvas, effects)
- **Layer system** with blend modes and opacity control
- **RECTA TUI overlay** (terminal-style metadata)
- **Preset system** (save/load JSON)
- **Video export** (WebM with audio)

### Technical
- WebGL2 multi-pass pipeline with ping-pong framebuffers
- Extended parameter architecture (u_p0-p3 + holdMs for text generators)
- Full generator parameter coverage (Tunnel, Plasma, Matrix Rain, Radar, etc.)
- Floyd-Steinberg dithering algorithm for error diffusion

## Installation

**Windows**: Download `terminal-synth 0.1.0.exe` and run
**macOS**: Download `.dmg` and drag to Applications
**Linux**: Download `.AppImage` and run

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| 1-9, q-p, a-k | Select generator |
| Tab | Focus mode (fullscreen) |
| A | Toggle audio |
| M | Toggle MIDI |
| X | Toggle ASCII |
| T | Toggle RECTA text |
| Ctrl+S | Save preset |
| Ctrl+O | Load preset |
| Ctrl+R | Record video |
| F | Fullscreen |

## Requirements

- GPU with WebGL2 support
- ~100MB disk space
- Audio input device (system loopback or microphone)

---

Built with: Electron, TypeScript, WebGL2, GLSL
```

### Version Bumping

To release a new version:

1. Update `package.json` version
2. Update `README.md` with new features
3. Commit with message: `chore: bump to v0.X.Y`
4. Tag: `git tag v0.X.Y && git push --tags`
5. Build: `npm run package` (Windows) or platform-specific commands
6. Create GitHub release with binaries

### Build Artifacts Location

After running `npm run package*`:
- Windows: `release/terminal-synth 0.X.Y.exe`
- macOS: `release/terminal-synth 0.X.Y.dmg`, `release/terminal-synth 0.X.Y-arm64.dmg`, `release/terminal-synth 0.X.Y.zip`
- Linux: `release/terminal-synth 0.X.Y.AppImage`

Clean old builds with: `rm -rf release/*` before building.
