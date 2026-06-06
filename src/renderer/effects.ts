/**
 * Effets de post-traitement, dans l'ordre de la chaîne :
 *   génération → entropie → feedback → glitch → filtre
 *
 * Chaque effet fournit une fonction GLSL ES 3.00 :
 *   vec3 process(vec2 uv)
 * avec, fournis par le moteur (gl.ts) :
 *   prev(uv)  → couleur de la passe précédente
 *   fb(uv)    → couleur du frame précédent (historique, pour le feedback)
 *   hash(p)   → bruit pseudo-aléatoire
 *   uniforms  : u_time, u_resolution, u_bass/mid/treble/level, u_amount (0..1)
 */

export interface Effect {
  name: string;
  body: string;
}

export const EFFECTS: Effect[] = [
  {
    name: "Entropie",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  // micro-déplacement aléatoire (plus vif sur les aigus)
  vec2 j = (vec2(hash(uv + u_time), hash(uv.yx - u_time)) - 0.5) * a * 0.03 * (0.4 + u_treble);
  vec3 c = prev(uv + j);
  // grain additif
  float g = hash(uv * u_resolution + u_time) - 0.5;
  return c + g * a * (0.12 + u_treble * 0.25);
}`,
  },
  {
    name: "Feedback",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  // historique légèrement zoomé + tourné → traînées
  vec2 c = uv - 0.5;
  float ang = (a * 0.06) * (0.5 + u_mid);
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 fuv = 0.5 + rot * c * (1.0 - 0.012 * a);
  vec3 hist = fb(fuv) * (0.82 + 0.16 * a);
  vec3 cur = prev(uv);
  return max(cur, hist * a + cur * (1.0 - a * 0.6));
}`,
  },
  {
    name: "Glitch",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount * (0.35 + u_bass * 1.3);
  float t = floor(u_time * 12.0);
  float row = floor(uv.y * 28.0);
  // déplacement par blocs horizontaux
  float trig = step(0.72, hash(vec2(row, t))) * a;
  vec2 off = vec2(trig * (hash(vec2(t, row)) - 0.5) * 0.25, 0.0);
  // décalage chromatique
  float s = a * 0.012;
  vec3 c;
  c.r = prev(uv + off + vec2(s, 0.0)).r;
  c.g = prev(uv + off).g;
  c.b = prev(uv + off - vec2(s, 0.0)).b;
  return c;
}`,
  },
  {
    name: "Filtre",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  vec3 c = prev(uv);
  float a = u_amount;
  // posterize
  float levels = mix(256.0, 6.0, a);
  c = floor(c * levels) / levels;
  // scanlines
  float scan = 0.5 + 0.5 * sin(uv.y * u_resolution.y * 1.2);
  c *= mix(1.0, 0.65 + 0.35 * scan, a);
  return c;
}`,
  },
  // ── Batch 4 ───────────────────────────────────────────────────────────────

  {
    name: "Invert",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount * (0.5 + u_bass * 0.5);
  return mix(prev(uv), 1.0 - prev(uv), a);
}`,
  },
  {
    name: "Grain",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec3  c = prev(uv);
  // grain
  float g = hash(uv * u_resolution + vec2(t * 117.0, t * 73.0)) - 0.5;
  // halation : saignement des zones lumineuses
  vec2  px = 1.0 / u_resolution;
  vec3  halo = vec3(0.0);
  for (int i = 1; i <= 5; i++) {
    float r = float(i) * 2.0;
    halo += prev(uv+vec2(r,0)*px) + prev(uv-vec2(r,0)*px)
          + prev(uv+vec2(0,r)*px) + prev(uv-vec2(0,r)*px);
  }
  halo /= 20.0;
  float lum = dot(halo, vec3(0.299,0.587,0.114));
  c += halo * max(0.0, lum - 0.55) * a * 1.8;
  c += g * a * (0.06 + u_treble * 0.08);
  return c;
}`,
  },
  // ── Batch 3 ───────────────────────────────────────────────────────────────

  {
    name: "Neon",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a  = u_amount;
  vec2  px = 1.5 / u_resolution;
  vec3  tl = prev(uv+vec2(-px.x, px.y)), tr = prev(uv+vec2(px.x, px.y));
  vec3  bl = prev(uv+vec2(-px.x,-px.y)), br = prev(uv+vec2(px.x,-px.y));
  vec3  l  = prev(uv+vec2(-px.x,0.0)),  r2 = prev(uv+vec2(px.x,0.0));
  vec3  tu = prev(uv+vec2(0.0, px.y)),  bo = prev(uv+vec2(0.0,-px.y));
  vec3  sx = (tr+2.0*r2+br)-(tl+2.0*l+bl);
  vec3  sy = (tl+2.0*tu+tr)-(bl+2.0*bo+br);
  float edge = length(sx) + length(sy);
  vec3  c = prev(uv);
  float hue = fract(edge * 2.0 + u_time * 0.25);
  vec3  nc = mix(vec3(0.0,0.8,1.0), vec3(1.0,0.2,0.8), hue);
  return c + nc * edge * 4.5 * a * (0.5 + u_bass * 0.5);
}`,
  },
  {
    name: "Onde",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 c1 = vec2(0.5 + 0.2*sin(t*0.7),  0.5 + 0.2*cos(t*0.5));
  vec2 c2 = vec2(0.5 + 0.25*cos(t*0.4+1.0), 0.5 + 0.15*sin(t*0.6));
  float rip = sin(length(uv-c1)*30.0 - t*8.0)
            + sin(length(uv-c2)*25.0 - t*6.0);
  vec2 off = vec2(cos(rip*PI), sin(rip*PI)) * a * 0.013 * (0.5 + u_bass * 0.7);
  return prev(clamp(uv + off, 0.001, 0.999));
}`,
  },
  {
    name: "Fisheye",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a  = u_amount;
  vec2  p  = uv * 2.0 - 1.0;
  float r2 = dot(p, p);
  float k  = a * (0.6 + u_mid * 0.4);
  vec2  suv = clamp((p * (1.0 - k * r2) + 1.0) * 0.5, 0.001, 0.999);
  return mix(prev(uv), prev(suv), a);
}`,
  },
  {
    name: "Hue",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a    = u_amount;
  float ang  = a * TWO_PI * (0.3 + u_mid * 0.5) + u_time * a * 0.3;
  float c    = cos(ang), s = sin(ang);
  // matrice de rotation de teinte (column-major GLSL)
  mat3 rot = mat3(
    0.213+c*0.787-s*0.213, 0.715-c*0.715-s*0.715, 0.072-c*0.072+s*0.928,
    0.213-c*0.213+s*0.143, 0.715+c*0.285+s*0.140, 0.072-c*0.072-s*0.283,
    0.213-c*0.213-s*0.787, 0.715-c*0.715+s*0.715, 0.072+c*0.928+s*0.072
  );
  return mix(prev(uv), rot * prev(uv), a);
}`,
  },
  {
    name: "Scanlines",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a     = u_amount;
  vec3  c     = prev(uv);
  float row   = floor(uv.y * u_resolution.y);
  // scanlines alternées
  float scan  = mix(1.0, mod(row, 2.0) < 1.0 ? 1.0 : 0.35, a);
  // dot mask RGB phosphore
  float col3  = mod(floor(uv.x * u_resolution.x) + mod(row, 3.0), 3.0);
  vec3  mask  = col3 < 1.0 ? vec3(1.0,0.35,0.35) : (col3 < 2.0 ? vec3(0.35,1.0,0.35) : vec3(0.35,0.35,1.0));
  // flou vertical (rémanence phosphore)
  vec2  px    = 1.0 / u_resolution;
  vec3  blur  = c*0.5 + prev(uv+vec2(0,px.y))*0.25 + prev(uv-vec2(0,px.y))*0.25;
  c = mix(c, blur * mask * scan, a);
  // vignette CRT
  vec2  vn = uv * (1.0 - uv.yx);
  float vig = pow(vn.x * vn.y * 15.0, a * 0.35);
  return c * mix(1.0, vig, a);
}`,
  },
  {
    name: "Datamosh",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a    = u_amount;
  float t    = u_time;
  float bs   = 0.035 + a * 0.055;
  vec2  bid  = floor(uv / bs) * bs;
  float rnd  = hash(bid + floor(t * 2.0));
  float keep = step(0.68 - a * 0.38, rnd);
  vec2  mot  = (vec2(hash(bid+5.0), hash(bid+10.0))-0.5) * a * 0.14 * keep;
  vec3  cur  = prev(uv);
  vec3  old  = fb(clamp(uv + mot, 0.001, 0.999));
  return mix(cur, old, keep * a * (0.5 + u_bass * 0.45));
}`,
  },
  // ── Batch 2 ───────────────────────────────────────────────────────────────

  {
    name: "Pixelate",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a    = u_amount;
  float size = max(0.004, mix(0.004, 0.12, a*a) * (1.0 + u_bass * 0.4 * a));
  vec2  puv  = floor(uv / size) * size + size * 0.5;
  return prev(clamp(puv, 0.001, 0.999));
}`,
  },
  {
    name: "Thermal",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a   = u_amount;
  vec3  c   = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  // noir → violet → rouge → orange → blanc
  vec3 th = vec3(0.0);
  th = mix(th, vec3(0.35, 0.00, 0.50), smoothstep(0.00, 0.22, lum));
  th = mix(th, vec3(0.80, 0.00, 0.10), smoothstep(0.22, 0.45, lum));
  th = mix(th, vec3(1.00, 0.45, 0.00), smoothstep(0.45, 0.68, lum));
  th = mix(th, vec3(1.00, 1.00, 0.90), smoothstep(0.68, 1.00, lum));
  return mix(c, th, a);
}`,
  },
  {
    name: "Zoom",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a   = u_amount;
  vec2  dir = uv - 0.5;
  float s   = a * a * (0.25 + u_level * 0.2);
  vec3  col = vec3(0.0);
  float w   = 0.0;
  for (int i = 0; i < 10; i++) {
    float t  = float(i) / 9.0;
    float wt = 1.0 - t * 0.6;
    col += prev(clamp(uv - dir * s * t, 0.001, 0.999)) * wt;
    w   += wt;
  }
  return col / w;
}`,
  },
  {
    name: "VHS",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a  = u_amount;
  float t  = u_time;
  float band  = hash(vec2(floor(uv.y * 240.0), floor(t * 9.0)));
  float shift = step(0.93 - a * 0.25, band) * (hash(vec2(band, t)) - 0.5) * a * 0.18;
  vec2  suv = vec2(clamp(uv.x + shift, 0.001, 0.999), uv.y);
  vec3  c   = prev(suv);
  float bl  = a * 0.007;
  c.r = mix(c.r, prev(clamp(suv + vec2( bl, 0.0), 0.001, 0.999)).r, a * 0.45);
  c.b = mix(c.b, prev(clamp(suv - vec2( bl, 0.0), 0.001, 0.999)).b, a * 0.45);
  c  *= 1.0 - a * 0.12 * sin(uv.y * 720.0 * PI);
  c  += (hash(uv * u_resolution + t) - 0.5) * a * 0.07;
  return c;
}`,
  },
  {
    name: "Seuil",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a    = u_amount;
  vec3  c    = prev(uv);
  float lvl  = mix(256.0, 3.0, a);
  vec3  post = floor(c * lvl) / lvl;
  vec2  px   = 2.0 / u_resolution;
  vec3  dx   = prev(uv + vec2(px.x, 0.0)) - prev(uv - vec2(px.x, 0.0));
  vec3  dy   = prev(uv + vec2(0.0, px.y)) - prev(uv - vec2(0.0, px.y));
  float edge = length(dx) + length(dy);
  return post + vec3(0.9, 0.45, 0.05) * edge * 6.0 * a * (0.5 + u_bass * 0.6);
}`,
  },
  // ── Batch 1 ───────────────────────────────────────────────────────────────

  {
    name: "Aberration",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a   = u_amount;
  vec2 dir  = uv - 0.5;
  float s   = a * (0.018 + u_bass * 0.025);
  float r   = prev(clamp(uv + dir * s * 1.8, 0.0, 1.0)).r;
  float g   = prev(uv).g;
  float b   = prev(clamp(uv - dir * s * 1.8, 0.0, 1.0)).b;
  return vec3(r, g, b);
}`,
  },
  {
    name: "Bloom",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  vec3  col   = prev(uv);
  float a     = u_amount;
  vec2  px    = 1.0 / u_resolution;
  vec3  bloom = vec3(0.0);
  float total = 0.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    float w = exp(-float(x*x + y*y) * 0.35);
    vec3  s = prev(uv + vec2(x, y) * px * (2.5 + a * 5.0));
    float lum = dot(s, vec3(0.299, 0.587, 0.114));
    bloom += s * max(0.0, lum - (0.45 - a * 0.35)) * w;
    total += w;
  }
  bloom /= total;
  return col + bloom * a * (0.9 + u_treble * 0.6);
}`,
  },
  {
    name: "Miroir",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a    = u_amount;
  float segs = 2.0 + floor(a * 6.0);   // 2..8 segments
  vec2  p    = uv - 0.5;
  float ang  = atan(p.y, p.x) + u_time * 0.08 * a;
  float r    = length(p);
  float segA = PI / segs;
  ang = mod(ang + PI, segA * 2.0);
  if (ang > segA) ang = segA * 2.0 - ang;
  ang -= PI;
  vec2 muv = clamp(0.5 + r * vec2(cos(ang), sin(ang)), 0.001, 0.999);
  return mix(prev(uv), prev(muv), a);
}`,
  },
  {
    name: "Dithering",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);
  // Quantize color levels (2-8 levels per channel)
  float levels = mix(256.0, 2.0, a);
  vec3 quant = floor(c * levels) / levels;
  // Floyd-Steinberg error diffusion: distribute quantization error
  vec3 error = c - quant;
  vec2 px = 1.0 / u_resolution;
  // Apply dither by adding weighted error from neighboring pixels
  vec3 right = prev(clamp(uv + vec2(px.x, 0.0), 0.001, 0.999));
  vec3 down = prev(clamp(uv + vec2(0.0, -px.y), 0.001, 0.999));
  vec3 diag = prev(clamp(uv + vec2(px.x, -px.y), 0.001, 0.999));
  // Floyd-Steinberg kernel weights: right=7/16, down-left=3/16, down=5/16, down-right=1/16
  // Approximate by distributing error to neighbors
  vec3 dither = error * 0.43 * (
    right * 0.44 + down * 0.31 + diag * 0.062 +
    (right + down + diag) * hash(uv * u_resolution + u_time)
  );
  return mix(c, quant + dither * (0.3 + u_treble * 0.7), a);
}`,
  },
];
