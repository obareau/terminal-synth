# Terminal-Synth v1.2.0 - Release Notes

## 🎉 Major Features

### 💡 Master Brightness (NEW)
- **Audio-Reactive Fade to Black**: Image fades to quasi-black (1%) during silence
- **Progressive Reveal**: As audio level rises, image appears gradually
- **Smooth Transitions**: Exponential moving average for natural fading
- **Extended Slider Control**: 100% brightness at minimum to 200% at maximum
- **Perfect for Music**: Ideal fade-in/fade-out transitions at song start/end
- **Keyboard Shortcut**: Press **B** to toggle

### 🎛️ Sequencer & MIDI Learn (v1.0.1)
- 16-step BPM-synced automation grid (Ableton Live-style)
- Keyframe editing with easing functions
- Copy/Paste/Randomize/Record operations
- Unlimited MIDI CC-to-parameter mappings
- Real-time waveform visualization
- Presets save/load with full state

### 🌀 Generative Automation
- 4 preset modes: Gentle, Chaotic, Psycho, Glitch
- Probabilistic mutations and drift
- 50-state snapshot history
- Full Undo/Redo support

## 🎨 Visual Features

- **91 Generators**: Wireframe orbits, geometry, fractals, noise, patterns
- **31 Effects**: Distortion, color, texture, feedback chains
- **23 Disruptors**: Audio-triggered glitches and visual effects
- **6 Generator Categories**: All, Text, Plasma, Geometry, Noise, Interactive
- **11 Blend Modes**: Normal, Add, Screen, Overlay, etc.
- **Layer B System**: Dual generators with compositing
- **Pixelized Text Layer**: Dynamic words with audio reactivity

## 🎵 Audio & MIDI

- FFT Analysis: Bass, Mid, Treble, Level
- MIDI Input: Keyboard, controllers, pitch bend
- System Audio: Loopback and microphone input
- BPM Sync: Measured timing for sequencer
- Audio-Reactive: Generators and effects respond to music

## 🎬 Performance & Export

- WebGL2 multi-pass rendering pipeline
- Real-time performance monitoring (FPS, CPU, GPU)
- WebM video export with audio sync
- High-quality rendering at any resolution

## 🎮 Interface

### Keyboard Shortcuts
- `B` - Master Brightness toggle
- `X` - ASCII mode toggle
- `F` - Fullscreen
- `A` - Audio toggle
- `M` - MIDI toggle
- `Ctrl+A` - Autoplay toggle
- `Ctrl+R` - Record video
- `Ctrl+Z/Y` - Undo/Redo
- `Shift+Q` - Sequencer toggle
- `Shift+Space` - Sequencer play/stop
- `Shift+L` - MIDI Learn mode
- `C` - Copy keyframes
- `V` - Paste keyframes
- `Shift+R` - Randomize keyframes

## 📊 Technical

- **Engine**: Electron 34 + TypeScript 5.7
- **Graphics**: WebGL2 + GLSL ES 3.00
- **Audio**: Web Audio API (FFT)
- **Build**: esbuild + electron-builder
- **Testing**: Jest with 36+ test suite

## 🐛 Bug Fixes & Improvements

- Fixed Master Brightness implementation (CSS filter approach)
- Smooth audio level fading with exponential moving average
- Improved auto-switch safety for extreme brightness levels
- Better parameter smoothing for musical transitions

## 📦 Installation

### Linux (Debian/Ubuntu)
```bash
sudo dpkg -i terminal-synth_1.2.0_amd64.deb
terminal-synth
```

### macOS
```bash
npm install
npm run package:mac
# or download from releases
```

### Windows
```bash
npm install
npm run package
# or download portable exe from releases
```

## 🎯 Known Limitations

- Large .deb package (~105MB) - not included in GitHub releases
- Some MIDI controllers may need manual configuration
- GPU requirements: WebGL2 capable device

## 🙏 Credits

**Developer**: Olivier Bareau  
**Inspired by**: VS (Visual Synthesizer) by Imaginando  
**License**: MIT

---

**v1.2.0** · Dark industrial visual synthesizer · Audio-reactive · MIDI-controllable · Generative
