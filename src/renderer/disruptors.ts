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
  float shift = sin(t * 6.0) * 0.1 * a;
  vec2 shifted = uv + vec2(sin(uv.y * 10.0 + t) * shift, cos(uv.x * 10.0 + t) * shift);
  vec3 c = prev(clamp(shifted, 0.0, 1.0));
  float sat = 1.0 - hash(vec2(floor(t * 20.0), floor(uv.y * 10.0))) * a * 0.3;
  return c * sat;
}`,
  },

  // ── 25 nouveaux disruptors ──────────────────────────────────────────────

  {
    name: "Static Burst", id: "STB",
    defaultSensitivity: 0.75,
    defaultDurationMs: 60,
    defaultCooldownMs: 400,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t = u_time;
  float a = u_amount;
  vec3 noise = vec3(
    hash(uv * 512.0 + t * 91.3),
    hash(uv * 384.0 + t * 73.7),
    hash(uv * 768.0 + t * 53.1)
  );
  return mix(prev(uv), noise, a * 0.92);
}`,
  },

  {
    name: "RGB Explosion", id: "RGX",
    defaultSensitivity: 0.68,
    defaultDurationMs: 100,
    defaultCooldownMs: 350,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a  = u_amount;
  vec2  d  = uv - 0.5;
  vec2  dn = normalize(d + vec2(0.0001));
  float s  = a * 0.14;
  float cr = prev(clamp(uv + dn * s * 1.6, 0.0, 1.0)).r;
  float cg = prev(clamp(uv,                0.0, 1.0)).g;
  float cb = prev(clamp(uv - dn * s,       0.0, 1.0)).b;
  return vec3(cr, cg, cb);
}`,
  },

  {
    name: "H-Collapse", id: "HCL",
    defaultSensitivity: 0.80,
    defaultDurationMs: 70,
    defaultCooldownMs: 900,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a  = u_amount;
  float ny = mix(uv.y, 0.5, a * 0.96);
  return prev(clamp(vec2(uv.x, ny), 0.0, 1.0));
}`,
  },

  {
    name: "Tile Scramble", id: "TSC",
    defaultSensitivity: 0.65,
    defaultDurationMs: 110,
    defaultCooldownMs: 500,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t   = u_time;
  float a   = u_amount;
  float sz  = 0.07 + (1.0 - a) * 0.08;
  vec2  tid = floor(uv / sz);
  float rnd = hash(tid + floor(t * 16.0));
  float doSwap = step(0.55, rnd) * a;
  vec2  swapTile = floor(vec2(
    hash(tid + vec2(rnd * 17.3, 5.1)) * 14.0,
    hash(tid + vec2(3.7, rnd * 11.9)) * 14.0
  ));
  vec2 srcTile = mix(tid, swapTile, doSwap);
  vec2 srcUv   = srcTile * sz + fract(uv / sz) * sz;
  return prev(clamp(srcUv, 0.001, 0.999));
}`,
  },

  {
    name: "Datableed", id: "DBL",
    defaultSensitivity: 0.60,
    defaultDurationMs: 140,
    defaultCooldownMs: 350,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t     = u_time;
  float a     = u_amount;
  float row   = floor(uv.y * 72.0);
  float bleed = max(0.0, hash(vec2(row, floor(t * 14.0))) - 0.25) * a * 0.3;
  vec3  c     = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    c += prev(clamp(uv - vec2(bleed * fi * 0.4, 0.0), 0.0, 1.0)) * (1.0 - fi * 0.1);
  }
  return c / 4.5;
}`,
  },

  {
    name: "Signal Cut", id: "SIG",
    defaultSensitivity: 0.85,
    defaultDurationMs: 55,
    defaultCooldownMs: 1100,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a    = u_amount;
  float glow = exp(-abs(uv.y - 0.5) * 90.0);
  vec3  line = vec3(0.15, 0.9, 0.55) * glow;
  return mix(prev(uv), line, a * 0.92);
}`,
  },

  {
    name: "Pixel Rain", id: "PRN",
    defaultSensitivity: 0.62,
    defaultDurationMs: 200,
    defaultCooldownMs: 700,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t      = u_time;
  float a      = u_amount;
  float col    = floor(uv.x * 90.0);
  float speed  = 1.5 + hash(vec2(col, 0.0)) * 3.5;
  float offset = hash(vec2(col, 1.0));
  float rain   = fract(uv.y * 5.0 - t * speed + offset);
  float streak = exp(-rain * 10.0) * step(0.65, hash(vec2(col, floor(t * 3.0))));
  vec3  drop   = vec3(0.0, 0.85, 0.35) * streak * a;
  return prev(uv) * (1.0 - streak * a * 0.55) + drop;
}`,
  },

  {
    name: "Acid Wash", id: "ACD",
    defaultSensitivity: 0.70,
    defaultDurationMs: 100,
    defaultCooldownMs: 600,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a   = u_amount;
  float t   = u_time;
  vec3  c   = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3  sat = (c - lum) * (1.0 + a * 3.5);
  float sh  = a * TWO_PI + sin(t * 9.0) * a * 1.2;
  float cs  = cos(sh); float ss = sin(sh);
  vec3 rot  = vec3(
    lum + sat.r * cs - sat.g * ss,
    lum + sat.r * ss + sat.g * cs,
    lum + sat.b * (1.0 + a)
  );
  return clamp(rot, 0.0, 1.0);
}`,
  },

  {
    name: "Freeze Glitch", id: "FRZ",
    defaultSensitivity: 0.72,
    defaultDurationMs: 130,
    defaultCooldownMs: 700,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t   = u_time;
  float a   = u_amount;
  float row = floor(uv.y * 38.0);
  float rnd = hash(vec2(row, floor(t * 7.0)));
  float slip = step(0.78, rnd) * (hash(vec2(floor(t * 7.0), row)) - 0.5) * 0.05 * a;
  vec2  fuv  = clamp(uv + vec2(slip, 0.0), 0.0, 1.0);
  return mix(prev(uv), fb(fuv), a * 0.92);
}`,
  },

  {
    name: "Wave Melt", id: "WML",
    defaultSensitivity: 0.58,
    defaultDurationMs: 130,
    defaultCooldownMs: 400,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a   = u_amount;
  float t   = u_time;
  float amp = a * 0.07;
  vec2  p   = uv;
  p.x += sin(p.y * (8.0 + a * 14.0) + t * 6.5) * amp;
  p.y += cos(p.x * (6.0 + a * 10.0) + t * 4.0) * amp * 0.6;
  return prev(clamp(p, 0.0, 1.0));
}`,
  },

  {
    name: "Vertical Tear", id: "VTR",
    defaultSensitivity: 0.67,
    defaultDurationMs: 90,
    defaultCooldownMs: 320,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t   = u_time;
  float col = floor(uv.x * 48.0);
  float rnd = hash(vec2(col, floor(t * 18.0)));
  float shift = step(0.80, rnd) * (hash(vec2(floor(t * 18.0), col)) - 0.5) * u_amount * 0.4;
  float s   = u_amount * 0.015;
  vec3  c;
  c.r = prev(fract(uv + vec2(0.0, shift + s))).r;
  c.g = prev(fract(uv + vec2(0.0, shift    ))).g;
  c.b = prev(fract(uv + vec2(0.0, shift - s))).b;
  return c;
}`,
  },

  {
    name: "Echo Drift", id: "ECD",
    defaultSensitivity: 0.55,
    defaultDurationMs: 160,
    defaultCooldownMs: 500,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2  d = vec2(sin(t * 2.3) * 0.06, cos(t * 1.7) * 0.04) * a;
  vec3  c = prev(uv);
  vec3  g = fb(clamp(uv + d, 0.0, 1.0));
  return clamp(c + g * 0.6 * a, 0.0, 1.0);
}`,
  },

  {
    name: "Heat Shimmer", id: "HSM",
    defaultSensitivity: 0.52,
    defaultDurationMs: 180,
    defaultCooldownMs: 400,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t    = u_time;
  float a    = u_amount;
  float heat = sin(uv.x * 24.0 + t * 3.0) * cos(uv.x * 11.0 - t * 1.7);
  float rise = sin((1.0 - uv.y) * 18.0 + t * 5.0 + uv.x * 4.0);
  vec2  d    = vec2(heat * 0.018, rise * 0.022) * a;
  return prev(clamp(uv + d, 0.0, 1.0));
}`,
  },

  {
    name: "Negative Spike", id: "NGS",
    defaultSensitivity: 0.78,
    defaultDurationMs: 45,
    defaultCooldownMs: 700,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a   = u_amount;
  vec3  c   = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3  inv = 1.0 - c;
  float edge = abs(lum - 0.5) * 2.0;
  return mix(c, inv + vec3(edge * 0.3 * a), a);
}`,
  },

  {
    name: "Scanline Burn", id: "SLB",
    defaultSensitivity: 0.63,
    defaultDurationMs: 110,
    defaultCooldownMs: 450,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t    = u_time;
  float a    = u_amount;
  float scl  = sin(uv.y * u_resolution.y * 0.5 + t * 2.0) * 0.5 + 0.5;
  float burn = 1.0 + scl * a * 1.8;
  float shift = (scl - 0.5) * a * 0.012;
  vec3  c    = prev(clamp(uv + vec2(shift, 0.0), 0.0, 1.0));
  return clamp(c * burn, 0.0, 1.0);
}`,
  },

  {
    name: "Blink Strip", id: "BLS",
    defaultSensitivity: 0.73,
    defaultDurationMs: 70,
    defaultCooldownMs: 550,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t     = u_time;
  float a     = u_amount;
  float band  = floor(uv.y * 16.0);
  float rnd   = hash(vec2(band, floor(t * 20.0)));
  float flash = step(0.72, rnd) * step(rnd, 0.86) * a;
  float isBlk = step(0.79, rnd);
  vec3  fill  = mix(vec3(1.0), vec3(0.0), isBlk);
  return mix(prev(uv), fill, flash);
}`,
  },

  {
    name: "Chroma Fog", id: "CFG",
    defaultSensitivity: 0.50,
    defaultDurationMs: 200,
    defaultCooldownMs: 600,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t     = u_time;
  float a     = u_amount;
  float s     = a * 0.04;
  float angle = t * 1.3;
  vec2  dr    = vec2(cos(angle),                  sin(angle)                 ) * s;
  vec2  dg    = vec2(cos(angle + TWO_PI / 3.0),   sin(angle + TWO_PI / 3.0) ) * s;
  vec2  db    = vec2(cos(angle + TWO_PI * 2.0/3.0),sin(angle + TWO_PI*2.0/3.0)) * s;
  float r = prev(clamp(uv + dr, 0.0, 1.0)).r;
  float g = prev(clamp(uv + dg, 0.0, 1.0)).g;
  float b = prev(clamp(uv + db, 0.0, 1.0)).b;
  return vec3(r, g, b) * (1.0 + a * 0.3);
}`,
  },

  {
    name: "Digital Echo", id: "DGE",
    defaultSensitivity: 0.56,
    defaultDurationMs: 170,
    defaultCooldownMs: 500,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a     = u_amount;
  float t     = u_time;
  float phase = fract(t * 4.0);
  vec3  c     = prev(uv);
  vec2  e1    = uv + vec2(0.02,  0.01) * a * step(0.3, phase);
  vec2  e2    = uv + vec2(-0.03,-0.01) * a * step(0.6, phase);
  c += prev(clamp(e1, 0.0, 1.0)) * 0.4 * a;
  c += prev(clamp(e2, 0.0, 1.0)) * 0.25 * a;
  return clamp(c, 0.0, 1.0);
}`,
  },

  {
    name: "Color Melt", id: "CLM",
    defaultSensitivity: 0.60,
    defaultDurationMs: 160,
    defaultCooldownMs: 500,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t  = u_time;
  float a  = u_amount;
  float dr = sin(uv.x * 20.0 + t * 3.0) * a * 0.045;
  float dg = sin(uv.x * 17.0 + t * 2.3 + 1.0) * a * 0.055;
  float db = sin(uv.x * 23.0 + t * 4.1 + 2.0) * a * 0.035;
  float r  = prev(clamp(uv + vec2(0.0, dr), 0.0, 1.0)).r;
  float g  = prev(clamp(uv + vec2(0.0, dg), 0.0, 1.0)).g;
  float b  = prev(clamp(uv + vec2(0.0, db), 0.0, 1.0)).b;
  return vec3(r, g, b);
}`,
  },

  {
    name: "Warp Lens", id: "WRL",
    defaultSensitivity: 0.75,
    defaultDurationMs: 90,
    defaultCooldownMs: 600,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a    = u_amount;
  vec2  d    = uv - 0.5;
  float r    = length(d);
  float warp = 1.0 + a * (r * r * 3.0 - 0.5);
  vec2  p    = clamp(0.5 + d * warp, 0.0, 1.0);
  return prev(p);
}`,
  },

  {
    name: "Pixel Crush", id: "PCR",
    defaultSensitivity: 0.68,
    defaultDurationMs: 80,
    defaultCooldownMs: 450,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t    = u_time;
  float a    = u_amount;
  vec2  px   = 1.0 / u_resolution;
  vec2  grid = floor(uv / px);
  float rnd  = hash(grid + floor(t * 30.0));
  float crush = step(0.88, rnd) * a;
  vec2  flipped = vec2(hash(grid + 7.3), hash(grid + 13.7));
  vec2  p    = mix(uv, flipped, crush);
  return prev(clamp(p, 0.0, 1.0));
}`,
  },

  {
    name: "Crosshatch Burn", id: "CHB",
    defaultSensitivity: 0.70,
    defaultDurationMs: 120,
    defaultCooldownMs: 600,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t    = u_time;
  float a    = u_amount;
  float xh   = max(sin(uv.x * 24.0 + t * 2.0), sin(uv.y * 24.0 - t * 1.5));
  float mask = step(1.0 - a * 0.35, xh);
  vec3  c    = prev(uv);
  float lum  = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(c, vec3(lum * 2.0, lum * 0.3, 0.0) * a, mask);
}`,
  },

  {
    name: "Bandwidth", id: "BWD",
    defaultSensitivity: 0.62,
    defaultDurationMs: 110,
    defaultCooldownMs: 500,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t       = u_time;
  float a       = u_amount;
  float band    = floor(uv.y * 20.0);
  float rnd     = hash(vec2(band, floor(t * 12.0)));
  float stretch = 1.0 + step(0.6, rnd) * (rnd - 0.6) * a * 3.5;
  float newX    = (uv.x - 0.5) / stretch + 0.5;
  float inBnd   = step(0.0, newX) * step(newX, 1.0);
  return prev(vec2(newX, uv.y)) * inBnd;
}`,
  },

  {
    name: "Neon Flare", id: "NFR",
    defaultSensitivity: 0.76,
    defaultDurationMs: 80,
    defaultCooldownMs: 800,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a   = u_amount;
  float t   = u_time;
  vec3  c   = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float r   = length(uv - 0.5);
  float flare = exp(-r * 3.0) * a * u_level;
  vec3  neon  = vec3(
    sin(t * 5.0) * 0.5 + 0.5,
    sin(t * 3.7 + 2.0) * 0.5 + 0.5,
    sin(t * 6.3 + 4.0) * 0.5 + 0.5
  );
  return clamp(c + neon * flare * lum * 2.0, 0.0, 1.0);
}`,
  },

  {
    name: "Static Block", id: "SBK",
    defaultSensitivity: 0.70,
    defaultDurationMs: 90,
    defaultCooldownMs: 550,
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float t    = u_time;
  float a    = u_amount;
  float bsz  = 0.15 + (1.0 - a) * 0.1;
  vec2  bid  = floor(uv / bsz);
  float rnd  = hash(bid + floor(t * 10.0));
  float bad  = step(0.75, rnd) * a;
  vec3  noise = vec3(
    hash(bid + vec2(t * 33.1, 0.0)),
    hash(bid + vec2(0.0, t * 27.7)),
    hash(bid + vec2(t * 17.3, t * 41.9))
  );
  return mix(prev(uv), noise, bad);
}`,
  },
];

export const DISRUPTORS: Disruptor[] = [...BUILTIN_DISRUPTORS, ...INDUSTRIAL_DISRUPTORS];
