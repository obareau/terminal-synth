# Terminal-Synth Development Roadmap

> **Vision**: Dark industrial visual synthesizer with generative automation, real-time audio reactivity, and professional MIDI integration for live performances and AV content creation.

---

## ✅ Released

### v1.2.0 (Current)
- ✅ **Master Brightness**: Audio-reactive fade to black with smooth transitions
- ✅ **Sequencer**: 16-step Ableton Live-style automation grid with keyframes
- ✅ **MIDI Learn**: CC-to-parameter mapping with curve types
- ✅ **91 Generators**: Wireframe, geometry, fractals, noise, patterns
- ✅ **31 Effects**: Distortion, color, texture, feedback chains
- ✅ **23 Disruptors**: Audio-triggered glitches and visual effects
- ✅ **Generative Automation**: 4 preset modes with mutation/drift
- ✅ **Linux .deb Package**: Official Debian/Ubuntu distribution

### v1.0.1-delta
- Sequencer + MIDI Learn system
- 91 generators with audio reactivity
- Comprehensive effects/disruptors chain

---

## 🚀 Planned Features

### v1.3.0 (Next Release)
**Timeline**: Q3 2026

#### Multi-Track Sequencer
- [ ] Expand from 1 track to 4-8 parallel tracks
- [ ] Independent keyframes per track
- [ ] Track enable/disable toggles
- [ ] Track color-coding for clarity
- **Why**: More complex generative patterns, stacked automation effects

#### Advanced MIDI Features
- [ ] MIDI CC feedback (send to controller display)
- [ ] Pitch bend and aftertouch mapping
- [ ] Note-to-parameter triggering
- [ ] MIDI sync (clock, start/stop from DAW)
- **Why**: Seamless DAW integration, live performance feedback

#### Performance Improvements
- [ ] Shader compilation caching
- [ ] WebGL2 advanced instancing
- [ ] GPU memory optimization
- [ ] Frame buffering strategies
- **Why**: Smoother 60fps at 4K resolution

#### UI Enhancements
- [ ] Dark theme refinement (OLED-optimized)
- [ ] Customizable panel layouts
- [ ] Preset browser with search/tags
- [ ] Real-time waveform scope per generator
- **Why**: Better usability for long sessions

---

### v1.4.0 (Future Release)
**Timeline**: Q4 2026

#### Recording & Export
- [ ] H.264 video export (faster than WebM)
- [ ] Synchronized audio track embedding
- [ ] Batch rendering (render multiple presets)
- [ ] Custom resolution/framerate output
- [ ] Screen region recording (partial screen)
- **Why**: Professional VJ/streaming workflow

#### Advanced Sequencer
- [ ] Polyrhythmic sequences (different step counts per track)
- [ ] Probability-based keyframes (random value ranges)
- [ ] Nested sequences (loops within loops)
- [ ] Swing/shuffle timing offset
- **Why**: Generative complexity, evolving patterns

#### Generator Enhancements
- [ ] Custom shader editor (GLSLify integration)
- [ ] Generator blending/morphing
- [ ] 3D generator support (WebGL3D experiments)
- [ ] User-uploaded shader library
- **Why**: Unlimited creative possibilities

#### Network Features
- [ ] OSC input/output (TouchOSC, Max/MSP)
- [ ] ArtNet/DMX support (stage lighting integration)
- [ ] Multi-machine synchronization
- [ ] Preset sharing platform (cloud sync)
- **Why**: Multi-device setups, collaborative performances

---

### v1.5.0+ (Long-term Vision)
**Timeline**: 2027+

#### VJ Mode / Live Performance
- [ ] Multi-window output (main + preview + controller)
- [ ] Cue system with fade timing
- [ ] BPM-locked crossfader
- [ ] Beat-sync animations
- [ ] Performance HUD overlay
- **Why**: Professional VJ tool for clubs/festivals

#### AI Integration (Experimental)
- [ ] ML-based generative parameter suggestions
- [ ] Audio waveform → generative shape mapping
- [ ] Preset auto-categorization
- [ ] Real-time performance analysis
- **Why**: Adaptive performances, emergent creativity

#### Spatial Audio & 3D
- [ ] Ambisonic audio output
- [ ] 3D spatial visualization (WebGL3D)
- [ ] Volumetric rendering experiments
- [ ] VR/AR headset support (WebXR)
- **Why**: Immersive experiences, spatial design

#### Studio Integration
- [ ] DAW plugin version (VST3/AU)
- [ ] Ableton Link deep integration
- [ ] Real-time parameter preview in DAW
- [ ] Session recovery after crashes
- **Why**: Studio workflow, professional music production

