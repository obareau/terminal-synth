# ROADMAP — v1.7 — Industrial Mode

> **Goal**: Push Terminal-Synth's visual identity toward a darker, more minimal, more modern aesthetic — monochrome, industrial, glitch-driven, Shadertoy-grade.

**Status**: Planning
**Target release**: v1.7.0
**Predecessor**: v1.6.0 (Adaptive Autoplay + Music Analysis)

---

## 1. Aesthetic Direction

### Visual North Star

- **Palette**: pure monochrome — deep black, high-contrast whites, gradients of gray. Optional cold tints (phosphor green, blueprint cyan, sepia warm) as alternate "industrial palettes".
- **Texture**: grain, dithering, halftone, scanlines, CRT artifacts, noise.
- **Forms**: strict geometry — grids, glyphs, codes, ASCII, datamatrix, schematics, isolines, contour maps.
- **Motion**: glitch, datamosh, frame-displacement, block-shift, scan jitter, signal loss.

### References

- **Artists**: Ryoji Ikeda, Alva Noto, Carsten Nicolai, Raster-Noton catalog
- **Shadertoy tags**: `blackandwhite`, `glitch`, `dither`, `ascii`, `signal`, `tv`, `crt`
- **Films/games**: Tenet visuals, Cyberpunk glitch idents, Mr. Robot opening, Severance UI

### Anti-references (what we move away from)

- Saturated rainbow palettes
- Soft pastel gradients
- Generic plasma / smooth blob aesthetics
- "VJ presets" feel

---

## 2. Implementation Strategy — Toggle + Curation

Hybrid approach: keep existing work alive while introducing the new direction.

### Phase 1 — `Industrial Mode` toggle (v1.7.0)

A single global toggle (`I` key) that activates:

1. **Global N&B post-process** as a final pass before output
2. **Glitch disruptors set** swapped for native-monochrome glitch effects
3. **Visual indicator** (small badge top-right)
4. **Palette selector** sub-menu: `Pure B&W`, `Phosphor Green`, `Blueprint`, `Sepia Cold`

**Backward compatibility**: when OFF, behavior identical to v1.6.0.

### Phase 2 — Native Industrial generators (v1.7.1 / v1.7.2)

Add 20 new generators built mono-first (no color reliance). Marked with `category: "Industrial"`.

### Phase 3 — Curation (v1.7.3+)

- Tag legacy generators/effects as `Legacy` vs `Industrial`
- Autoplay can be biased to pick only one set
- Eventually (v2.0) consider deprecation of pure-color effects

---

## 3. Technical Specs

### 3.1 N&B Post-Process Pass

**Location**: new file `src/renderer/industrialMode.ts` + hook in `gl.ts` pipeline.

**Algorithm** (final pass, applied after disruptors, before output):

```glsl
// Luminance extraction (Rec. 709)
float lum = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));

// Contrast curve (configurable)
lum = pow(lum, u_industrial_gamma);    // default 0.85
lum = clamp((lum - 0.5) * u_industrial_contrast + 0.5, 0.0, 1.0); // default 1.4

// Dithering (Bayer 8x8 ordered dither)
float dither = bayer8(gl_FragCoord.xy) - 0.5;
lum += dither * u_industrial_dither;    // default 0.05

// Optional tint application
vec3 outColor = mix(vec3(lum), tintRamp(lum, u_industrial_palette), u_industrial_tint);
```

**Parameters** (exposed in UI + autoplay-controllable):
- `gamma` (0.5 – 1.5)
- `contrast` (0.5 – 2.5)
- `dither` (0.0 – 0.2)
- `tint` (0.0 – 1.0)
- `palette` enum: `bw | phosphor | blueprint | sepia`

### 3.2 Glitch Disruptors (Industrial Set)

Replace/extend `disruptors.ts` with these mono-native disruptors:

| Name | Trigger | Effect |
|------|---------|--------|
| `Block Displace` | bass kick | 8×8 blocks shifted by audio amplitude |
| `Scan Tear` | onset | Horizontal slice offset on N consecutive lines |
| `Frame Hold` | silence | Freeze last frame for 1–4 frames |
| `Datamosh` | mid energy | P-frame-style motion smear |
| `Signal Loss` | sudden drop | Black bars + white noise sweep |
| `Sync Lost` | bass | Vertical roll (analog TV) |
| `Bit Crush` | treble | Quantize luminance to N levels |
| `Glyph Storm` | onset | Burst of ASCII/glyph overlay |
| `Halftone Pulse` | beat | Dot size modulated by amplitude |
| `Scanline Density` | level | Line spacing pulses with energy |
| `Contour Shock` | onset | Edge detection flash |
| `Negative Flash` | drop | Invert luminance for 1–3 frames |

### 3.3 New Industrial Generators (target: 20)

Initial list (concept + GLSL approach):

