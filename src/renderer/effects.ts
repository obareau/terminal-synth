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
  id: string;
  body: string;
}

export const EFFECTS: Effect[] = [
  {
    name: "Entropie", id: "ENT",
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
    name: "Feedback", id: "FDB",
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
    name: "Glitch", id: "GLT",
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
    name: "Filtre", id: "FLT",
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
    name: "Invert", id: "INV",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount * (0.5 + u_bass * 0.5);
  return mix(prev(uv), 1.0 - prev(uv), a);
}`,
  },
  {
    name: "Grain", id: "GRN",
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
    name: "Neon", id: "NEO",
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
    name: "Onde", id: "OND",
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
    name: "Fisheye", id: "FSH",
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
    name: "Hue", id: "HUE",
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
    name: "Scanlines", id: "SCN",
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
    name: "Datamosh", id: "DTM",
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
    name: "Pixelate", id: "PIX",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a    = u_amount;
  float size = max(0.004, mix(0.004, 0.12, a*a) * (1.0 + u_bass * 0.4 * a));
  vec2  puv  = floor(uv / size) * size + size * 0.5;
  return prev(clamp(puv, 0.001, 0.999));
}`,
  },
  {
    name: "Thermal", id: "THM",
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
    name: "Zoom", id: "ZOM",
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
    name: "VHS", id: "VHS",
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
    name: "Seuil", id: "SEU",
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
    name: "Aberration", id: "ABR",
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
    name: "Bloom", id: "BLM",
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
    name: "Miroir", id: "MIR",
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
    name: "Dithering", id: "DTH",
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

  // ── NEW EFFECTS (5) ────────────────────────────────────────────────────────

  {
    name: "Chrono", id: "CHR",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 col = prev(uv);

  // 8-level frame history decay
  vec3 ghost = vec3(0.0);
  float totalWeight = 1.0;

  // Sample frame history at different time offsets with exponential decay
  for (int i = 1; i <= 8; i++) {
    float level = float(i) / 8.0;
    float decay = pow(0.75, level * 8.0);

    // Time-displaced sample (simulating motion trail)
    float timeLag = level * 0.05;
    vec2 ghostUV = mix(uv, uv + (vec2(hash(uv + float(i)), hash(uv.yx - float(i))) - 0.5) * 0.08, level);

    ghost += fb(clamp(ghostUV, 0.001, 0.999)) * decay;
    totalWeight += decay;
  }

  ghost /= totalWeight;
  ghost *= a * (0.6 + u_level * 0.4);

  return mix(col, col + ghost, a);
}`,
  },
  {
    name: "Kuwahara", id: "KUW",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 px = 2.0 / u_resolution;

  // 4-quadrant edge-preserving filter (oil painting effect)
  vec3 quad[4];
  float mean[4];
  float var[4];

  // Top-left quadrant
  quad[0] = prev(uv + vec2(-px.x, px.y)) + prev(uv + vec2(0, px.y))
          + prev(uv + vec2(-px.x, 0)) + prev(uv);
  quad[0] /= 4.0;
  mean[0] = (dot(quad[0], vec3(0.299, 0.587, 0.114))) * 0.25;

  // Top-right quadrant
  quad[1] = prev(uv + vec2(px.x, px.y)) + prev(uv + vec2(0, px.y))
          + prev(uv + vec2(px.x, 0)) + prev(uv);
  quad[1] /= 4.0;
  mean[1] = (dot(quad[1], vec3(0.299, 0.587, 0.114))) * 0.25;

  // Bottom-left quadrant
  quad[2] = prev(uv + vec2(-px.x, -px.y)) + prev(uv + vec2(0, -px.y))
          + prev(uv + vec2(-px.x, 0)) + prev(uv);
  quad[2] /= 4.0;
  mean[2] = (dot(quad[2], vec3(0.299, 0.587, 0.114))) * 0.25;

  // Bottom-right quadrant
  quad[3] = prev(uv + vec2(px.x, -px.y)) + prev(uv + vec2(0, -px.y))
          + prev(uv + vec2(px.x, 0)) + prev(uv);
  quad[3] /= 4.0;
  mean[3] = (dot(quad[3], vec3(0.299, 0.587, 0.114))) * 0.25;

  // Select quadrant with minimum variance (best preserved edges)
  int minIdx = 0;
  float minVar = 1e10;
  for (int i = 0; i < 4; i++) {
    float m = mean[i];
    var[i] = abs(dot(quad[i], vec3(0.299, 0.587, 0.114)) - m * 4.0);
    if (var[i] < minVar) {
      minVar = var[i];
      minIdx = i;
    }
  }

  vec3 result = mix(prev(uv), quad[minIdx], a * (0.5 + u_mid * 0.5));
  return result;
}`,
  },
  {
    name: "Slit Scan", id: "SLT",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;

  // Temporal video synthesis: scan through time at different spatial positions
  vec2 p = uv * 2.0 - 1.0;
  float t = u_time * a * 0.8;

  // Vertical slit scan displaced in time
  float slitWidth = 0.08 + a * 0.12;
  float slitPos = mod(p.x * 2.0 + t, 2.0) - 1.0;

  // Sample current frame at slit
  vec3 col = prev(uv);

  // Sample history frames at time-displaced positions
  vec3 scanCol = vec3(0.0);
  float weight = 0.0;

  for (int i = 0; i < 5; i++) {
    float phase = float(i) / 5.0;
    float timeScan = t * (0.5 + phase * 0.8);

    vec2 scanUV = vec2(
      mod(uv.x + timeScan * 0.15, 1.0),
      clamp(uv.y + sin(timeScan * 2.0) * 0.1, 0.001, 0.999)
    );

    float dist = abs(scanUV.x - uv.x);
    float w = exp(-dist * dist * 15.0 / slitWidth);

    scanCol += fb(clamp(scanUV, 0.001, 0.999)) * w;
    weight += w;
  }

  scanCol /= weight;
  return mix(col, scanCol, a * (0.6 + u_bass * 0.4));
}`,
  },
  {
    name: "Glow Edges", id: "GLW",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 px = 1.5 / u_resolution;

  // Edge detection (Sobel-like)
  vec3 tl = prev(uv+vec2(-px.x, px.y)), tr = prev(uv+vec2(px.x, px.y));
  vec3 bl = prev(uv+vec2(-px.x,-px.y)), br = prev(uv+vec2(px.x,-px.y));
  vec3 l  = prev(uv+vec2(-px.x,0.0)),  r2 = prev(uv+vec2(px.x,0.0));
  vec3 tu = prev(uv+vec2(0.0, px.y)),  bo = prev(uv+vec2(0.0,-px.y));

  vec3 sx = (tr+2.0*r2+br)-(tl+2.0*l+bl);
  vec3 sy = (tl+2.0*tu+tr)-(bl+2.0*bo+br);
  float edge = length(sx) + length(sy);

  // Bloom trails on edges
  vec3 col = prev(uv);
  float edgeGlow = edge * 3.0 * a;

  // Multi-scale bloom decay
  vec3 bloomTrail = vec3(0.0);
  for (int i = 1; i <= 4; i++) {
    float dist = float(i) * 1.5;
    float decay = pow(0.7, float(i));
    bloomTrail += prev(clamp(uv + vec2(px.x * dist, 0.0), 0.001, 0.999)) * decay * edge;
    bloomTrail += prev(clamp(uv + vec2(-px.x * dist, 0.0), 0.001, 0.999)) * decay * edge;
    bloomTrail += prev(clamp(uv + vec2(0.0, px.y * dist), 0.001, 0.999)) * decay * edge;
    bloomTrail += prev(clamp(uv + vec2(0.0, -px.y * dist), 0.001, 0.999)) * decay * edge;
  }
  bloomTrail *= a * (0.5 + u_treble * 0.5);

  vec3 glowCol = mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 0.2, 0.8), fract(u_time * 0.5));

  return col + glowCol * edgeGlow + bloomTrail;
}`,
  },
  {
    name: "Posterize Dither", id: "PDT",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);

  // Ordered dithering with Bayer 4x4 matrix
  vec2 pixelCoord = uv * u_resolution;
  float bayerPattern[16] = float[](
    0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
    12.0/16.0, 4.0/16.0, 14.0/16.0,  6.0/16.0,
    3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
    15.0/16.0, 7.0/16.0, 13.0/16.0,  5.0/16.0
  );

  int bayerIdx = int(mod(pixelCoord.x, 4.0)) + int(mod(pixelCoord.y, 4.0)) * 4;
  float threshold = bayerPattern[bayerIdx];

  // Posterize levels (2-6 levels per channel)
  float levels = mix(256.0, 2.0, a);
  vec3 posterized = floor(c * levels) / levels;

  // Add dithering based on Bayer threshold
  vec3 error = c - posterized;
  float ditherAmount = a * (0.4 + u_level * 0.6);

  vec3 dithered = posterized;
  dithered.r += (threshold - 0.5) * 2.0 * error.r * ditherAmount;
  dithered.g += (threshold - 0.5) * 2.0 * error.g * ditherAmount;
  dithered.b += (threshold - 0.5) * 2.0 * error.b * ditherAmount;

  // Clamp to valid range
  dithered = clamp(dithered, 0.0, 1.0);

  // Re-posterize after dithering
  dithered = floor(dithered * levels) / levels;

  return mix(c, dithered, a);
}`,
  },

  {
    name: "Floyd-Steinberg", id: "FLD",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);
  float levels = mix(256.0, 2.0, a);
  vec3 quant = floor(c * levels) / levels;
  vec3 error = c - quant;
  vec2 px = 1.0 / u_resolution;
  vec3 right = prev(clamp(uv + vec2(px.x, 0.0), 0.001, 0.999));
  vec3 down = prev(clamp(uv + vec2(0.0, -px.y), 0.001, 0.999));
  vec3 downleft = prev(clamp(uv + vec2(-px.x, -px.y), 0.001, 0.999));
  vec3 downright = prev(clamp(uv + vec2(px.x, -px.y), 0.001, 0.999));
  vec3 dithered = quant + error * (0.2 + hash(uv + u_time) * 0.3) * a;
  return mix(c, dithered, a);
}`,
  },

  {
    name: "Continuous Rotate CW", id: "RCW",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float speed = u_amount * 4.0;
  float angle = u_time * speed;
  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  float c = cos(angle);
  float s = sin(angle);
  vec2 rotated = center + vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  return prev(clamp(rotated, 0.0, 1.0));
}`,
  },

  {
    name: "Continuous Rotate CCW", id: "RCC",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float speed = u_amount * 4.0;
  float angle = -u_time * speed;
  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  float c = cos(angle);
  float s = sin(angle);
  vec2 rotated = center + vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  return prev(clamp(rotated, 0.0, 1.0));
}`,
  },

  {
    name: "Scanlines Distort", id: "SCD",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float line = sin(uv.y * 100.0 + u_time * 5.0) * 0.5 + 0.5;
  float shift = sin(line * 6.28 + u_time * 3.0) * 0.1 * a;
  vec2 distorted = uv + vec2(shift, line * 0.05 * a);
  return prev(clamp(distorted, 0.0, 1.0));
}`,
  },

  {
    name: "Wave Spiral", id: "WSP",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float wave = sin(angle * 5.0 + u_time * 3.0 - r * 30.0) * 0.1 * a;
  vec2 warped = center + (p + vec2(cos(angle), sin(angle)) * wave) * (1.0 + r * a * 0.5);
  return prev(clamp(warped, 0.0, 1.0));
}`,
  },

  // ── NTSC / Analog Effects ───────────────────────────────────────────────────

  {
    name: "NTSC Chroma", id: "NTC",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  // NTSC-style chroma subsampling (lower chroma resolution)
  float chroma_scale = mix(1.0, 4.0, a);
  vec2 chroma_uv = floor(uv * chroma_scale) / chroma_scale;

  // Sample RGB at different positions
  vec3 c = prev(uv);
  vec3 chroma = prev(chroma_uv);

  // Blend based on amount
  vec3 result = mix(c, vec3(c.r, chroma.g, chroma.b), a);

  return result;
}`,
  },

  {
    name: "Composite Video", id: "CPV",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;

  // Simulate composite video artifacts
  float freq = 3.579545 / 30.0; // NTSC subcarrier frequency
  float phase = sin(uv.x * 100.0 + u_time * freq) * 0.5 + 0.5;

  // Y (luminance)
  vec3 c = prev(uv);
  float luma = dot(c, vec3(0.299, 0.587, 0.114));

  // U,V (chrominance) with phase distortion
  vec3 chroma = prev(uv + vec2(sin(phase) * 0.01, 0.0));
  float u = chroma.r - luma;
  float v = chroma.b - luma;

  // Reconstruct with artifacts
  vec3 result = vec3(
    luma + 1.13983 * v,
    luma - 0.39465 * u - 0.58060 * v,
    luma + 2.03211 * u
  );

  return mix(c, clamp(result, 0.0, 1.0), a);
}`,
  },

  {
    name: "Analog Ghosting", id: "AGH",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;

  // Multi-frame ghosting effect (CRT phosphor persistence)
  vec3 c0 = prev(uv);
  vec3 c1 = fb(uv + vec2(0.002, 0.001));
  vec3 c2 = fb(uv + vec2(0.004, 0.002));

  // Time-varying blend for analog feel
  float t_phase = mod(u_time * 60.0, 3.0) / 3.0;
  float blend = 0.5 + 0.5 * sin(t_phase * 3.14159);

  vec3 ghost = mix(c1, c2, blend) * (0.4 + a * 0.4);
  return mix(c0, c0 + ghost, a);
}`,
  },

  {
    name: "Color Bleed", id: "CBL",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float bleed_amount = a * 0.05;

  // Red channel bleeds right
  float r = prev(uv - vec2(bleed_amount, 0.0)).r;
  // Blue channel bleeds left
  float b = prev(uv + vec2(bleed_amount, 0.0)).b;
  // Green stays centered
  float g = prev(uv).g;

  // Vertical fringing (common in analog video)
  float fringe = sin(uv.y * 30.0) * 0.5 + 0.5;
  g *= 0.95 + 0.05 * fringe;

  return vec3(r, g, b);
}`,
  },

  {
    name: "Luma Separation", id: "LUM",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;

  // Split into luminance and chrominance
  vec3 c = prev(uv);
  float luma = dot(c, vec3(0.299, 0.587, 0.114));

  // Offset chroma by a few lines (like old video tape artifacts)
  float offset = sin(u_time * 2.0) * 0.01 * a;
  vec3 chroma = prev(uv + vec2(0.0, offset));

  // Re-composite with exaggerated chroma
  vec3 result = vec3(
    luma + (chroma.r - luma) * (1.0 + a),
    luma,
    luma + (chroma.b - luma) * (1.0 + a)
  );

  return mix(c, clamp(result, 0.0, 1.0), a);
}`,
  },

  {
    name: "RF Noise", id: "RFN",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;

  // Radio frequency interference pattern
  float freq_h = sin(uv.x * 50.0 + u_time * 3.0) * 0.5 + 0.5;
  float freq_v = sin(uv.y * 30.0 + u_time * 2.0) * 0.5 + 0.5;
  float interference = freq_h * freq_v;

  // Add analog noise
  float noise = hash(uv * u_resolution + u_time);
  float rf_noise = mix(interference, noise, 0.5) * a;

  vec3 c = prev(uv);
  return c + vec3(rf_noise * 0.1) - vec3(rf_noise * 0.05, rf_noise * 0.02, 0.0);
}`,
  },

  // ── Minimalistic Geometric Effects ───────────────────────────────────────

  {
    name: "Orbit Ring Lines", id: "ORL",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time * 0.5;
  vec2 p = uv - 0.5;
  float r = length(p);
  float angle = atan(p.y, p.x) + t;
  float rings = sin(r * 30.0 - t * 3.0) * 0.5 + 0.5;
  float ring_line = smoothstep(0.015, 0.0, abs(mod(r, 0.15) - 0.075));
  float spokes = sin(angle * 8.0) * 0.5 + 0.5;
  float spoke_line = smoothstep(0.01, 0.0, abs(sin(angle * 8.0)));
  float pattern = (ring_line + spoke_line * 0.5) * (rings * 0.6 + 0.4);
  vec3 c = prev(uv);
  return mix(c, c + vec3(0.2, 0.5, 0.9) * pattern, a * 0.4);
}`,
  },

  {
    name: "Orbit Nodes Connect", id: "ONC",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  vec3 col = prev(uv);
  for(float i = 0.0; i < 4.0; i++) {
    float orbit_r = 0.1 + i * 0.15;
    float nodes = 6.0 + i * 2.0;
    for(float j = 0.0; j < nodes; j++) {
      float angle = (t * (1.0 - i * 0.1)) + (j / nodes) * 6.28;
      vec2 node_pos = vec2(cos(angle), sin(angle)) * orbit_r;
      float d = length(p - node_pos);
      float node = exp(-d * d * 80.0) * (0.3 + 0.7 * (1.0 - i / 4.0));
      col += mix(vec3(0.2, 0.6, 1.0), vec3(0.8, 0.3, 0.6), i / 4.0) * node;
    }
    float orbit_d = abs(length(p) - orbit_r);
    float orbit_line = smoothstep(0.008, 0.0, orbit_d);
    col += vec3(0.1, 0.3, 0.6) * orbit_line * (0.3 + 0.7 * (1.0 - i / 4.0));
  }
  return mix(prev(uv), col, a * 0.5);
}`,
  },

  {
    name: "Orbit Spiral", id: "OSP",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float spiral_angle = angle - t * 0.5 + r * 4.0;
  float spiral = sin(spiral_angle * 3.0) * 0.5 + 0.5;
  float node_pulse = exp(-(r - 0.25 - spiral * 0.1) * (r - 0.25 - spiral * 0.1) * 30.0);
  float spiral_ring = smoothstep(0.008, 0.0, abs(mod(angle - t * 0.5 + r * 4.0, 1.0) - 0.5));
  vec3 col = prev(uv);
  col += vec3(0.3, 0.7, 1.0) * node_pulse * 0.6;
  col += vec3(0.2, 0.5, 0.8) * spiral_ring * 0.4;
  return mix(prev(uv), col, a * 0.4);
}`,
  },

  {
    name: "Pulsing Orbits", id: "POR",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  float r = length(p);
  vec3 col = vec3(0.0);
  for(float i = 1.0; i < 5.0; i++) {
    float pulse = sin(t * 2.0 + i) * 0.5 + 0.5;
    float orbit_r = i * 0.15;
    float ring = smoothstep(0.025 * pulse, 0.005 * pulse, abs(r - orbit_r));
    col += vec3(0.2 + i * 0.1, 0.5, 0.9 - i * 0.1) * ring * pulse;
  }
  float center = exp(-r * r * 50.0);
  col += vec3(1.0, 0.4, 0.2) * center;
  return mix(prev(uv), col, a * 0.5);
}`,
  },

  {
    name: "Network Pulse", id: "NPL",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  vec3 col = vec3(0.0);
  float node_count = 8.0;
  for(float layer = 0.0; layer < 3.0; layer++) {
    float orbit_r = 0.08 + layer * 0.12;
    float pulse = sin(t * 1.5 + layer) * 0.5 + 0.5;
    for(float i = 0.0; i < node_count; i++) {
      float angle = (i / node_count) * 6.28 + t * (1.0 - layer * 0.1);
      vec2 node_pos = vec2(cos(angle), sin(angle)) * orbit_r;
      float d = length(p - node_pos);
      float node = exp(-d * d * 100.0) * pulse;
      col += mix(vec3(0.2, 0.8, 0.6), vec3(0.8, 0.3, 0.9), layer / 3.0) * node * 0.7;
    }
    float orbit_line = smoothstep(0.01, 0.0, abs(length(p) - orbit_r));
    col += vec3(0.4, 0.6, 1.0) * orbit_line * pulse * 0.4;
  }
  return mix(prev(uv), prev(uv) + col, a * 0.4);
}`,
  },

  {
    name: "Orbital Nodes", id: "ORN",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  vec3 col = prev(uv);
  float orbit_count = 4.0;
  float nodes_per_orbit = 6.0;
  for(float orbit_idx = 0.0; orbit_idx < orbit_count; orbit_idx++) {
    float orbit_r = 0.06 + orbit_idx * 0.1;
    for(float node_idx = 0.0; node_idx < nodes_per_orbit; node_idx++) {
      float angle = (node_idx / nodes_per_orbit) * 6.28 + t * 0.8;
      float radius_modulation = sin(t + orbit_idx + node_idx) * 0.02;
      vec2 node_pos = vec2(cos(angle), sin(angle)) * (orbit_r + radius_modulation);
      float d = length(p - node_pos);
      float brightness = sin(t + node_idx * 2.0 + orbit_idx) * 0.5 + 0.5;
      float node = exp(-d * d * 120.0) * brightness;
      vec3 hue = vec3(
        0.5 + 0.5 * cos(orbit_idx * 2.0),
        0.5 + 0.5 * sin(orbit_idx),
        0.5 + 0.5 * cos(orbit_idx + node_idx)
      );
      col += hue * node * 0.6;
    }
  }
  return mix(prev(uv), col, a * 0.35);
}`,
  },

  {
    name: "Wave Rings", id: "WRN",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  float r = length(p);
  float angle = atan(p.y, p.x);
  vec3 col = prev(uv);
  for(float i = 0.0; i < 5.0; i++) {
    float ring_r = i * 0.1 + 0.05;
    float wave = sin(angle * 5.0 + t * 2.0 + i) * 0.5 + 0.5;
    float ring_width = 0.02 * (1.0 + wave * 0.5);
    float ring = smoothstep(ring_width, ring_width * 0.5, abs(r - ring_r));
    vec3 ring_col = vec3(
      0.3 + 0.4 * cos(i * 0.8 + t),
      0.5 + 0.3 * sin(i * 1.2 + t * 0.7),
      0.8 + 0.2 * cos(i * 0.5 + t * 1.3)
    );
    col += ring_col * ring * (0.5 + 0.5 * wave);
  }
  return mix(prev(uv), col, a * 0.45);
}`,
  },

  {
    name: "BW Orbital Ring", id: "BWR",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  float r = length(p);
  vec3 col = prev(uv);

  // Monochrome orbital rings
  for(float i = 1.0; i < 5.0; i++) {
    float orbit_r = i * 0.12;
    float pulse = 0.5 + 0.5 * sin(t * 1.5 + i * 0.8);
    float ring = smoothstep(0.02 * pulse, 0.005 * pulse, abs(r - orbit_r));
    col += vec3(ring * (0.4 + 0.6 * pulse) * a);
  }

  // Center pulse
  float center = exp(-r * r * 80.0) * (0.3 + 0.4 * sin(t * 2.0));
  col += vec3(center * a);

  return mix(prev(uv), col, a * 0.3);
}`,
  },

  {
    name: "BW Grid Lines", id: "BWG",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  vec3 col = prev(uv);

  // Monochrome grid with rotation
  float angle = atan(p.y, p.x) + t * 0.3;
  float r = length(p);

  // Radial lines
  for(float i = 0.0; i < 8.0; i++) {
    float line_angle = i * 0.785; // 8 lines
    float angle_diff = mod(angle - line_angle + 3.14159, 6.28) - 3.14159;
    float line_width = 0.01 * (1.0 + 0.5 * sin(t * 2.0 + i));
    float line = smoothstep(line_width, 0.0, abs(angle_diff) * r);
    col += vec3(line * a * (0.5 + 0.5 * cos(t + i)));
  }

  // Concentric circles
  for(float i = 1.0; i < 6.0; i++) {
    float circle_r = i * 0.15;
    float circle = smoothstep(0.008, 0.001, abs(r - circle_r));
    col += vec3(circle * a * (0.4 + 0.3 * sin(t * 1.5 + i)));
  }

  return mix(prev(uv), col, a * 0.25);
}`,
  },

  {
    name: "Starfield BW", id: "SBW",
    body: /* glsl */ `
vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  float r = length(p);
  vec3 col = prev(uv);

  // Monochrome starfield orbiting the center
  float star_count = 20.0;
  for(float i = 0.0; i < star_count; i++) {
    // Star position on orbit
    float angle = (i / star_count) * 6.28 + t * (0.5 + 0.3 * sin(i));
    float orbit_r = 0.15 + 0.1 * sin(i * 0.7 + t * 0.3);
    vec2 star_pos = vec2(cos(angle), sin(angle)) * orbit_r;

    // Star brightness
    float brightness = 0.5 + 0.5 * sin(t * 2.0 + i * 1.3);

    // Render star
    float d = length(p - star_pos);
    float star = exp(-d * d * 150.0) * brightness;

    col += vec3(star * a * (0.6 + 0.4 * brightness));
  }

  // Center pulse
  float center = 0.3 * (1.0 + sin(t * 3.0)) * exp(-r * r * 120.0);
  col += vec3(center * a);

  return mix(prev(uv), col, a * 0.35);
}`,
  },

];
