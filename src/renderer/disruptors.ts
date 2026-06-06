/**
 * Perturbateurs — glitch events courts et intenses, déclenchés par l'audio.
 * Même format que les effets (vec3 process(vec2 uv)) mais appliqués
 * de façon probabiliste et éphémère plutôt que continue.
 */

export interface Disruptor {
  name: string;
  body: string;
  defaultSensitivity: number; // 0..1 — seuil de déclenchement
  defaultDurationMs: number;  // durée d'un burst
  defaultCooldownMs: number;  // temps minimal entre deux bursts
}

export const DISRUPTORS: Disruptor[] = [
  {
    name: "Déchirure",
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
    name: "Dropout",
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
    name: "Strobe",
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
    name: "Corrupt",
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
    name: "Tremor",
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
    name: "Phosphore",
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
    name: "Flicker",
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
    name: "Shatter",
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
    name: "Bloom Burst",
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
    name: "Glitch Rows",
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
];