| # | Name | Concept |
|---|------|---------|
| 1 | `Grid Pulse` | Modulated grid lines, audio-reactive thickness |
| 2 | `Glyph Field` | Field of random monospace glyphs, density = level |
| 3 | `Tunnel Schematic` | Wireframe perspective tunnel |
| 4 | `Contour Map` | Isolines from noise, scrolling |
| 5 | `Datamatrix Rain` | Vertical scrolling binary/hex |
| 6 | `Halftone Sphere` | Dot-pattern sphere, audio-deformed |
| 7 | `Scan Bars` | Animated horizontal scan with phase noise |
| 8 | `Wire Cube Array` | Rotating wireframe cubes grid |
| 9 | `Plotter Lines` | Parallel lines with sinus modulation |
| 10 | `Signal Spectrum` | FFT bars, abstracted to vertical bands |
| 11 | `Binary Static` | Field of 0/1 with audio-driven flips |
| 12 | `Iso Mountains` | Contour-line mountain ranges |
| 13 | `Circuit Trace` | PCB-style trace generation |
| 14 | `Phosphor Trails` | Persistent decay, vector-monitor style |
| 15 | `ASCII Tunnel` | Tunnel rendered in ASCII directly in shader |
| 16 | `Glyph Tunnel` | Same but with arbitrary glyph set |
| 17 | `Strobe Grid` | Flashing grid cells on beat |
| 18 | `Noise Bands` | Horizontal bands of evolving noise |
| 19 | `Bitmap Smear` | Pixel-shifted bitmap with motion smear |
| 20 | `Code Cascade` | Scrolling fake code (Matrix-but-monospace-real) |

All written mono-first; color (if any) added as tint pass.

### 3.4 Autoplay Integration

Update `autoplayAdapter.ts`:
- New flag `industrialOnly: boolean` (default off)
- When ON, autoplay picks only `category: "Industrial"` generators + glitch disruptors
- N&B post-process params (gamma, contrast, dither) become autoplay-controllable

---

## 4. UI Changes

### Top bar
- New badge: `[ INDUSTRIAL ]` when active
- Palette dropdown (4 options)

### Right panel — new section "Industrial"
- Toggle: Industrial Mode (`I`)
- Sliders: Gamma, Contrast, Dither, Tint
- Selector: Palette (B&W / Phosphor / Blueprint / Sepia)
- Toggle: Industrial-only autoplay

### Keyboard
- `I` — toggle Industrial Mode
- `Shift+I` — cycle palettes

---

## 5. Milestones

| Milestone | Scope | Estimated effort |
|-----------|-------|------------------|
| **v1.7.0** | Toggle, N&B pass, palette system, 12 glitch disruptors, UI hooks | ~1 week |
| **v1.7.1** | First 10 Industrial generators | ~1 week |
| **v1.7.2** | Remaining 10 generators + refinement | ~1 week |
| **v1.7.3** | Legacy/Industrial categorization + autoplay biasing | ~3 days |
| **v1.7.4** | **Performance pass** (required before v1.8) — see §6.1 below | ~3-5 days |

---

## 6.1 Performance pass (v1.7.4 — gating v1.8)

The Industrial generators tend toward long inner loops (multi-octave fbm,
sample-stack trails). After v1.7.0 shipping with a first round of trims
(PHOSPHOR TRAILS 14→8, PLOTTER LINES 24→14, BITMAP SMEAR 6→3), the full
pass owes the codebase a systematic audit.

**Audit checklist**

- [ ] **Per-shader frame budget** — instrument `gl.getQueryParameter` (EXT_disjoint_timer_query) or wall-clock around `pipeline.render` and log per-shader cost. Tag shaders >2ms at 1080p.
- [ ] **Hot offenders** to review next pass:
  - `CONTOUR MAP`, `ISO MOUNTAINS`, `NOISE BANDS` — 5-octave fbm × 4 hashes per octave = 20 hashes/px. Consider precomputed noise texture.
  - `WIRE CUBE ARRAY`, `STROBE GRID` — per-cell `hash()` × time-keyed re-evaluation. Cache via texture lookup.
  - `Datamosh`, `Frame Hold` disruptors — `fb()` reads cost a full extra texture sample; chain them = bandwidth.
- [ ] **FBO size audit** — confirm framebuffer matches canvas size only, not DPR-doubled when unnecessary. Cap DPR at 1.5 for 4K monitors when fps drops.
- [ ] **Stage chain length** — limit simultaneous active disruptors when chain > N stages (autoplay can pick fewer when energy is high).
- [ ] **ASCII layer cost** — pixel readback on every frame is expensive; throttle to 30Hz max instead of full fps.
- [ ] **Industrial Mode pass** — currently appended as one stage. Consider folding into final composite when only B&W palette is active (no separate pass).
- [ ] **Auto-degrade** — if measured fps < 50 for 5s, drop one of: dither bits, FBO scale, active disruptors. Surfaces as a single "Perf mode" toggle to the user.

**Done criteria**

- 60 fps sustained at 1080p with: Industrial Mode ON + autoplay + 3 effects + 3 disruptors firing, on the reference machine (GTX 1060 equivalent).
- No single shader >3ms/frame at 1080p.

## 6. Risks & Open Questions

- **Risk**: N&B pass kills the readability of some legacy effects → mitigated by toggle being off by default
- **Risk**: 20 new generators is ambitious — fallback: ship v1.7.0 + 10 generators, ship rest in v1.7.x
- **Open**: Should the master brightness CSS filter interact with the N&B gamma? → Probably yes, but verify
- **Open**: Performance impact of dithering at 4K — measure on GTX 1060

---

## 7. Definition of Done (v1.7.0)

- [ ] Toggle `I` enables Industrial Mode with no visible delay
- [ ] All 4 palettes selectable, look distinct and intentional
- [ ] At least 8 new glitch disruptors trigger on audio
- [ ] N&B params reachable from UI and survive autoplay
- [ ] No regression on v1.6.0 behavior when Industrial Mode is OFF
- [ ] Tests added for `industrialMode.ts` luminance + dither functions
- [ ] CHANGELOG entry + README screenshots updated
