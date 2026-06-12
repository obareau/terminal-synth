/**
 * Industrial shaders (v1.7 — Industrial Mode roadmap).
 *
 * 20 monochrome-native generators, design language: clinique, technique,
 * brutaliste. Reference: Ryoji Ikeda, Alva Noto, Raster-Noton, Severance UI.
 *
 * Each returns vec3(intensity) (grayscale). The N&B / dither / palette
 * post-process is applied globally by gl.ts when Industrial Mode is ON
 * (added in a later step) — generators here stay monochrome by design.
 *
 * Uniform mapping from the standalone proto (proto/industrial-mode.html):
 *   proto u_beat   -> u_bass  (drives "kick" pulses)
 *   proto u_energy -> u_level (overall energy)
 *   proto u_res    -> res (function arg)
 */

import type { Shader } from "./shaders";

export const INDUSTRIAL_SHADERS: Shader[] = [
  // 01 — GRID PULSE
  {
    name: "GRID PULSE",
    category: "Industrial",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(res.x/res.y, 1.0) * 20.0 + vec2(u_time * 0.3, 0.0);
  vec2 g = abs(fract(p) - 0.5);
  float line = smoothstep(0.48, 0.50, max(g.x, g.y));
  float thick = 1.0 - smoothstep(0.40 - u_bass * 0.15, 0.50, max(g.x, g.y));
  float v = max(line * 0.3, thick * (0.6 + u_bass * 0.4));
  return vec3(v);
}`,
  },

  // 02 — DATAMATRIX RAIN
  {
    name: "DATAMATRIX RAIN",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  float cols = 80.0, rows = 45.0;
  vec2 cell = vec2(floor(uv.x*cols), floor(uv.y*rows));
  float speed = mix(2.0, 6.0, h21(vec2(cell.x, 7.0)));
  float row = cell.y + u_time * speed;
  float bit = step(0.5, h21(vec2(cell.x, floor(row))));
  float head = exp(-fract(row) * 4.0);
  vec2 cuv = fract(uv * vec2(cols, rows));
  vec2 d = abs(cuv - 0.5);
  float glyph = bit > 0.5
    ? (1.0 - smoothstep(0.20, 0.22, max(d.x, d.y)))
    : (1.0 - smoothstep(0.10, 0.12, max(d.x, d.y)));
  return vec3(glyph * (0.3 + head * 0.7));
}`,
  },

  // 03 — CONTOUR MAP
  {
    name: "CONTOUR MAP",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=h21(i), b=h21(i+vec2(1,0)), c=h21(i+vec2(0,1)), d=h21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
// Same 5-octave fbm, pre-baked into u_fbmTex at startup (1 fetch vs 20 hashes)
float fbm(vec2 p){ return fbmTex(p); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * 3.0 + vec2(u_time*0.1, u_time*0.05);
  float n = fbm(p);
  float bands = abs(fract(n*12.0) - 0.5);
  float line = smoothstep(0.10, 0.0, bands);
  float bold = abs(fract(n*12.0/5.0) - 0.5);
  line += smoothstep(0.05, 0.0, bold) * 0.6;
  return vec3(line);
}`,
  },

  // 04 — TUNNEL SCHEMATIC
  {
    name: "TUNNEL SCHEMATIC",
    category: "Industrial",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv - 0.5; p.x *= res.x/res.y;
  float a = atan(p.y, p.x), r = length(p);
  float z = 0.2/r + u_time*0.5;
  float ang = abs(fract(a/6.2831*16.0) - 0.5);
  float radial = smoothstep(0.48, 0.50, ang);
  float depth = abs(fract(z) - 0.5);
  float rings = smoothstep(0.45, 0.48, depth);
  float v = max(radial, rings) * smoothstep(0.0, 0.4, r);
  return vec3(v);
}`,
  },

  // 05 — GLYPH FIELD
  {
    name: "GLYPH FIELD",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(60.0, 40.0);
  vec2 cell = floor(p), cuv = fract(p);
  float seed = h21(cell + floor(u_time*2.0));
  if (seed < 0.55 + u_level*0.3) return vec3(0.0);
  vec2 d = cuv - 0.5; float glyph;
  if (seed < 0.7) {
    glyph = 1.0 - smoothstep(0.05, 0.08, abs(d.y));
    glyph *= 1.0 - smoothstep(0.30, 0.35, abs(d.x));
  } else if (seed < 0.85) {
    float h = 1.0 - smoothstep(0.05, 0.08, abs(d.y));
    float vv = 1.0 - smoothstep(0.05, 0.08, abs(d.x));
    glyph = max(h, vv) * (1.0 - smoothstep(0.30, 0.35, max(abs(d.x), abs(d.y))));
  } else {
    float outer = 1.0 - smoothstep(0.30, 0.32, max(abs(d.x), abs(d.y)));
    float inner = 1.0 - smoothstep(0.22, 0.24, max(abs(d.x), abs(d.y)));
    glyph = outer - inner;
  }
  return vec3(glyph);
}`,
  },

  // 06 — HALFTONE SPHERE
  {
    name: "HALFTONE SPHERE",
    category: "Industrial",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv - 0.5; p.x *= res.x/res.y;
  float r = length(p);
  float sphere = smoothstep(0.45, 0.44, r);
  vec2 g = p * 60.0;
  vec2 cuv = fract(g) - 0.5;
  vec2 lp = p * 2.0;
  float light = clamp(0.5 + lp.x*0.6 - lp.y*0.4 - r*1.2 + u_bass*0.2, 0.0, 1.0);
  float dotR = mix(0.05, 0.42, light) * sphere;
  float dotV = 1.0 - smoothstep(dotR, dotR+0.02, length(cuv));
  return vec3(dotV * sphere);
}`,
  },

  // 07 — SCAN BARS
  {
    name: "SCAN BARS",
    category: "Industrial",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float bars = abs(fract(uv.y*40.0 + u_time*1.5) - 0.5);
  float v = smoothstep(0.22, 0.18, bars);
  float wob = sin(uv.y*220.0 + u_time*8.0)*0.5 + 0.5;
  v *= mix(0.5, 1.0, wob);
  float head = smoothstep(0.0, 0.04, fract(uv.y*40.0 + u_time*1.5));
  v = max(v, head*0.6);
  float sweep = smoothstep(0.0, 0.02, fract(uv.x - u_time*0.2)) * 0.3;
  return vec3(clamp(v + sweep*u_level, 0.0, 1.0));
}`,
  },

  // 08 — WIRE CUBE ARRAY
  {
    name: "WIRE CUBE ARRAY",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(res.x/res.y, 1.0) * 6.0;
  vec2 cell = floor(p), cuv = fract(p) - 0.5;
  float a = u_time*0.6 + h21(cell)*6.28;
  cuv = rot(a) * cuv;
  vec2 ad = abs(cuv);
  float sq = max(ad.x, ad.y);
  float face = smoothstep(0.32, 0.30, sq) - smoothstep(0.28, 0.26, sq);
  vec2 cuv2 = cuv + vec2(0.08, -0.08);
  vec2 ad2 = abs(cuv2);
  float sq2 = max(ad2.x, ad2.y);
  float back = smoothstep(0.32, 0.30, sq2) - smoothstep(0.28, 0.26, sq2);
  return vec3(max(face, back*0.5));
}`,
  },

  // 09 — PLOTTER LINES
  {
    name: "PLOTTER LINES",
    category: "Industrial",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float v = 0.0;
  // shared cheap modulation, computed once
  float mod1 = sin(uv.x*9.0 + u_time*0.8)*0.005;
  for (int i=0; i<14; i++) {
    float fi = float(i);
    float y = fi/14.0 + sin(uv.x*4.0 + u_time*0.5 + fi*0.3)*0.015 + mod1;
    v = max(v, smoothstep(0.005, 0.0, abs(uv.y - y)));
  }
  return vec3(v);
}`,
  },

  // 10 — SIGNAL SPECTRUM
  {
    name: "SIGNAL SPECTRUM",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=h21(i), b=h21(i+vec2(1,0)), c=h21(i+vec2(0,1)), d=h21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
vec3 render(vec2 uv, vec2 res) {
  float bars = 64.0;
  float idx = floor(uv.x * bars);
  float base = pow(1.0 - idx/bars, 1.5);
  float jit = n2(vec2(idx*0.3, u_time*4.0)) * 0.6;
  float h = clamp(base*0.6 + jit*0.7 + u_level*0.3 + u_bass*0.2, 0.0, 1.0);
  float colSpace = fract(uv.x * bars);
  float gap = smoothstep(0.0, 0.08, colSpace) * smoothstep(1.0, 0.92, colSpace);
  float bar = step(1.0 - h, uv.y) * gap;
  float bar2 = step(1.0 - h, 1.0 - uv.y) * gap;
  return vec3(max(bar*0.9, bar2*0.4));
}`,
  },

  // 11 — BINARY STATIC
  {
    name: "BINARY STATIC",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(120.0, 70.0);
  vec2 cell = floor(p), cuv = fract(p) - 0.5;
  float flick = floor(u_time*6.0 + h21(cell)*10.0);
  float bit = step(0.5, h21(cell + flick*0.1));
  float v;
  if (bit > 0.5) {
    v = (1.0 - smoothstep(0.05, 0.08, abs(cuv.x)))
      * (1.0 - smoothstep(0.34, 0.38, abs(cuv.y)));
  } else {
    float r = length(cuv);
    v = smoothstep(0.32, 0.30, r) - smoothstep(0.24, 0.22, r);
  }
  return vec3(v);
}`,
  },

  // 12 — ISO MOUNTAINS
  {
    name: "ISO MOUNTAINS",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=h21(i), b=h21(i+vec2(1,0)), c=h21(i+vec2(0,1)), d=h21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
// Same 5-octave fbm, pre-baked into u_fbmTex at startup (1 fetch vs 20 hashes)
float fbm(vec2 p){ return fbmTex(p); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv*vec2(3.0, 1.0) + vec2(u_time*0.05, 0.0);
  float h = fbm(p)*0.6 + fbm(p*2.0 + 5.0)*0.2;
  float bands = abs(fract(h*20.0) - 0.5);
  float line = smoothstep(0.08, 0.0, bands);
  float horiz = smoothstep(0.0, 0.04, abs(uv.y - (0.3 + h*0.4)));
  return vec3(max(line, 1.0 - horiz));
}`,
  },

  // 13 — CIRCUIT TRACE
  {
    name: "CIRCUIT TRACE",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float h11(float p){ return fract(sin(p*78.233)*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(res.x/res.y, 1.0) * 16.0;
  vec2 cell = floor(p), cuv = fract(p) - 0.5;
  float seed = h21(cell);
  float v = 0.0;
  if (seed < 0.4) {
    v = 1.0 - smoothstep(0.04, 0.06, abs(cuv.y));
  } else if (seed < 0.8) {
    v = 1.0 - smoothstep(0.04, 0.06, abs(cuv.x));
  } else {
    float h = 1.0 - smoothstep(0.04, 0.06, abs(cuv.y));
    float vv = 1.0 - smoothstep(0.04, 0.06, abs(cuv.x));
    v = max(h, vv);
    v = max(v, 1.0 - smoothstep(0.12, 0.14, length(cuv)));
  }
  float pulse = h11(floor(cell.x + cell.y*7.0));
  float t = fract(u_time*0.7 + pulse);
  v *= mix(0.35, 1.0, step(abs(t - 0.5), 0.15));
  return vec3(v);
}`,
  },

  // 14 — PHOSPHOR TRAILS
  {
    name: "PHOSPHOR TRAILS",
    category: "Industrial",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv - 0.5; p.x *= res.x/res.y;
  float v = 0.0;
  for (int i=0; i<8; i++) {
    float ti = u_time - float(i)*0.07;
    vec2 lp = vec2(sin(ti*1.7), sin(ti*2.3 + 1.3))*0.4;
    float d = length(p - lp);
    v += exp(-d*40.0) * (1.0 - float(i)/8.0);
  }
  return vec3(clamp(v, 0.0, 1.0));
}`,
  },

  // 15 — ASCII TUNNEL
  {
    name: "ASCII TUNNEL",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv - 0.5; p.x *= res.x/res.y;
  float r = length(p), a = atan(p.y, p.x);
  float z = 0.4/r + u_time*0.8;
  vec2 tp = vec2(a/6.2831*40.0, z*4.0);
  vec2 cell = floor(tp), cuv = fract(tp) - 0.5;
  float seed = h21(cell);
  float v;
  if (seed < 0.5) {
    v = (1.0 - smoothstep(0.06, 0.10, abs(cuv.x)))
      * (1.0 - smoothstep(0.34, 0.40, abs(cuv.y)));
  } else if (seed < 0.8) {
    v = (1.0 - smoothstep(0.06, 0.10, abs(cuv.y)))
      * (1.0 - smoothstep(0.34, 0.40, abs(cuv.x)));
  } else {
    v = 1.0 - smoothstep(0.22, 0.26, length(cuv));
  }
  return vec3(v * smoothstep(0.0, 0.4, r));
}`,
  },

  // 16 — GLYPH TUNNEL
  {
    name: "GLYPH TUNNEL",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv - 0.5; p.x *= res.x/res.y;
  float r = length(p), a = atan(p.y, p.x);
  float z = log(r + 0.05) + u_time*0.4;
  vec2 tp = vec2(a/6.2831*24.0, z*3.0);
  vec2 cell = floor(tp), cuv = fract(tp) - 0.5;
  float seed = h21(cell + floor(u_time));
  if (seed < 0.35) return vec3(0.0);
  vec2 d = abs(cuv);
  float glyph = smoothstep(0.36, 0.30, max(d.x, d.y))
              - smoothstep(0.22, 0.18, max(d.x, d.y));
  return vec3(glyph * smoothstep(0.0, 0.5, r));
}`,
  },

  // 17 — STROBE GRID
  {
    name: "STROBE GRID",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(res.x/res.y, 1.0) * 10.0;
  vec2 cell = floor(p), cuv = fract(p) - 0.5;
  float seed = h21(cell + floor(u_time*2.0));
  vec2 d = abs(cuv);
  float box = smoothstep(0.46, 0.44, max(d.x, d.y));
  float on = step(seed, 0.2 + u_bass*0.5);
  float outline = smoothstep(0.46, 0.44, max(d.x, d.y))
                - smoothstep(0.40, 0.38, max(d.x, d.y));
  return vec3(max(on*box, outline*0.4));
}`,
  },

  // 18 — NOISE BANDS
  {
    name: "NOISE BANDS",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float h11(float p){ return fract(sin(p*78.233)*43758.5453); }
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=h21(i), b=h21(i+vec2(1,0)), c=h21(i+vec2(0,1)), d=h21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
// Same 5-octave fbm, pre-baked into u_fbmTex at startup (1 fetch vs 20 hashes)
float fbm(vec2 p){ return fbmTex(p); }
vec3 render(vec2 uv, vec2 res) {
  float band = floor(uv.y * 14.0);
  float speed = mix(0.5, 3.0, h11(band));
  float n = fbm(vec2(uv.x*8.0 + u_time*speed, band));
  float gap = smoothstep(0.05, 0.0, abs(fract(uv.y*14.0) - 0.5) - 0.45);
  return vec3(n * (1.0 - gap));
}`,
  },

  // 19 — BITMAP SMEAR
  {
    name: "BITMAP SMEAR",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=h21(i), b=h21(i+vec2(1,0)), c=h21(i+vec2(0,1)), d=h21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
vec3 render(vec2 uv, vec2 res) {
  vec2 p = floor(uv*vec2(160.0, 90.0)) / vec2(160.0, 90.0);
  float v = 0.0;
  for (int i=0; i<3; i++) {
    vec2 q = p; q.x -= float(i)*0.016;
    v += n2(q*20.0 + vec2(u_time*0.3, u_time*0.1)) * (1.0 - float(i)/3.0);
  }
  v /= 1.8; v = smoothstep(0.45, 0.7, v);
  return vec3(v);
}`,
  },

  // 20 — CODE CASCADE
  {
    name: "CODE CASCADE",
    category: "Industrial",
    src: /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float h11(float p){ return fract(sin(p*78.233)*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(100.0, 50.0);
  p.y += u_time * 8.0;
  vec2 cell = floor(p), cuv = fract(p) - 0.5;
  float lineLen = h11(floor(cell.y))*0.8 + 0.1;
  if (uv.x > lineLen) return vec3(0.0);
  float indent = floor(h11(floor(cell.y) + 3.0)*4.0);
  if (cell.x < indent) return vec3(0.0);
  float seed = h21(cell);
  vec2 d = abs(cuv);
  float v;
  if (seed < 0.35) {
    v = (1.0 - smoothstep(0.06, 0.10, d.y)) * (1.0 - smoothstep(0.30, 0.36, d.x));
  } else if (seed < 0.6) {
    v = (1.0 - smoothstep(0.06, 0.10, d.x)) * (1.0 - smoothstep(0.30, 0.36, d.y));
  } else if (seed < 0.85) {
    float h = 1.0 - smoothstep(0.06, 0.10, d.y);
    float vv = 1.0 - smoothstep(0.06, 0.10, d.x);
    v = max(h, vv) * (1.0 - smoothstep(0.30, 0.36, max(d.x, d.y)));
  } else {
    v = smoothstep(0.32, 0.28, max(d.x, d.y)) - smoothstep(0.20, 0.16, max(d.x, d.y));
  }
  return vec3(v);
}`,
  },
];
