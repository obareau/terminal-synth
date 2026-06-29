import { Shader } from "./shaders";

export const LOFI_SHADERS: Shader[] = [

  // ── LO-FI TAPE ────────────────────────────────────────────────────────────

  {
    name: "VHS Static",
    category: "Lofi",
    src: `vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 p = uv;
  // Horizontal tracking lines
  float line = floor(p.y * 240.0);
  float roll = sin(t * 0.3 + line * 0.04) * 0.003 * (0.5 + u_bass);
  p.x += roll;
  // Static noise
  float n = fract(sin(dot(p * vec2(127.1, 311.7) + t, vec2(1.0))) * 43758.5453);
  // Scanline darkness
  float scan = 0.85 + 0.15 * step(0.5, fract(p.y * 240.0));
  // Color bleed — slight rgb split
  float r = n * 0.12 * (0.3 + u_level) * scan;
  float g = n * 0.08 * (0.3 + u_mid)   * scan;
  float b = n * 0.06 * (0.3 + u_treble) * scan;
  // Tape crinkle — warm brownish base
  vec3 base = vec3(0.18, 0.12, 0.08) * scan;
  // Dropout bands
  float drop = step(0.97, fract(sin(line * 0.07 + t * 1.3) * 327.4)) * 0.6 * u_bass;
  base = mix(base, vec3(0.9, 0.85, 0.7), drop);
  return base + vec3(r, g, b);
}`,
  },

  {
    name: "Super 8",
    category: "Lofi",
    src: `vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 p = uv;
  // Film grain
  float grain = fract(sin(dot(p + fract(t * 24.0), vec2(127.1, 311.7))) * 43758.5) - 0.5;
  // Vignette
  float v = 1.0 - smoothstep(0.3, 0.9, length(p - 0.5) * 1.4);
  // Sprocket holes on left edge
  float hole = step(p.x, 0.04) * step(0.5, fract((p.y - t * 0.05) * 8.0));
  // Warm amber color grade
  vec3 col = vec3(0.85, 0.72, 0.45) * v;
  col += grain * 0.18 * (0.5 + u_level);
  // Light leak on beat
  float leak = u_bass * smoothstep(0.8, 1.0, sin(t * 0.7 + p.x * 3.0) * 0.5 + 0.5);
  col = mix(col, vec3(1.0, 0.9, 0.4), leak * 0.4);
  col = mix(col, vec3(0.0), hole);
  // Jitter on beat
  if (u_bass > 0.7) col += vec3(grain * 0.3 * u_bass);
  return clamp(col, 0.0, 1.0);
}`,
  },

  {
    name: "Lo-Fi Waves",
    category: "Lofi",
    src: `vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = uv - 0.5;
  // Slow organic wave layers
  float w1 = sin(p.x * 4.0 + t       + p.y * 2.0 + u_bass * 1.5) * 0.5 + 0.5;
  float w2 = sin(p.x * 6.0 - t * 1.3 + p.y * 3.0 + u_mid  * 2.0) * 0.5 + 0.5;
  float w3 = sin(p.y * 5.0 + t * 0.7 + p.x * 2.5 + u_treble * 1.8) * 0.5 + 0.5;
  // Lo-fi palette — muted purples, teals, ambers
  vec3 ca = vec3(0.55, 0.38, 0.62);
  vec3 cb = vec3(0.25, 0.55, 0.52);
  vec3 cc = vec3(0.72, 0.58, 0.28);
  vec3 col = mix(ca, cb, w1);
  col = mix(col, cc, w2 * 0.5);
  col *= 0.6 + w3 * 0.4;
  // Dithered banding — lo-fi quantize
  col = floor(col * 8.0) / 8.0;
  // Soft grain
  float g = fract(sin(dot(uv + t * 0.1, vec2(127.1, 311.7))) * 43758.5) - 0.5;
  return clamp(col + g * 0.04, 0.0, 1.0);
}`,
  },

  {
    name: "Cassette Hiss",
    category: "Lofi",
    src: `vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 p = uv;
  // Noise base
  float n1 = fract(sin(dot(floor(p * 160.0) + floor(t * 15.0), vec2(127.1, 311.7))) * 43758.5);
  float n2 = fract(sin(dot(floor(p * 80.0)  + floor(t * 7.0),  vec2(269.5, 183.3))) * 47453.3);
  // Warped scanlines
  float scan = step(0.5, fract(p.y * 120.0 + sin(p.y * 30.0 + t * 0.2) * 0.01));
  // Horizontal bands of hiss (audio-driven)
  float band = step(1.0 - u_level * 0.6, fract(p.y * 4.0 + t * 0.05));
  // Dark green phosphor palette
  vec3 phosphor = vec3(0.0, 0.7, 0.2) * (0.4 + n1 * 0.6) * scan;
  phosphor += vec3(0.0, 0.3, 0.05) * n2 * band * u_mid;
  // Dropout flicker
  float flick = step(0.95, fract(sin(t * 7.3 + p.y * 5.0) * 321.7));
  phosphor = mix(phosphor, vec3(0.0), flick * 0.7);
  return phosphor;
}`,
  },

  // ── CHIPTUNE / PIXEL ──────────────────────────────────────────────────────

  {
    name: "Pixel Plasma",
    category: "Lofi",
    src: `vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.8;
  // Hard pixel grid — 64×48 resolution
  vec2 pixel = floor(uv * vec2(64.0, 48.0)) / vec2(64.0, 48.0);
  vec2 p = pixel - 0.5;
  // Classic plasma
  float v  = sin(p.x * 8.0 + t);
  v += sin(p.y * 6.0 + t * 1.1);
  v += sin((p.x + p.y) * 7.0 + t * 0.9);
  v += sin(length(p) * 12.0 - t * 1.5 + u_bass * 3.0);
  v = v * 0.25 + 0.5;
  // Restricted 4-color palette (CGA-style)
  float idx = floor(v * 4.0);
  vec3 c0 = vec3(0.0, 0.0, 0.0);
  vec3 c1 = vec3(0.0, 0.67, 0.67);
  vec3 c2 = vec3(0.67, 0.0, 0.67);
  vec3 c3 = vec3(0.67, 0.67, 0.67);
  vec3 col = idx < 1.0 ? c0 : idx < 2.0 ? c1 : idx < 3.0 ? c2 : c3;
  // Audio flash to white
  col = mix(col, vec3(1.0), step(0.9, u_bass) * 0.4);
  return col;
}`,
  },

  {
    name: "Game Boy",
    category: "Lofi",
    src: `vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  // 160×144 Game Boy resolution
  vec2 p = floor(uv * vec2(160.0, 144.0)) / vec2(160.0, 144.0);
  vec2 c = p - 0.5;
  // Bouncing squares pattern
  float d1 = max(abs(c.x + sin(t * 0.7) * 0.3), abs(c.y + cos(t * 0.5) * 0.25));
  float d2 = max(abs(c.x - sin(t * 0.5 + 1.0) * 0.2), abs(c.y - cos(t * 0.6) * 0.2));
  float d3 = length(c - vec2(sin(t * 0.9) * 0.3, cos(t * 0.8) * 0.3));
  float v = sin(d1 * 20.0 - t * 2.0 + u_bass * 4.0) * 0.5 + 0.5;
  v = mix(v, sin(d2 * 18.0 - t * 1.5) * 0.5 + 0.5, 0.4);
  v = mix(v, sin(d3 * 25.0 - t) * 0.5 + 0.5, u_mid * 0.4);
  // Game Boy 4-shade green palette
  vec3 c0 = vec3(0.608, 0.737, 0.059); // lightest
  vec3 c1 = vec3(0.475, 0.631, 0.067);
  vec3 c2 = vec3(0.188, 0.392, 0.188);
  vec3 c3 = vec3(0.063, 0.235, 0.063); // darkest
  float idx = floor(v * 4.0) / 3.0;
  vec3 col = mix(mix(c0, c1, step(0.33, idx)), mix(c2, c3, step(0.67, idx)), step(0.33, idx));
  return col;
}`,
  },

  {
    name: "Chiptune Bars",
    category: "Lofi",
    src: `vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 p = uv;
  // 8 frequency bars like old chiptune visualizers
  float barW = 1.0 / 8.0;
  float bar  = floor(p.x / barW);
  float barX = fract(p.x / barW);
  // Each bar has its own "frequency" driven by audio
  float freq[8];
  freq[0] = u_bass;
  freq[1] = u_bass * 0.9 + u_mid * 0.1;
  freq[2] = u_bass * 0.5 + u_mid * 0.5;
  freq[3] = u_mid;
  freq[4] = u_mid * 0.7 + u_treble * 0.3;
  freq[5] = u_mid * 0.3 + u_treble * 0.7;
  freq[6] = u_treble;
  freq[7] = u_treble * 0.8 + u_level * 0.2;
  float h = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) == bar) h = freq[i];
  }
  // Pixelated — 16 vertical steps
  float stepped = ceil(h * 16.0) / 16.0;
  float lit = step(1.0 - stepped, p.y);
  // Gap between bars
  float gap = step(0.85, barX);
  // Color: green at top, yellow mid, red bottom
  float barY = (p.y - (1.0 - stepped)) / max(stepped, 0.001);
  vec3 col = mix(vec3(1.0, 0.1, 0.0), vec3(0.1, 1.0, 0.0), clamp(barY, 0.0, 1.0));
  col = mix(col, vec3(0.0, 0.0, 0.02), 1.0 - lit + gap);
  return col;
}`,
  },

  {
    name: "Sine Chip",
    category: "Lofi",
    src: `vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 p = uv - 0.5;
  // Multiple quantized sine waves — chiptune oscilloscope
  float y1 = sin(p.x * 20.0 + t * 3.0 + u_bass * 5.0) * 0.15;
  float y2 = sin(p.x * 31.0 + t * 4.5 + u_mid  * 6.0) * 0.09;
  float y3 = sin(p.x * 47.0 + t * 7.0 + u_treble * 8.0) * 0.05;
  // Quantize y to pixel grid (height = 64 rows)
  y1 = floor(y1 * 32.0) / 32.0;
  y2 = floor(y2 * 32.0) / 32.0;
  y3 = floor(y3 * 32.0) / 32.0;
  // Draw each wave as a line
  float px = floor(p.y * 64.0) / 64.0;
  float l1 = step(abs(px - y1), 1.0 / 64.0) * 1.5;
  float l2 = step(abs(px - y2), 1.0 / 64.0) * 1.2;
  float l3 = step(abs(px - y3), 1.0 / 64.0) * 0.9;
  // Pixel grid
  float grid = (step(0.93, fract(uv.x * 128.0)) + step(0.93, fract(uv.y * 64.0))) * 0.06;
  vec3 col = vec3(0.02, 0.06, 0.02);
  col += vec3(0.0, 1.0, 0.3) * l1;
  col += vec3(0.2, 0.6, 1.0) * l2;
  col += vec3(1.0, 0.4, 0.0) * l3;
  col -= vec3(grid);
  return clamp(col, 0.0, 1.0);
}`,
  },

  // ── ASCII ART GLSL ────────────────────────────────────────────────────────

  {
    name: "ASCII Density",
    category: "Lofi",
    src: `vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  // Character cell: 8×12 px at effective resolution
  vec2 cell = floor(uv * vec2(80.0, 40.0));
  vec2 within = fract(uv * vec2(80.0, 40.0));
  vec2 cc = cell / vec2(80.0, 40.0) - 0.5;
  // Compute density value for this cell
  float d  = sin(cc.x * 12.0 + t + u_bass * 3.0) * 0.5 + 0.5;
  d += sin(cc.y * 9.0 - t * 1.3 + u_mid * 4.0) * 0.5 + 0.5;
  d += sin(length(cc) * 16.0 - t + u_level * 2.0) * 0.5 + 0.5;
  d /= 3.0;
  // Pick a "character density" — simulate with block fill
  float threshold = fract(d * 7.0); // 7 density levels
  float charDensity = floor(d * 7.0) / 7.0;
  // Dense chars fill more of the cell
  float fill = step(1.0 - charDensity, within.x) * step(1.0 - charDensity, within.y)
             + step(charDensity, within.x) * step(charDensity, 1.0 - within.y) * step(charDensity, 0.5);
  float lit = step(0.5, fract(d * 7.0 + within.x * 0.5 + within.y * 0.5)) * charDensity;
  // Monochrome green CRT
  vec3 fg = vec3(0.0, 1.0, 0.35) * (0.5 + u_level * 0.5);
  vec3 bg = vec3(0.0, 0.06, 0.02);
  return mix(bg, fg, clamp(lit + fill * 0.3, 0.0, 1.0));
}`,
  },

  {
    name: "ASCII Rain",
    category: "Lofi",
    src: `vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  // Matrix-like but with pure ASCII density, no texture
  vec2 cell = floor(uv * vec2(60.0, 36.0));
  vec2 within = fract(uv * vec2(60.0, 36.0));
  float col_id = cell.x;
  // Speed per column
  float spd = 0.8 + fract(sin(col_id * 127.1) * 4375.8) * 1.4;
  // "Character" value — determines brightness/density
  float row_id = floor(t * spd + fract(sin(col_id * 311.7) * 4375.8) * 36.0);
  float cv = fract(sin((row_id + col_id * 7.0) * 127.1) * 43758.5);
  float cv2 = fract(sin((row_id + col_id * 7.0 + 1.0) * 127.1) * 43758.5);
  // Head of the stream is bright white
  float isHead = step(0.95, fract(t * spd + fract(sin(col_id * 311.7) * 4375.8)));
  // Fake glyph — just density pattern in cell
  float glyph = step(cv * 0.8, within.x) * step(cv2 * 0.8, within.y);
  glyph *= step(within.x, 0.9) * step(within.y, 0.9);
  float brightness = mix(cv * 0.6, 1.0, isHead);
  brightness *= (0.5 + u_level * 0.5);
  vec3 fg = mix(vec3(0.0, 0.7, 0.2), vec3(0.8, 1.0, 0.8), isHead);
  return mix(vec3(0.0, 0.03, 0.01), fg * brightness, glyph);
}`,
  },

  {
    name: "Block Art",
    category: "Lofi",
    src: `vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  // Coarse grid — like old ANSI art
  vec2 cell = floor(uv * vec2(40.0, 25.0));
  vec2 within = fract(uv * vec2(40.0, 25.0));
  vec2 norm = cell / vec2(40.0, 25.0);
  // Plasma value
  float v = sin(norm.x * 8.0 + t + u_bass * 2.0);
  v += sin(norm.y * 6.0 - t * 0.7 + u_mid * 2.5);
  v += sin(length(norm - 0.5) * 12.0 + t * 0.9);
  v = v / 3.0 * 0.5 + 0.5;
  // ANSI 16-color palette approximation (8 pairs)
  float cidx = floor(v * 8.0);
  vec3 palette[8];
  palette[0] = vec3(0.0,  0.0,  0.0);
  palette[1] = vec3(0.67, 0.0,  0.0);
  palette[2] = vec3(0.0,  0.67, 0.0);
  palette[3] = vec3(0.67, 0.67, 0.0);
  palette[4] = vec3(0.0,  0.0,  0.67);
  palette[5] = vec3(0.67, 0.0,  0.67);
  palette[6] = vec3(0.0,  0.67, 0.67);
  palette[7] = vec3(0.67, 0.67, 0.67);
  vec3 bg = palette[int(cidx)];
  vec3 fg = palette[int(mod(cidx + 3.0, 8.0))];
  // Half-block simulation: top half / bottom half
  float half_block = step(0.5, within.y);
  vec3 col = mix(fg, bg, half_block);
  // Audio flash
  col = mix(col, vec3(1.0), step(0.92, u_bass) * step(0.7, fract(v * 8.0)));
  return col;
}`,
  },

  {
    name: "Teletext",
    category: "Lofi",
    src: `vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  // Teletext / Minitel — 40×25 cells, hard color blocks
  vec2 cell = floor(uv * vec2(40.0, 25.0));
  vec2 norm = cell / vec2(40.0, 25.0);
  // Simple pattern — cells color from audio + position
  float h = fract(sin(dot(cell, vec2(127.1, 311.7)) + floor(t * 2.0)) * 43758.5);
  float audio_boost = u_level * 0.5;
  float cidx = floor(h * 8.0 * (1.0 + audio_boost));
  cidx = mod(cidx, 8.0);
  // Teletext palette
  vec3 cols[8];
  cols[0] = vec3(0.0, 0.0, 0.0);
  cols[1] = vec3(1.0, 0.0, 0.0);
  cols[2] = vec3(0.0, 1.0, 0.0);
  cols[3] = vec3(1.0, 1.0, 0.0);
  cols[4] = vec3(0.0, 0.0, 1.0);
  cols[5] = vec3(1.0, 0.0, 1.0);
  cols[6] = vec3(0.0, 1.0, 1.0);
  cols[7] = vec3(1.0, 1.0, 1.0);
  vec3 col = cols[int(cidx)];
  // Thick black border between cells
  vec2 within = fract(uv * vec2(40.0, 25.0));
  float border = step(within.x, 0.06) + step(1.0 - 0.06, within.x)
               + step(within.y, 0.08) + step(1.0 - 0.08, within.y);
  col *= 1.0 - clamp(border, 0.0, 1.0);
  return col;
}`,
  },

];
