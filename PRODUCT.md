# Product

## Register

product

## Users

Electronic musicians and producers working in studio composition environments. They use Terminal-Synth as a real-time visual companion during music creation—generative visuals that respond to audio input and MIDI control, creating a audiovisual feedback loop that informs compositional decisions. Work primarily in dark rooms or dimly-lit studios with audio monitoring; the interface is secondary to the visual output, accessed via keyboard shortcuts and MIDI mappings to avoid interrupting creative flow.

## Product Purpose

Terminal-Synth is a dark industrial visual synthesizer that bridges music production and audiovisual composition. It generates responsive, procedurally-driven visuals from audio analysis (FFT), MIDI input, and generative algorithms. The core value is immediate, live audiovisual feedback during music creation—helping producers hear their compositions differently through visual metaphor. Success is measured by: (1) aesthetic coherence between sound and vision, (2) hands-free operation (keyboard shortcuts + MIDI learn for workflow integration), (3) generation of surprising but on-brand visual outputs, and (4) performance headroom for live use (60+ FPS on modest hardware).

## Brand Personality

**Industrial, Dark, Minimalist**

Voice: Technical, confident, understated. Tone: Precise but not cold; mysterious but not obscure. The interface is a control surface for deep visual/audio exploration, not a marketplace or tutorial. Favors function over visual commentary; every UI element has clear purpose and no decorative excess.

Emotional goals: Evoke precision, creative possibility, contemplation. The brand is "ROBOTARIIS universe" (Olivier's SF context)—dark futuristic, extraterrestrial without being playful, grounded in technical possibility.

## Anti-references

**Explicitly avoid:**
- SaaS/corporate UI patterns (card stacks, gradient accents, rounded-square icon tiles, "let's get started" copy)
- Bright or warm color palettes (neon pinks, sunset gradients, warm neutrals)
- Skeuomorphic hardware metaphors (realistic knob rendering, faux-leather backgrounds)
- Overly nested/complex menu hierarchies
- Explanatory UI (tooltips, onboarding, microcopy encouraging exploration)

**Embrace instead:**
- Direct control surface aesthetic (Elektron, Eurorack, terminal/CLI)
- Monochrome + strategic accent (cyan/magenta, green/purple in dark context)
- Grid-based, left-aligned information density
- Keyboard-first, MIDI-native interaction model
- Dark theme as default; light theme as optional contrast

## Design Principles

1. **Direct operability**: Every control is immediately clickable or shortcut-accessible. No discovery required; users know where to go.
2. **Dark-native aesthetic**: Dark is not a theme option; it's the foundational visual language. Light theme is a utility inversion, not a redesign.
3. **Audio responsiveness shapes UI**: Visual feedback (Master Brightness, MIDI mappings, sequencer playback indicators) is integral to the design, not an afterthought.
4. **Generative beauty over instructional clarity**: The visual output is the primary product; the UI disappears in use. Interface communicates through constraint and affordance, not explanation.
5. **Performance is visible**: Smooth rendering at 60+ FPS is a design principle, not a technical implementation detail. Lag is a UX failure.

## Accessibility & Inclusion

- **WCAG 2.1 AA minimum** for UI contrast (body text ≥4.5:1 against background, interactive elements ≥3:1).
- **Keyboard operability**: All features accessible via keyboard shortcuts; MIDI Learn enables hardware control without GUI interaction.
- **Reduced motion support**: Animation (Master Brightness fade, sequencer playback) respects `prefers-reduced-motion`.
- **Color contrast in dark mode**: Cyan/magenta accents chosen for visibility against dark bg; avoid pure white text (use off-white or tinted).
- **No required learning curve**: Visual output is self-evident; controls are standard (sliders, toggles, grids). Documentation is reference, not prerequisite.

---

**Project**: Terminal-Synth v1.5.0  
**Framework**: Electron 34 + TypeScript 5.7 + WebGL2 (GLSL ES 3.00)  
**Repo**: https://github.com/obareau/terminal-synth  
**Maintainer**: Olivier Bareau
