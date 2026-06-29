/**
 * Industrial disruptors (v1.7 — Industrial Mode roadmap).
 *
 * 12 monochrome-native glitch events. Triggered probabilistically by audio
 * peaks like other disruptors. Look matches the Industrial aesthetic: digital
 * artifacts, signal loss, frame hold, datamosh, ASCII bursts — not RGB shifts.
 *
 * Format identical to disruptors.ts (vec3 process(vec2 uv)).
 * Available: prev(uv), fb(uv), hash(p),
 *            u_time, u_resolution, u_bass, u_mid, u_treble, u_level, u_amount.
 */

import type { Disruptor } from "./disruptors";

export const INDUSTRIAL_DISRUPTORS: Disruptor[] = [
  // 1. BLOCK DISPLACE — bass kick → 8×8 cell shift
  {
    name: "Block Displace", id: "BLD",
    defaultSensitivity: 0.65,
    defaultDurationMs: 90,
    defaultCooldownMs: 250,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t = u_time, a = u_amount;
  vec2 cellSize = vec2(0.05);
  vec2 cell = floor(uv / cellSize);
  float r = hash(cell + floor(t * 30.0));
  vec2 jit = vec2(r - 0.5, hash(cell.yx + r) - 0.5) * 0.10 * a;
  return prev(uv + jit * step(0.55, r));
}`,
  },

  // 2. SCAN TEAR — onset → horizontal slice offset
  {
    name: "Scan Tear", id: "SCT",
    defaultSensitivity: 0.6,
    defaultDurationMs: 70,
    defaultCooldownMs: 220,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t = u_time, a = u_amount;
  float band = floor(uv.y * 40.0);
  float seed = hash(vec2(band, floor(t * 16.0)));
  float tear = step(0.78, seed) * (seed - 0.5) * 0.25 * a;
  return prev(vec2(fract(uv.x + tear), uv.y));
}`,
  },

  // 3. FRAME HOLD — pull from previous frame (fb) for stutter effect
  {
    name: "Frame Hold", id: "FRH",
    defaultSensitivity: 0.55,
    defaultDurationMs: 120,
    defaultCooldownMs: 400,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 held = fb(uv);
  vec3 cur  = prev(uv);
  float mixv = step(0.5, hash(vec2(floor(u_time * 8.0), 0.0))) * a;
  return mix(cur, held, mixv);
}`,
  },

  // 4. DATAMOSH — p-frame style motion smear via fb
  {
    name: "Datamosh", id: "DMS",
    defaultSensitivity: 0.5,
    defaultDurationMs: 200,
    defaultCooldownMs: 500,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 flow = vec2(sin(uv.y * 6.0 + u_time * 3.0), cos(uv.x * 5.0 - u_time * 2.0)) * 0.02 * a;
  vec3 hist = fb(uv + flow) * 0.85;
  vec3 cur  = prev(uv);
  return max(cur, hist);
}`,
  },

  // 5. SIGNAL LOSS — black bars + noise sweep
  {
    name: "Signal Loss", id: "SGL",
    defaultSensitivity: 0.7,
    defaultDurationMs: 100,
    defaultCooldownMs: 600,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t = u_time, a = u_amount;
  float sweep = fract(u_time * 0.8);
  float bar = step(abs(uv.y - sweep), 0.05) * a;
  float noise = hash(uv * u_resolution + t);
  vec3 cur = prev(uv);
  vec3 sig = mix(cur, vec3(noise), bar);
  // additional thin black bars
  float blk = step(0.92, hash(vec2(floor(uv.y * 80.0), floor(t * 4.0))));
  return sig * (1.0 - blk * a);
}`,
  },

  // 6. SYNC LOST — vertical roll
  {
    name: "Sync Lost", id: "SYL",
    defaultSensitivity: 0.6,
    defaultDurationMs: 180,
    defaultCooldownMs: 500,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float roll = u_time * (1.5 + u_bass * 2.0) * a;
  float y = fract(uv.y + roll);
  // dark band at the sync edge
  float edge = smoothstep(0.04, 0.0, abs(fract(uv.y + roll) - 0.0));
  vec3 c = prev(vec2(uv.x, y));
  return c * (1.0 - edge * 0.8 * a);
}`,
  },

  // 7. BIT CRUSH — luminance quantized to N levels
  {
    name: "Bit Crush", id: "BCR",
    defaultSensitivity: 0.55,
    defaultDurationMs: 110,
    defaultCooldownMs: 280,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float steps = mix(8.0, 2.0, a);
  float q = floor(lum * steps + 0.5) / steps;
  vec3 crushed = vec3(q);
  return mix(c, crushed, a);
}`,
  },

  // 8. GLYPH STORM — burst of monospace glyph overlay
  {
    name: "Glyph Storm", id: "GLS",
    defaultSensitivity: 0.6,
    defaultDurationMs: 130,
    defaultCooldownMs: 350,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t = u_time, a = u_amount;
  vec2 grid = vec2(80.0, 45.0);
  vec2 cell = floor(uv * grid);
  vec2 cuv = fract(uv * grid) - 0.5;
  float seed = hash(cell + floor(t * 24.0));
  vec3 c = prev(uv);
  if (seed > 0.78) {
    vec2 d = abs(cuv);
    float h = 1.0 - smoothstep(0.08, 0.12, d.y);
    float v = 1.0 - smoothstep(0.08, 0.12, d.x);
    float glyph = max(h, v) * (1.0 - smoothstep(0.32, 0.38, max(d.x, d.y)));
    c = mix(c, vec3(glyph), a * 0.85);
  }
  return c;
}`,
  },

  // 9. HALFTONE PULSE — dot pattern overlay modulated by audio
  {
    name: "Halftone Pulse", id: "HTP",
    defaultSensitivity: 0.5,
    defaultDurationMs: 140,
    defaultCooldownMs: 300,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec2 grid = uv * 80.0;
  vec2 cuv = fract(grid) - 0.5;
  float dotR = mix(0.08, 0.45, lum);
  float d = 1.0 - smoothstep(dotR, dotR + 0.03, length(cuv));
  vec3 halftone = vec3(d);
  return mix(c, halftone, a);
}`,
  },

  // 10. SCANLINE DENSITY — pulsing CRT scanlines
  {
    name: "Scanline Density", id: "SLD",
    defaultSensitivity: 0.45,
    defaultDurationMs: 160,
    defaultCooldownMs: 320,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float density = mix(200.0, 600.0, u_bass);
  float scan = 0.5 + 0.5 * sin(uv.y * density + u_time * 6.0);
  vec3 c = prev(uv);
  return c * mix(1.0, scan, a * 0.85);
}`,
  },

  // 11. CONTOUR SHOCK — edge detection flash
  {
    name: "Contour Shock", id: "CSK",
    defaultSensitivity: 0.65,
    defaultDurationMs: 80,
    defaultCooldownMs: 240,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 px = 1.0 / u_resolution;
  float lc = dot(prev(uv), vec3(0.2126, 0.7152, 0.0722));
  float lx = dot(prev(uv + vec2(px.x, 0.0)), vec3(0.2126, 0.7152, 0.0722));
  float ly = dot(prev(uv + vec2(0.0, px.y)), vec3(0.2126, 0.7152, 0.0722));
  float edge = clamp(abs(lc - lx) * 6.0 + abs(lc - ly) * 6.0, 0.0, 1.0);
  return mix(prev(uv), vec3(edge), a);
}`,
  },

  // 12. NEGATIVE FLASH — invert luminance for 1-3 frames
  {
    name: "Negative Flash", id: "NGF",
    defaultSensitivity: 0.75,
    defaultDurationMs: 60,
    defaultCooldownMs: 700,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);
  return mix(c, 1.0 - c, a);
}`,
  },
];