---

## 🔧 Maintenance & Improvements

### Bug Fixes & Performance
- [ ] Fix MIDI controller lag on some devices
- [ ] Optimize framebuffer resize handling
- [ ] Improve ASCII mode performance
- [ ] Reduce memory footprint on older GPUs
- [ ] Better error reporting for WebGL failures

### Code Quality
- [ ] Increase test coverage (currently ~70%)
- [ ] Refactor effect chain architecture
- [ ] Standardize parameter naming
- [ ] Add JSDoc comments to core modules
- [ ] Extract utility functions

### Documentation
- [ ] Video tutorials (getting started, sequencer, MIDI)
- [ ] Interactive documentation website
- [ ] Generator gallery with descriptions
- [ ] Community showcase
- [ ] French/English docs parity

---

## 📋 Known Limitations

### Current Constraints
- **Memory**: Large .deb package (~105MB) due to Electron bundling
- **CPU**: Some effect chains can hit 100% on older processors
- **GPU**: Requires WebGL2 capable device (Intel HD 4000+, NVIDIA GTX 400+)
- **MIDI**: Some controllers need manual configuration
- **Windows**: No native M1 Mac support (Intel only)
- **Audio**: Loopback audio requires separate software on some systems

### Not Planned
- ❌ Mobile/tablet version (Electron desktop-only)
- ❌ Web browser version (performance requirements)
- ❌ Reverse rendering (image → audio)
- ❌ Networked multiplayer sync (architectural complexity)
- ❌ Real-time collaboration (cloud infrastructure needed)

---

## 🎯 Design Philosophy

### Core Principles
1. **Minimalism**: Dark industrial aesthetic, no unnecessary UI chrome
2. **Audio-First**: Every visual responds to sound input
3. **Generativity**: Algorithmic patterns, not just manual control
4. **Performance**: 60fps on mid-range hardware (GTX 1060 baseline)
5. **Open Source**: MIT license, community contributions welcome

### Not In Scope
- Bloated UI with 100+ settings
- Cloud/online features
- Ad-supported or subscription model
- Corporate/proprietary integrations

---

## 📊 Community Feedback Priorities

**Top Requested Features** (from GitHub issues):
1. Multi-track sequencer (8 votes)
2. OSC input support (6 votes)
3. Custom shader editor (5 votes)
4. Better preset management (5 votes)
5. MIDI sync/clock (4 votes)

**Top Reported Issues** (by frequency):
1. MIDI lag on some controllers (3 reports)
2. Memory usage on 8GB+ systems (2 reports)
3. Audio sync timing (2 reports)
4. Generator parameter ranges (1 report)

---

## 🚦 Release Schedule

```
v1.2.0 ✅ (Shipped)
  ├─ Jun 2026: Master Brightness
  └─ v1.2.0 Release

v1.3.0 📅 (Next)
  ├─ Q3 2026: Multi-track sequencer
  ├─ Q3 2026: MIDI feedback
  └─ Q3 2026: Performance optimizations

v1.4.0 🎯 (Future)
  ├─ Q4 2026: Video export improvements
  ├─ Q4 2026: Custom shader editor
  └─ Q4 2026: OSC/DMX support

v1.5.0+ 🌟 (Vision)
  ├─ 2027: VJ mode + live performance
  ├─ 2027: AI generative features
  └─ 2027: 3D spatial audio
```

---

## 🔗 Contributing

Interested in helping? See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Easy Issues for Contributors**:
- [ ] Add more generator examples to docs
- [ ] Translate UI strings to other languages
- [ ] Write tutorial content
- [ ] Test on different GPU models
- [ ] Report bugs with minimal reproducible examples

---

## 📞 Support & Feedback

- **Report Bugs**: [GitHub Issues](https://github.com/obareau/terminal-synth/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/obareau/terminal-synth/discussions)
- **Email**: olivier.bareau@gmail.com
- **Community**: Discord server (coming soon)

---

## 🎨 Long-term Vision

Terminal-Synth is envisioned as a **professional-grade VJ tool** for:
- **Live performances** at clubs, festivals, galleries
- **Audiovisual installations** with generative evolution
- **Music production** with real-time shader visualization
- **Research** in generative graphics & audio reactivity

The ultimate goal: **democratize high-quality audiovisual creation** through open-source, accessible, and creative tools.

---

**Last Updated**: June 2026  
**Maintainer**: Olivier Bareau  
**Status**: Active Development
