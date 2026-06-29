/**
 * Perturbateurs — glitch events courts et intenses, déclenchés par l'audio.
 * Même format que les effets (vec3 process(vec2 uv)) mais appliqués
 * de façon probabiliste et éphémère plutôt que continue.
 */

export interface Disruptor {
  name: string;
  id: string;
  body: string;
  defaultSensitivity: number; // 0..1 — seuil de déclenchement
  defaultDurationMs: number;  // durée d'un burst
  defaultCooldownMs: number;  // temps minimal entre deux bursts
}

import { INDUSTRIAL_DISRUPTORS } from "./industrialDisruptors";

const BUILTIN_DISRUPTORS: Disruptor[] = [
  {
    name: "Déchirure", id: "DCH",
    defaultSensitivity: 0.65,
    defaultDurationMs: 80,
    defaultCooldownMs: 300,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t   = u_time;
  float row = floor(uv.y * 52.0);
  float rnd = hash(vec2(row, floor(t * 20.0)));
  float shift = step(0.82, rnd) * (hash(vec2(floor(t*20.0), row)) - 0.5) * u_amount * 0.45;
  float s  = u_amount * 0.018;
  vec3 c;
  c.r = prev(fract(uv + vec2(shift + s, 0.0))).r;
  c.g = prev(fract(uv + vec2(shift,     0.0))).g;
  c.b = prev(fract(uv + vec2(shift - s, 0.0))).b;
  return c;
}`,
  },
  {
    name: "Dropout", id: "DRP",
    defaultSensitivity: 0.7,
    defaultDurationMs: 60,
    defaultCooldownMs: 500,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t   = u_time;
  float bs  = 0.05 + u_amount * 0.05;
  vec2  bid = floor(uv / bs);
  float rnd = hash(bid + floor(t * 22.0));
  float kill = step(0.84 - u_amount * 0.12, rnd);
  vec3 noise = vec3(
    hash(uv * 2048.0 + t),
    hash(uv * 1537.0 + t * 1.3),
    hash(uv * 3071.0 + t * 0.7)
  );
  return mix(prev(uv), noise * u_amount + prev(uv) * (1.0 - u_amount), kill);
}`,
  },
  {
    name: "Strobe", id: "STR",
    defaultSensitivity: 0.8,
    defaultDurationMs: 40,
    defaultCooldownMs: 800,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec3  c = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  // flash blanc + inversion partielle
  vec3 inv = 1.0 - c;
  vec3 flash = mix(c, inv + lum * 0.5, a * 0.7);
  return mix(c, flash + vec3(a * 0.25), a);
}`,
  },
  {
    name: "Corrupt", id: "CRP",
    defaultSensitivity: 0.6,
    defaultDurationMs: 120,
    defaultCooldownMs: 400,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t    = floor(u_time * 28.0);
  vec2  grid = floor(uv * u_resolution / 5.0);
  float rnd  = hash(grid + t);
  float bad  = step(0.82 - u_amount * 0.18, rnd);
  vec3  noise = vec3(
    hash(grid + t + 17.3),
    hash(grid + t + 31.7),
    hash(grid + t + 53.1)
  );
  return mix(prev(uv), noise, bad * u_amount);
}`,
  },
  {
    name: "Tremor", id: "TRM",
    defaultSensitivity: 0.55,
    defaultDurationMs: 150,
    defaultCooldownMs: 250,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t  = u_time;
  float a  = u_amount;
  float fr = floor(t * 32.0);
  vec2 shake = vec2(
    (hash(vec2(fr, 0.0)) - 0.5) * a * 0.05,
    (hash(vec2(fr, 1.0)) - 0.5) * a * 0.04
  );
  // décalage chromatique simultané
  float s = a * 0.015;
  vec3 c;
  c.r = prev(clamp(uv + shake + vec2( s, 0.0), 0.001, 0.999)).r;
  c.g = prev(clamp(uv + shake,                  0.001, 0.999)).g;
  c.b = prev(clamp(uv + shake - vec2( s, 0.0), 0.001, 0.999)).b;
  return c;
}`,
  },
  {
    name: "Phosphore", id: "PHS",
    defaultSensitivity: 0.5,
    defaultDurationMs: 200,
    defaultCooldownMs: 600,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a   = u_amount;
  float t   = u_time;
  // bandes horizontales de phosphore qui s'allument
  float band = floor(uv.y * 9.0);
  float on   = step(0.6, hash(vec2(band, floor(t * 14.0))));
  vec3  phosCol = vec3(0.6, 1.0, 0.5) * on * a;
  // masque sur les zones lumineuses de l'image
  vec3  c = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  return c + phosCol * lum * 2.5;
}`,
  },
  {
    name: "Flicker", id: "FLK",
    defaultSensitivity: 0.72,
    defaultDurationMs: 90,
    defaultCooldownMs: 350,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t = u_time;
  float a = u_amount;
  // artefacts CRT rapides
  float flicker = abs(sin(t * 85.0)) * step(0.5, sin(t * 37.0));
  float lines = mod(uv.y * 480.0, 3.0);
  float scanline = step(0.7, fract(lines));

  vec3 c = prev(uv);
  vec3 darken = c * (1.0 - flicker * a * 0.6);
  vec3 displaced = prev(vec2(uv.x + sin(t * 120.0) * 0.008 * a, uv.y));

  return mix(c, mix(darken, displaced, 0.5), scanline * a * 0.8);
}`,
  },
  {
    name: "Shatter", id: "SHT",
    defaultSensitivity: 0.68,
    defaultDurationMs: 110,
    defaultCooldownMs: 420,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t = u_time;
  float a = u_amount;
  // pixelation crystalline avec scatter géométrique
  float res = 20.0 + a * 40.0;
  vec2 grid = floor(uv * res) / res;

  float rnd = hash(grid + floor(t * 25.0));
  vec2 shatter = (vec2(hash(grid + 11.3), hash(grid + 22.7)) - 0.5) * 0.05 * a * step(0.6, rnd);

  vec3 c = prev(grid + shatter);
  float edge = length(fract(uv * res) - 0.5);
  float outline = step(0.4, edge) * (1.0 - edge);

  return c + outline * 0.2 * a;
}`,
  },
  {
    name: "Bloom Burst", id: "BBR",
    defaultSensitivity: 0.75,
    defaultDurationMs: 130,
    defaultCooldownMs: 550,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t = u_time;
  float a = u_amount;
  vec3 c = prev(uv);

  // zones lumineuses qui explosent vers l'extérieur
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float bloomPulse = abs(sin(t * 40.0)) * a;

  // distance depuis le centre avec bloom radiatif
  vec2 center = vec2(0.5);
  float dist = length(uv - center);
  float burst = exp(-dist * 5.0) * lum * bloomPulse;

  // inversion progressive des hautes lumières
  vec3 invLum = mix(c, 1.0 - c, lum * a * 0.5);
  vec3 bloomed = mix(c, invLum + burst * 2.0, lum * 0.7 * a);

  return bloomed;
}`,
  },
  {
    name: "Glitch Rows", id: "GRW",
    defaultSensitivity: 0.62,
    defaultDurationMs: 100,
    defaultCooldownMs: 380,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t = u_time;
  float a = u_amount;
  // corruption de scan lines style VHS
  float rowIdx = floor(uv.y * u_resolution.y);
  float rnd = hash(vec2(rowIdx, floor(t * 30.0)));

  float glitchRow = step(0.8 - a * 0.18, rnd);
  float shift = (hash(vec2(rowIdx + t, t)) - 0.5) * 0.12 * a * glitchRow;

  vec2 glitchUv = uv + vec2(shift, 0.0);
  vec3 glitchColor = prev(clamp(glitchUv, 0.0, 1.0));

  // duplication horizontale sur la ligne corrompue
  vec3 dup = prev(clamp(glitchUv + vec2(0.05, 0.0), 0.0, 1.0));
  glitchColor = mix(glitchColor, dup, 0.3 * glitchRow);

  return mix(prev(uv), glitchColor, glitchRow * a * 0.9);
}`,
  },

  {
    name: "Flip Horizontal", id: "FLH",
    defaultSensitivity: 0.5,
    defaultDurationMs: 200,
    defaultCooldownMs: 600,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 flipped = vec2(1.0 - uv.x, uv.y);
  return prev(mix(uv, flipped, a));
}`,
  },

  {
    name: "Flip Vertical", id: "FLV",
    defaultSensitivity: 0.5,
    defaultDurationMs: 200,
    defaultCooldownMs: 600,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 flipped = vec2(uv.x, 1.0 - uv.y);
  return prev(mix(uv, flipped, a));
}`,
  },

  {
    name: "Mosaic Burst", id: "MSB",
    defaultSensitivity: 0.6,
    defaultDurationMs: 150,
    defaultCooldownMs: 500,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  float scale = 3.0 + a * 10.0;
  vec2 mosaic = floor(uv * scale) / scale;
  vec3 scrambled = prev(mosaic);
  scrambled += vec3(
    hash(mosaic + t) * 0.3,
    hash(mosaic + t + 0.5) * 0.3,
    hash(mosaic + t + 1.0) * 0.3
  ) * a;
  return mix(prev(uv), scrambled, a * 0.8);
}`,
  },

  {
    name: "Spin Vortex", id: "SVX",
    defaultSensitivity: 0.55,
    defaultDurationMs: 180,
    defaultCooldownMs: 700,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float spin = angle + t * a * 8.0 - r * a * 12.0;
  vec2 vortex = center + r * vec2(cos(spin), sin(spin));
  return prev(clamp(vortex, 0.0, 1.0));
}`,
  },

  {
    name: "Psycho Shift", id: "PSH",
    defaultSensitivity: 0.65,
    defaultDurationMs: 120,
    defaultCooldownMs: 450,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec3 c = prev(uv);
  float rnd = hash(vec2(floor(t * 30.0), uv.y * 100.0));
  vec3 shifted = vec3(
    c.g * (0.5 + 0.5 * sin(t * 4.0 + rnd)),
    c.b * (0.5 + 0.5 * cos(t * 3.0 + rnd)),
    c.r * (0.5 + 0.5 * sin(t * 5.0 + rnd * 2.0))
  );
  return mix(c, shifted, a * 0.7);
}`,
  },

  {
    name: "Displacement Storm", id: "DST",
    defaultSensitivity: 0.6,
    defaultDurationMs: 200,
    defaultCooldownMs: 600,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  float disp1 = sin(uv.x * 20.0 + t * 5.0) * sin(uv.y * 15.0 + t * 3.0);
  float disp2 = cos(uv.x * 30.0 - t * 4.0) * cos(uv.y * 20.0 - t * 2.0);
  vec2 displaced = uv + vec2(disp1, disp2) * 0.1 * a;
  return prev(clamp(displaced, 0.0, 1.0));
}`,
  },

  {
    name: "Negative Burst", id: "NGB",
    defaultSensitivity: 0.7,
    defaultDurationMs: 120,
    defaultCooldownMs: 400,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  // Inversion complète modulée par luminosité
  vec3 inverted = 1.0 - c;
  return mix(c, inverted, a * lum * 0.8);
}`,
  },

  {
    name: "Radial Warp", id: "RDW",
    defaultSensitivity: 0.65,
    defaultDurationMs: 150,
    defaultCooldownMs: 500,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  float r = length(p);
  float angle = atan(p.y, p.x);

  // Distorsion radiale avec onde
  float warp = 1.0 + sin(t * 3.0 + angle * 6.0) * 0.15 * a;
  vec2 warped = center + p * warp;

  return prev(clamp(warped, 0.0, 1.0));
}`,
  },

  {
    name: "Color Shift", id: "CSH",
    defaultSensitivity: 0.6,
    defaultDurationMs: 100,
    defaultCooldownMs: 350,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec3 c = prev(uv);

  // Rotation des canaux RGB
  float hue = t * 2.0;
  vec3 shifted = vec3(
    c.r * (0.5 + 0.5 * sin(hue)),
    c.g * (0.5 + 0.5 * sin(hue + 2.094)),
    c.b * (0.5 + 0.5 * sin(hue + 4.189))
  );

  return mix(c, shifted, a * 0.6);
}`,
  },

  {
    name: "Zoom Pulse", id: "ZMP",
    defaultSensitivity: 0.7,
    defaultDurationMs: 140,
    defaultCooldownMs: 450,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 center = vec2(0.5);
  vec2 p = (uv - center);

  // Zoom in/out pulsant
  float zoom = 1.0 + sin(t * 4.0) * 0.2 * a;
  vec2 zoomed = center + p / zoom;

  return prev(clamp(zoomed, 0.0, 1.0));
}`,
  },

  {
    name: "Interlace Jitter", id: "IJT",
    defaultSensitivity: 0.55,
    defaultDurationMs: 110,
    defaultCooldownMs: 380,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;

  // Lignes entrelacées qui tremblent
  float line = mod(uv.y * u_resolution.y, 2.0);
  float jitter = sin(t * 40.0 + uv.x * 10.0) * 0.01 * a;

  vec2 jittered = uv + vec2(jitter * line, 0.0);
  vec3 c = prev(clamp(jittered, 0.0, 1.0));

  // Obscurcir les lignes alternées
  float darken = mix(1.0, 0.7, step(0.5, line) * a);
  return c * darken;
}`,
  },

  {
    name: "Mirror Flip", id: "MFL",
    defaultSensitivity: 0.5,
    defaultDurationMs: 180,
    defaultCooldownMs: 600,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;

  // Miroir diagonal avec rotation
  float angle = t * 2.0;
  vec2 p = uv - 0.5;
  vec2 rotated = vec2(
    p.x * cos(angle) - p.y * sin(angle),
    p.x * sin(angle) + p.y * cos(angle)
  );

  vec2 mirrored = vec2(1.0 - abs(rotated.x), abs(rotated.y)) + 0.5;
  return prev(clamp(mirrored, 0.0, 1.0));
}`,
  },

  {
    name: "Frequency Bars", id: "FRB",
    defaultSensitivity: 0.62,
    defaultDurationMs: 95,
    defaultCooldownMs: 320,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;

  // Barres de fréquence animées
  float freq = sin(uv.x * 20.0 + t * 5.0) * 0.5 + 0.5;
  float bar = step(abs(sin(uv.y * 30.0)), freq * a);

  vec3 c = prev(uv);
  return c * (1.0 - bar * a * 0.4) + vec3(bar * freq * a * 0.2);
}`,
  },

  {
    name: "Temporal Shift", id: "TSH",
    defaultSensitivity: 0.58,
    defaultDurationMs: 125,
    defaultCooldownMs: 480,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;

  // Décalage temporel avec bruit
  float shift = sin(t * 6.0) * 0.1 * a;
  vec2 shifted = uv + vec2(sin(uv.y * 10.0 + t) * shift, cos(uv.x * 10.0 + t) * shift);

  vec3 c = prev(clamp(shifted, 0.0, 1.0));
  // Perte de saturations aléatoires
  float sat = 1.0 - hash(vec2(floor(t * 20.0), floor(uv.y * 10.0))) * a * 0.3;
  return c * sat;
}`,
  },
];

export const DISRUPTORS: Disruptor[] = [...BUILTIN_DISRUPTORS, ...INDUSTRIAL_DISRUPTORS];
