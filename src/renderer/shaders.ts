/**
 * Shaders intégrés. Chacun fournit une fonction GLSL ES 3.00 :
 *   vec3 render(vec2 uv, vec2 res)
 * Le moteur (gl.ts) ajoute l'en-tête (uniforms) et le main().
 *
 * Uniforms disponibles : u_time, u_resolution, u_bass, u_mid, u_treble, u_level (0..1).
 * u_p0..u_p3 sont des uniforms GLSL flottants.
 * "holdMs" est un paramètre JS uniquement (contrôle tactics.holdMs, pas un uniform GLSL).
 */

export interface ShaderParam {
  label: string;
  key: "u_p0" | "u_p1" | "u_p2" | "u_p3" | "holdMs";
  min: number; max: number; default: number; step?: number;
}
export interface Shader {
  name: string;
  src: string;
  params?: ShaderParam[];
}

export const SHADERS: Shader[] = [
  {
    name: "RECTA (texte)",
    params: [
      { label: "Durée texte", key: "holdMs", min: 1000, max: 15000, default: 8000, step: 500 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  // tranches horizontales décalées (déchirure du signal)
  float row = floor(uv.y * 34.0);
  float tear = step(0.82 - u_level * 0.4, hash(vec2(row, floor(t * 9.0))));
  float sh = tear * (hash(vec2(floor(t * 9.0), row)) - 0.5) * (0.18 + u_level * 0.3);
  vec2 suv = vec2(uv.x + sh, uv.y);
  // décalage chromatique
  float s = 0.004 + u_level * 0.02 + u_bass * 0.03;
  float r = textCol(suv + vec2(s, 0.0)).g;
  float g = textCol(suv).g;
  float b = textCol(suv - vec2(s, 0.0)).g;
  vec3 col = vec3(r, g, b) * vec3(0.45, 1.0, 0.55); // phosphore vert
  // dropouts + bruit
  col *= 0.55 + 0.45 * step(0.5, hash(vec2(uv.y * 130.0, floor(t * 24.0))));
  col += (hash(uv * res + t) - 0.5) * 0.12;
  // scanlines + flicker
  col *= 0.75 + 0.25 * sin(uv.y * res.y * 1.6);
  col *= 0.9 + 0.1 * sin(t * 50.0);
  return max(col, 0.0);
}`,
  },
  {
    name: "Plasma indus",
    params: [
      { label: "Échelle",  key: "u_p0", min: 1, max: 15, default: 6, step: 0.5 },
      { label: "Vitesse",  key: "u_p1", min: 0, max: 1,  default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2  p    = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float sc   = u_p0;                      // échelle (défaut 6)
  float t    = u_time * u_p1;            // vitesse (défaut 0.3)
  float warp = 0.6 + u_bass * 1.6;
  float v = sin(p.x * sc * warp + t)
          + sin(p.y * sc - t * 1.3)
          + sin((p.x + p.y) * (sc * 0.83) + t * 0.7);
  v += sin(length(p) * (sc * 1.67) - t * 2.0) * (0.5 + u_mid);
  float g   = 0.5 + 0.5 * sin(v + t);
  vec3  col = mix(vec3(0.02, 0.05, 0.07), vec3(0.9, 0.45, 0.10), g);
  col += u_treble * 0.3 * hash(uv * res + t);
  return col * (0.55 + u_level * 0.9);
}`,
  },
  {
    name: "Tunnel",
    params: [
      { label: "Vitesse", key: "u_p0", min: 0, max: 1, default: 0.35, step: 0.01 },
      { label: "Rayons",  key: "u_p1", min: 2, max: 20, default: 8,   step: 1    },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float speed = mix(0.2, 3.0, u_p0) + u_level * 1.5;
  float z = 0.2 / max(r, 1e-3) + u_time * speed;
  float rings = 0.5 + 0.5 * sin(z * mix(4.0, 20.0, u_p1) + u_bass * 6.0);
  float spokes = 0.5 + 0.5 * sin(a * 12.0 + u_time);
  float m = rings * spokes;
  vec3 col = mix(vec3(0.01), vec3(0.10, 0.70, 0.90), m); // sombre -> cyan
  col *= smoothstep(0.0, 0.18, r);                        // centre noir
  col += vec3(0.9, 0.3, 0.05) * pow(m, 4.0) * (0.5 + u_treble); // pointes chaudes
  return col;
}`,
  },
  {
    name: "FFT bars",
    params: [
      { label: "Barres", key: "u_p0", min: 16,    max: 128,  default: 96,    step: 1     },
      { label: "Crête",  key: "u_p1", min: 0.003, max: 0.04, default: 0.012, step: 0.001 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float v = fftAt(uv.x);                          // hauteur de la barre (0..1)
  float bar = step(uv.y, v);                       // rempli sous la valeur
  vec3 col = mix(vec3(0.0, 0.04, 0.03), vec3(0.10, 0.90, 0.40), bar);
  col += vec3(0.9, 0.3, 0.05) * smoothstep(u_p1, 0.0, abs(uv.y - v)); // crête chaude
  // séparation des barres
  col *= 0.4 + 0.6 * step(0.12, fract(uv.x * u_p0));
  return col;
}`,
  },
  {
    name: "Waveform",
    params: [
      { label: "Épaisseur", key: "u_p0", min: 0, max: 1, default: 0.3, step: 0.01 },
      { label: "Halo",      key: "u_p1", min: 0, max: 1, default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float w = waveAt(uv.x);                          // 0..1, 0.5 = zéro
  float d = abs(uv.y - w);
  float line = smoothstep(mix(0.004, 0.06, u_p0), 0.0, d);
  vec3 col = vec3(0.0, 0.02, 0.04) + vec3(0.10, 0.70, 0.90) * line;
  col += vec3(0.10, 0.70, 0.90) * 0.15 * smoothstep(mix(0.02, 0.4, u_p1), 0.0, d); // halo
  return col;
}`,
  },
  {
    name: "Matrix rain",
    params: [
      { label: "Colonnes", key: "u_p0", min: 20, max: 90, default: 56, step: 1 },
      { label: "Vitesse",  key: "u_p1", min: 0,  max: 1,  default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t     = u_time;
  float speed = mix(0.3, 3.5, u_p1) + u_bass * 2.0;

  float cols = u_p0;
  float col  = floor(uv.x * cols);
  float cx   = fract(uv.x * cols);
  float seed  = hash(vec2(col, 1.0));
  float seed2 = hash(vec2(col, 2.0));

  // cycle de chute par colonne
  float period = 3.0 + seed * 5.0;
  float cycle  = mod(t * speed * 0.18 + seed2 * period, period);
  float headY  = cycle / period;             // 0 = haut, 1 = bas

  // traîne au-dessus de la tête
  float dy       = uv.y - headY;
  float trailLen = 0.2 + seed * 0.15;
  float fade = step(-trailLen, dy) * step(dy, 0.0) * (1.0 + dy / trailLen);
  // wrap-around début de cycle
  float dyW  = uv.y - (headY - 1.0);
  float fadeW = step(-trailLen, dyW) * step(dyW, 0.0) * (1.0 + dyW / trailLen);
  fade = max(fade, fadeW);

  // tête lumineuse
  float headGlow = smoothstep(0.025, 0.0, abs(dy)) + smoothstep(0.025, 0.0, abs(dyW));

  // scintillement (simule les caractères)
  float row    = floor(uv.y * 28.0);
  float flick  = step(0.25, hash(vec2(col + floor(t * 14.0), row)));

  // masques colonne
  float gapMask  = smoothstep(0.0, 0.08, cx) * smoothstep(1.0, 0.92, cx);
  float charBody = smoothstep(0.04, 0.16, cx) * smoothstep(0.96, 0.84, cx);

  float bright = (fade * flick + headGlow) * gapMask * charBody;
  bright *= 0.6 + u_level * 0.8;

  vec3 col3 = mix(vec3(0.05, 0.85, 0.30), vec3(0.75, 1.0, 0.85), headGlow * gapMask);
  return col3 * bright;
}`,
  },
  {
    name: "Scan grid",
    params: [
      { label: "Densité", key: "u_p0", min: 4,  max: 50, default: 18,  step: 1    },
      { label: "Vitesse", key: "u_p1", min: 0,  max: 1,  default: 0.4, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(res.x / res.y, 1.0);
  float scale = u_p0;
  vec2 g = fract(p * scale);
  float line = 1.0 - smoothstep(0.0, 0.04, g.x) * smoothstep(0.0, 0.04, g.y);
  float scan = 0.5 + 0.5 * sin(uv.y * res.y * 0.7 - u_time * mix(2.0, 20.0, u_p1));
  float pulse = 0.3 + u_mid * 1.0;
  vec3 base = vec3(0.0, 0.03, 0.02);
  vec3 grid = vec3(0.1, 0.9, 0.4) * line * pulse * (0.6 + 0.4 * scan); // grille verte
  grid += vec3(0.9) * line * u_bass * 0.5;                            // flash sur le kick
  return base + grid;
}`,
  },
  // ── Batch 5 ───────────────────────────────────────────────────────────────

  {
    name: "Terrain (Joy Division)",
    params: [
      { label: "Lignes",    key: "u_p0", min: 0,   max: 1,   default: 0.55, step: 0.01 },
      { label: "Amplitude", key: "u_p1", min: 0,   max: 1,   default: 0.55, step: 0.01 },
      { label: "Texture",   key: "u_p2", min: 0,   max: 1,   default: 0.35, step: 0.01 },
    ],
    src: /* glsl */ `
float jd_n(vec2 p) {
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float jd_sig(float x, float k, float t, float scX) {
  vec2 p = vec2(x*scX+t*0.05, k*0.38);
  // Multi-octave noise for radio-signal character
  float h = jd_n(p)*0.55 + jd_n(p*2.05+vec2(1.7,9.2))*0.30 + jd_n(p*4.3-vec2(5.3,1.7))*0.15;
  // Add a periodic "pulse" component (like actual pulsar signal)
  h += sin(x*8.0*scX + k*0.5 + t*0.03) * 0.08;
  return h;
}
vec3 render(vec2 uv, vec2 res) {
  float t   = u_time;
  float N   = mix(45.0, 90.0, u_p0);          // nombre de lignes
  float amp = mix(0.02, 0.18, u_p1);           // amplitude max
  float scX = mix(1.2,  7.0,  u_p2);           // texture horizontale
  float y   = uv.y;
  float minR = 2.0;
  vec3 result = vec3(0.0);
  // Parcours front-to-back (band 0 = bas = premier plan)
  for (int k = 90; k >= 0; k--) {
    if (float(k) >= N) continue;
    float fk    = float(k);
    float baseY = (fk + 0.5) / N;              // espacement REGULIER
    // Enveloppe gaussienne : cretes plus hautes au centre (comme Unknown Pleasures)
    float center = abs(baseY - 0.5) * 2.4;
    float env    = exp(-center * center * 1.8) * (0.25 + 0.75 * smoothstep(0.9, 0.1, abs(baseY-0.5)*2.0));
    float a      = amp * env * (1.0 + u_bass * 0.7);
    float h      = jd_sig(uv.x, fk, t, scX) * a;
    h += waveAt(uv.x) * a * 0.22 * u_level;
    float ridgeY = baseY - h;                   // crete monte au-dessus de baseY
    if (ridgeY < minR) {
      float dy    = abs(y - ridgeY);
      float thick = 0.006 + amp * 0.04;
      if (dy < thick) {
        float br = 1.0 - dy / thick;
        result = vec3(0.94, 0.97, 1.0) * br * br;
      }
      minR = ridgeY;
    }
    if (y > minR + 0.012) break;
  }
  return result;
}`,
  },
  {
    name: "Laser scan",
    params: [
      { label: "Vitesse",  key: "u_p0", min: 0, max: 1, default: 0.25, step: 0.01 },
      { label: "Largeur",  key: "u_p1", min: 0, max: 1, default: 0.5,  step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t  = u_time;
  float sp = mix(0.15, 2.0, u_p0) + u_bass * 0.5;
  // triangle wave : aller-retour
  float sc = fract(t * sp * 0.5) * 2.0;
  float scanX = sc > 1.0 ? 2.0 - sc : sc;
  float dx = abs(uv.x - scanX);
  float beamW = mix(40.0, 200.0, u_p1);
  float beam  = exp(-dx * beamW) * (0.9 + u_level * 0.2);
  float trail = exp(-dx * 20.0) * 0.22;
  // FFT révélée sous le laser
  float fft = fftAt(uv.x);
  float bar = step(1.0 - uv.y * 0.85, fft) * exp(-dx * 50.0);
  // Waveform tracée par le laser
  float wline = exp(-length(vec2(uv.x - scanX, uv.y - (waveAt(scanX)*0.75+0.12))) * 50.0);
  vec3 col = vec3(0.0);
  col += vec3(1.0, 0.12, 0.02) * (beam + trail) * (0.5 + u_level * 0.6);
  col += vec3(1.0, 0.5,  0.1 ) * bar;
  col += vec3(0.9, 0.4,  0.0 ) * wline * 0.5;
  return col;
}`,
  },
  {
    name: "Laser write",
    params: [
      { label: "Durée texte",  key: "holdMs", min: 1000, max: 15000, default: 8000, step: 500  },
      { label: "Vitesse laser", key: "u_p0", min: 0,    max: 1,     default: 0.4,  step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t   = u_time;
  float sp  = mix(0.5, 4.0, u_p0) + u_bass * 1.5;
  // Laser qui parcourt l'ecran en zigzag et grave le texte RECTA
  float row  = floor(uv.y * 12.0);
  float dir  = mod(row, 2.0) < 1.0 ? 1.0 : -1.0;
  float scanX = fract(t * sp * 0.04 + row * 0.083) ;
  if (dir < 0.0) scanX = 1.0 - scanX;
  float scanY = (row + 0.5) / 12.0;

  // Texte RECTA (texture u_text)
  float txt = textCol(uv).g;

  // Faisceau laser
  vec2 scan = vec2(scanX, scanY);
  float d   = length(uv - scan);
  float r   = 0.025 + u_level * 0.015;
  float beam = exp(-d * d / (r * r)) * (0.8 + u_level * 0.3);

  // La ou le laser passe sur du texte : surbrillance intense
  float burn = txt * exp(-d * 45.0) * 4.0;

  // Residu : texte deja grave (phosphorescence)
  float residue = txt * 0.55 * (0.4 + u_level * 0.4);

  vec3 col = vec3(0.8, 0.08, 0.01) * residue;
  col += vec3(1.0, 0.55, 0.08) * beam;
  col += vec3(1.0, 0.9,  0.4 ) * burn;
  return col;
}`,
  },
  // ── Batch 4 ───────────────────────────────────────────────────────────────

  {
    name: "Topographie",
    params: [
      { label: "Isolignes", key: "u_p0", min: 3,  max: 24, default: 8,   step: 1    },
      { label: "Vitesse",   key: "u_p1", min: 0,  max: 1,  default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
float tp_n(vec2 p) {
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float tp_h(vec2 p) {
  float h=0.0,a=0.5;
  for(int i=0;i<4;i++){h+=a*tp_n(p);p*=2.1;a*=0.5;}
  return h;
}
vec3 render(vec2 uv, vec2 res) {
  vec2  p = uv * vec2(res.x/res.y,1.0) * 3.0 + u_time * mix(0.01, 0.3, u_p1);
  float h = tp_h(p + u_bass * 0.4);
  float n = u_p0 + u_mid * 3.0;
  float c = fract(h * n);
  float line = smoothstep(0.06, 0.0, min(c, 1.0-c));
  vec3 col = mix(vec3(0.0,0.05,0.12), vec3(0.0,0.18,0.08), smoothstep(0.2,0.6,h));
  col = mix(col, vec3(0.22,0.32,0.08), smoothstep(0.6,1.0,h));
  col += vec3(0.55, 0.85, 0.35) * line * (0.5+u_level*0.7);
  col += vec3(0.8,  1.0,  0.5)  * line * line * u_bass;
  return col;
}`,
  },
  {
    name: "Éclairs",
    params: [
      { label: "Éclairs",   key: "u_p0", min: 1, max: 5,  default: 3, step: 1 },
      { label: "Fréquence", key: "u_p1", min: 4, max: 20, default: 9, step: 1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = floor(u_time * u_p1);
  float bright = 0.0;
  for (int b = 0; b < 5; b++) {
    if (float(b) >= u_p0) break;
    float fb  = float(b);
    float bx  = 0.2 + hash(vec2(fb, floor(u_time*0.5+fb))) * 0.6;
    float x   = bx;
    for (int i = 0; i < 16; i++) {
      float fi = float(i);
      float y0 = fi / 16.0, y1 = (fi+1.0) / 16.0;
      float xn = x + (hash(vec2(fi+fb*100.0, t+fb)) - 0.5) * 0.09;
      float inS = step(y0,uv.y)*step(uv.y,y1);
      float lx  = mix(x, xn, (uv.y-y0)/max(y1-y0,1e-4));
      float d   = abs(uv.x - lx) * inS + (1.0-inS) * 1.0;
      bright += 0.0018 / max(d,0.0001) * inS * (1.0+u_bass*0.6);
      // ramification
      float bSeed = hash(vec2(fi+fb*100.0+50.0, t));
      if (bSeed > 0.72) {
        float bxe = lx + (hash(vec2(fi+200.0,t+fb))-0.5)*0.12;
        float blx = mix(lx, bxe, clamp((uv.y-y0)/(y1*0.5-y0+1e-4),0.0,1.0));
        float bd  = abs(uv.x - blx) * inS;
        bright += 0.0009 / max(bd,0.0001) * inS * 0.6;
      }
      x = xn;
    }
  }
  bright *= 0.6 + hash(vec2(floor(u_time*14.0),0.0))*0.4;
  vec3 col = mix(vec3(0.5,0.65,1.0), vec3(1.0,1.0,1.0), min(bright*0.5,1.0));
  return col * min(bright, 2.5);
}`,
  },
  {
    name: "Marbre",
    params: [
      { label: "Échelle", key: "u_p0", min: 0.5, max: 8, default: 3,   step: 0.1  },
      { label: "Vitesse", key: "u_p1", min: 0,   max: 1, default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
float mb_n(vec2 p) {
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
vec3 render(vec2 uv, vec2 res) {
  vec2  p = uv * vec2(res.x/res.y,1.0) * u_p0;
  float t = u_time * mix(0.05, 0.6, u_p1);
  float turb=0.0, a=1.0; vec2 q=p+t;
  for(int i=0;i<4;i++){turb+=a*mb_n(q);q=q*2.0+vec2(1.7,9.2);a*=0.5;}
  float v = sin((p.x+p.y)*u_p0 + turb*4.0*(1.0+u_bass) + t)*0.5+0.5;
  vec3 col = mix(vec3(0.02,0.02,0.04), vec3(0.05,0.6,0.88), pow(v,2.0));
  col = mix(col, vec3(0.9,0.4,0.04), pow(v,8.0)*(0.4+u_mid*0.8));
  col = mix(col, vec3(1.0,0.95,0.8), pow(v,18.0)*u_level);
  return col*(0.6+u_level*0.5);
}`,
  },
  // ── Batch 3 ───────────────────────────────────────────────────────────────

  {
    name: "Lissajous",
    params: [
      { label: "Échelle",   key: "u_p0", min: 0, max: 1, default: 0.5, step: 0.01 },
      { label: "Épaisseur", key: "u_p1", min: 0, max: 1, default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0) * 2.1;
  float scale = mix(0.4, 1.8, u_p0) + u_level * 0.3;
  // XY scope : deux demi-waveforms en X et Y
  float wx = (waveAt(uv.x * 0.5) * 2.0 - 1.0) * scale;
  float wy = (waveAt(uv.y * 0.5 + 0.5) * 2.0 - 1.0) * scale;
  float thick = mix(0.008, 0.04, u_p1);
  float dx = abs(p.y - wx), dy = abs(p.x - wy);
  float lx = smoothstep(thick, 0.0, dx) + exp(-dx * 38.0) * 0.45;
  float ly = smoothstep(thick, 0.0, dy) + exp(-dy * 38.0) * 0.45;
  float cross = lx * ly;
  vec3 col = vec3(0.0, 0.62, 0.28) * max(lx, ly) * (0.4 + u_level * 0.8);
  col += vec3(1.0, 1.0, 0.45) * cross * 5.0;
  return col;
}`,
  },
  {
    name: "Aurora",
    params: [
      { label: "Hauteur", key: "u_p0", min: 0.1, max: 0.9, default: 0.44, step: 0.01 },
      { label: "Vitesse", key: "u_p1", min: 0,   max: 1,   default: 0.35, step: 0.01 },
    ],
    src: /* glsl */ `
float aur_n(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * mix(0.08, 0.7, u_p1);
  float w1 = aur_n(vec2(uv.x * 3.0 + t,        t * 0.5 )) * 0.50;
  float w2 = aur_n(vec2(uv.x * 6.0 - t * 0.7,  t * 0.3 )) * 0.25;
  float curtain = u_p0 + w1 + w2 + u_bass * 0.14;
  float d = abs(uv.y - curtain);
  float band = exp(-d *  7.5) * (0.45 + u_level * 0.7);
  float thin = exp(-d * 22.0) * 0.65;
  float hue = uv.x * 0.35 + t * 0.12 + aur_n(vec2(uv.x * 2.0, t * 0.18)) * 0.5;
  vec3 ac = mix(vec3(0.0, 0.9, 0.4), vec3(0.0, 0.3, 0.9), sin(hue*TWO_PI)*0.5+0.5);
  ac = mix(ac, vec3(0.9, 0.08, 0.55), aur_n(vec2(uv.x * 4.0, t * 0.35)) * u_mid);
  vec3 sky = mix(vec3(0.0, 0.0, 0.03), vec3(0.0, 0.02, 0.06), uv.y);
  vec3 col = sky + ac * (band + thin);
  float star = step(0.997 - u_treble * 0.004, hash(floor(uv * res * 0.5)));
  return col + vec3(star * (0.6 + w1 * 0.4));
}`,
  },
  {
    name: "Spirale",
    params: [
      { label: "Tours",   key: "u_p0", min: 1, max: 20, default: 6,   step: 0.5  },
      { label: "Vitesse", key: "u_p1", min: 0, max: 1,  default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = u_time;
  float turns = u_p0 + u_mid * 2.0;
  float sv = r * turns - (a + PI) / TWO_PI + t * (mix(0.1, 1.5, u_p1) + u_bass * 0.5);
  float d  = abs(fract(sv) - 0.5);
  float thick = 0.07 + fftAt(r) * 0.22;
  float arm  = smoothstep(thick, 0.0, d);
  float glow = exp(-d * 11.0) * 0.4;
  float hue  = fract(a / TWO_PI + t * 0.08);
  vec3 col = mix(vec3(0.9, 0.3, 0.05), vec3(0.05, 0.75, 0.9), hue);
  return col * (arm + glow) * (0.5 + u_level * 0.7);
}`,
  },
  {
    name: "Circuit",
    params: [
      { label: "Échelle", key: "u_p0", min: 3,  max: 24, default: 8,    step: 0.5  },
      { label: "Vitesse", key: "u_p1", min: 0,  max: 1,  default: 0.35, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float scale = u_p0 + u_mid * 3.0;
  vec2 p  = uv * vec2(res.x/res.y, 1.0) * scale;
  float t = u_time;
  vec2 id = floor(p), fr = fract(p) - 0.5;
  float sd  = hash(id), sd2 = hash(id + vec2(31.7, 17.3));
  float hz = step(0.5, sd), vt = 1.0 - hz;
  float lineH = smoothstep(0.04,0.0,abs(fr.y)) * step(abs(fr.x),0.49) * hz;
  float lineV = smoothstep(0.04,0.0,abs(fr.x)) * step(abs(fr.y),0.49) * vt;
  float via   = smoothstep(0.12, 0.06, length(fr));
  float speed = mix(0.5, 4.0, u_p1) + u_bass * 1.5;
  float posH  = fract(id.x * 0.37 + t * speed * sign(sd  - 0.5));
  float posV  = fract(id.y * 0.37 + t * speed * sign(sd2 - 0.5));
  float sigH  = smoothstep(0.18,0.0,abs(fr.x-(posH-0.5))) * step(abs(fr.y),0.04) * hz;
  float sigV  = smoothstep(0.18,0.0,abs(fr.y-(posV-0.5))) * step(abs(fr.x),0.04) * vt;
  float sig   = (sigH + sigV) * (0.8 + u_level * 0.5);
  vec3 col = vec3(0.0, 0.02, 0.01);
  col += vec3(0.0, 0.35, 0.15) * (lineH + lineV) * 0.6;
  col += vec3(0.25, 0.65, 0.2) * via * 0.8;
  col += vec3(0.4,  1.0,  0.25) * sig;
  return col;
}`,
  },
  {
    name: "Orbe",
    params: [
      { label: "Rayon",  key: "u_p0", min: 0.1, max: 0.48, default: 0.35, step: 0.01 },
      { label: "Plasma", key: "u_p1", min: 2,   max: 16,   default: 8,    step: 1    },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = u_time;
  float sphere = smoothstep(u_p0 + u_bass * 0.08, u_p0 - 0.05, r);
  vec2 sp = vec2(a / TWO_PI + 0.5, r / u_p0);
  float plasma = sin(sp.x * u_p1 + t * 2.0 + u_bass * 4.0)
               * sin(sp.y * 6.0 - t * 1.5)
               * sin((sp.x + sp.y) * 10.0 + t * 0.7);
  plasma = plasma * 0.5 + 0.5;
  float halo = exp(-r * 3.0) * 0.4 * (0.5 + u_level);
  vec3 col = mix(vec3(0.02, 0.1, 0.7), vec3(0.9, 0.3, 0.05), plasma) * sphere;
  col = mix(col, vec3(1.0, 0.9, 0.7), pow(plasma, 4.0) * sphere);
  col += vec3(0.04, 0.1, 0.5) * halo;
  return col * (0.5 + u_level * 0.7);
}`,
  },
  {
    name: "Signal",
    params: [
      { label: "Vitesse",   key: "u_p0", min: 0, max: 1, default: 0.35, step: 0.01 },
      { label: "Amplitude", key: "u_p1", min: 0, max: 1, default: 0.5,  step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  float tx = fract(uv.x + t * (mix(0.1, 1.2, u_p0) + u_level * 0.2)) - 0.5;
  float peakAmp = mix(0.4, 1.5, u_p1) + u_bass * 0.3;
  // QRS complex ECG
  float sig  = exp(-abs(tx + 0.05) * 80.0) * -0.30;
  sig += exp(-abs(tx)        * 40.0) * peakAmp;
  sig += exp(-abs(tx - 0.05) * 80.0) * -0.20;
  sig += exp(-abs(tx - 0.15) * 15.0) *  0.15;
  float wave = 0.5 + sig;
  float d    = abs(uv.y - wave);
  float line = smoothstep(0.014, 0.0, d);
  float glow = exp(-d * 50.0) * 0.5;
  float peak = exp(-abs(tx) * 40.0) * u_bass;
  float gx = smoothstep(0.005,0.0, mod(uv.x*10.0,1.0)-0.97);
  float gy = smoothstep(0.005,0.0, mod(uv.y* 8.0,1.0)-0.97);
  vec3 col  = vec3(0.0, 0.62, 0.22) * (line + glow);
  col += vec3(0.55, 1.0, 0.45) * line * peak;
  col += vec3(0.0,  0.12, 0.04) * (gx + gy);
  return col;
}`,
  },
  // ── Batch 2 ───────────────────────────────────────────────────────────────

  {
    name: "Neurones",
    params: [
      { label: "Vitesse signal", key: "u_p0", min: 0, max: 1, default: 0.4, step: 0.01 },
      { label: "Intensité",      key: "u_p1", min: 0, max: 1, default: 0.5, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float asp = res.x / res.y;
  vec2 p = uv * vec2(asp, 1.0);
  float t = u_time;
  float bright = 0.0;
  float sigSpeed = mix(1.0, 8.0, u_p0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 n1 = vec2(hash(vec2(fi, 10.0)) * asp, 0.08 + hash(vec2(fi, 20.0)) * 0.84);
    float pulse = 0.5 + 0.5 * sin(t * (0.7 + hash(vec2(fi, 30.0)) * 1.2) + fi * 0.9);
    // noeud
    bright += 0.012 / (length(p - n1) + 0.02) * pulse * (0.4 + u_level * 0.8) * (0.5 + u_p1);
    // axones vers 2 voisins
    for (int jj = 1; jj <= 2; jj++) {
      float fj = mod(fi + float(jj) * 2.0 + 1.0, 7.0);
      vec2 n2  = vec2(hash(vec2(fj, 10.0)) * asp, 0.08 + hash(vec2(fj, 20.0)) * 0.84);
      vec2 ab  = n2 - n1;
      float s  = clamp(dot(p - n1, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
      float dl = length(p - (n1 + ab * s));
      float sig = sin(t * sigSpeed - s * 9.0 + fi * 2.3) * 0.5 + 0.5;
      bright += 0.003 / (dl + 0.007) * sig * pulse * (0.25 + u_bass * 0.55) * (0.5 + u_p1);
    }
  }
  float v = min(bright, 1.5);
  return mix(vec3(0.0, 0.55, 0.25), vec3(0.5, 0.95, 0.35), smoothstep(0.0, 1.0, v * 0.7)) * v;
}`,
  },
  {
    name: "Vortex",
    params: [
      { label: "Spires",  key: "u_p0", min: 2, max: 12, default: 5,    step: 0.5  },
      { label: "Vitesse", key: "u_p1", min: 0, max: 1,  default: 0.35, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = u_time;
  float twist  = a - (1.0 / max(r, 0.05)) * 0.25 - t * (mix(0.1, 2.0, u_p1) + u_bass * 1.0);
  float spiral = sin(twist * u_p0 + r * 8.0);
  float rings  = sin(r * 22.0 - t * 2.5 + u_mid * 3.0);
  float v = (spiral * 0.6 + rings * 0.4) * 0.5 + 0.5;
  v *= smoothstep(0.0, 0.04, r); // trou noir au centre
  vec3 col = mix(vec3(0.02, 0.0, 0.06), vec3(0.05, 0.3, 0.7), v);
  col = mix(col, vec3(0.7, 0.15, 0.85), pow(v, 3.0));
  col = mix(col, vec3(0.95, 0.95, 1.0), pow(v, 8.0) * u_level);
  return col * (0.5 + u_level * 0.7);
}`,
  },
  {
    name: "Pulse",
    params: [
      { label: "Vitesse",  key: "u_p0", min: 0, max: 1,  default: 0.35, step: 0.01 },
      { label: "Anneaux",  key: "u_p1", min: 3, max: 10, default: 5,    step: 1    },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float r = length(p);
  float t = u_time;
  float bright = 0.0;
  float ringSpeed = mix(0.1, 0.8, u_p0) + u_bass * 0.3;
  int nRings = int(clamp(u_p1, 3.0, 10.0));
  for (int i = 0; i < 10; i++) {
    if (i >= nRings) break;
    float ring = mod(t * ringSpeed - float(i) * 0.22, 1.1);
    float fade = 1.0 - ring / 1.1;
    bright += smoothstep(0.025, 0.0, abs(r - ring * 0.7)) * fade * fade * 1.5;
  }
  bright += exp(-r * 9.0) * (0.3 + u_bass * 1.0);
  bright *= 0.8 + 0.2 * hash(vec2(floor(r * 60.0), floor(atan(p.y,p.x)*20.0)));
  vec3 col = vec3(0.04, 0.35, 0.75) * bright;
  col += vec3(0.95, 0.5, 0.05) * pow(bright, 3.5) * u_bass;
  return col * (0.5 + u_level * 0.7);
}`,
  },
  {
    name: "Bruit",
    params: [
      { label: "Échelle", key: "u_p0", min: 0.5, max: 5, default: 1,    step: 0.1  },
      { label: "Vitesse", key: "u_p1", min: 0,   max: 1, default: 0.35, step: 0.01 },
    ],
    src: /* glsl */ `
float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v=0.0, a=0.5;
  for (int i=0;i<5;i++){v+=a*n2(p); p=p*2.1+vec2(1.7,9.2); a*=0.5;}
  return v;
}
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(res.x/res.y, 1.0) * u_p0;
  float t = u_time * mix(0.05, 0.7, u_p1);
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2,1.3) + t * 0.85));
  float f = fbm(p + q * (1.4 + u_bass * 0.9));
  vec3 col = mix(vec3(0.01,0.0,0.02), vec3(0.45,0.05,0.01), f);
  col = mix(col, vec3(0.9,0.38,0.03), smoothstep(0.4,0.7,f));
  col = mix(col, vec3(1.0,0.88,0.6),  smoothstep(0.7,1.0,f) * (0.3+u_level*0.9));
  return col;
}`,
  },
  {
    name: "Hex",
    params: [
      { label: "Densité", key: "u_p0", min: 3,  max: 24, default: 8,   step: 0.5  },
      { label: "Vitesse", key: "u_p1", min: 0,  max: 1,  default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p  = uv * vec2(res.x/res.y, 1.0) * (u_p0 + u_mid * 4.0);
  float t = u_time;
  vec2 r = vec2(1.0, 1.732), h = r * 0.5;
  vec2 a = mod(p,   r) - h;
  vec2 b = mod(p+h, r) - h;
  vec2 gv = dot(a,a) < dot(b,b) ? a : b; // offset depuis centre hex
  vec2 id = round(p - gv);               // ID cellule
  float dEdge = 0.5 - max(abs(gv.x)*0.866025 + abs(gv.y)*0.5, abs(gv.y));
  float ch = hash(id * 0.1731);
  float pulse = (0.5 + 0.5*sin(t*(mix(0.1, 0.8, u_p1) + ch * 0.3)+ch*TWO_PI)) * (0.2+u_bass*1.0);
  float edge = smoothstep(0.0,  0.07, dEdge);
  float fill = smoothstep(0.07, 0.38, dEdge) * pulse;
  vec3 col = vec3(0.0, 0.02, 0.03);
  col += vec3(0.0, 0.55, 0.45) * edge * 0.55;
  col += vec3(0.0, 0.20, 0.50) * fill;
  col += vec3(0.9, 0.40, 0.08) * pow(fill, 3.0) * u_bass;
  return col;
}`,
  },
  // ── Batch 1 ───────────────────────────────────────────────────────────────

  {
    name: "Oscilloscope",
    params: [
      { label: "Épaisseur", key: "u_p0", min: 0, max: 1, default: 0.3, step: 0.01 },
      { label: "Grille",    key: "u_p1", min: 0, max: 1, default: 0.5, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float w  = waveAt(uv.x);
  float d  = abs(uv.y - w);
  float line  = smoothstep(mix(0.005, 0.05, u_p0), 0.0, d);
  float glow  = exp(-d * 55.0) * 0.45;
  float ghost = exp(-abs(uv.y - (1.0 - w)) * 100.0) * 0.09; // reflexion fantome
  float ity = (line + glow + ghost) * (0.4 + u_level * 0.9);
  // grille phosphore
  float gx = smoothstep(0.006, 0.0, mod(uv.x, 0.1) - 0.095) * u_p1;
  float gy = smoothstep(0.006, 0.0, mod(uv.y, 0.125) - 0.120) * u_p1;
  vec3 col = mix(vec3(0.0, 0.55, 0.2), vec3(0.75, 1.0, 0.85), line);
  return col * ity + vec3(0.0, 0.09, 0.03) * (gx + gy);
}`,
  },
  {
    name: "Cellules",
    params: [
      { label: "Densité", key: "u_p0", min: 1,  max: 15, default: 5,   step: 0.5  },
      { label: "Vitesse", key: "u_p1", min: 0,  max: 1,  default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 st  = uv * vec2(res.x / res.y, 1.0) * (u_p0 + u_bass * 3.0);
  vec2 id  = floor(st);
  vec2 fr  = fract(st);
  float t  = u_time;
  float minD = 9.0, minD2 = 9.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 nb   = vec2(i, j);
    vec2 seed = id + nb;
    float spd = mix(0.05, 0.5, u_p1) * (0.5 + hash(seed));
    float phi = hash(seed + 7.1) * TWO_PI;
    vec2 anim = vec2(sin(t * spd + phi), cos(t * spd * 0.85 + phi + 1.1));
    vec2 pt   = nb + 0.5 + 0.38 * anim - fr;
    float d   = dot(pt, pt);
    if (d < minD)        { minD2 = minD; minD = d; }
    else if (d < minD2) { minD2 = d; }
  }
  float edge = sqrt(minD2) - sqrt(minD);
  float glow = exp(-edge * 14.0) * (0.35 + u_mid * 1.3);
  vec3 col = vec3(0.0, 0.03, 0.02);
  col += vec3(0.04, 0.85, 0.35) * glow;
  col += vec3(0.9, 0.38, 0.04) * pow(glow, 6.0) * u_bass;
  return col;
}`,
  },
  {
    name: "Fractale",
    params: [
      { label: "Zoom",    key: "u_p0", min: 0.5, max: 8,  default: 3.4, step: 0.1  },
      { label: "Vitesse", key: "u_p1", min: 0,   max: 1,  default: 0.3, step: 0.01 },
      { label: "Palette", key: "u_p2", min: 4,   max: 20, default: 9,   step: 1    },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 z = (uv - 0.5) * u_p0 * vec2(res.x / res.y, 1.0);
  float t = u_time * mix(0.04, 0.4, u_p1);
  vec2 c = vec2(-0.74 + 0.38 * cos(t + u_bass * 2.0),
                 0.18 + 0.30 * sin(t * 1.3 + u_mid * 1.8));
  float si = -1.0;
  for (int n = 0; n < 48; n++) {
    if (dot(z, z) > 4.0) {
      si = max(0.0, float(n) - log2(log2(dot(z, z))));
      break;
    }
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
  }
  if (si < 0.0) return vec3(0.0);
  float v = fract(si / u_p2 + u_time * 0.04);
  // palette dark : bleu nuit -> cyan -> orange brule -> jaune
  vec3 col = mix(vec3(0.0, 0.04, 0.18), vec3(0.05, 0.65, 0.85), smoothstep(0.0, 0.5, v));
  col = mix(col, vec3(0.92, 0.40, 0.04), smoothstep(0.5, 0.8, v));
  col = mix(col, vec3(0.98, 0.92, 0.50), smoothstep(0.8, 1.0, v));
  return col * (0.5 + u_level * 0.7);
}`,
  },
  {
    name: "Radar",
    params: [
      { label: "Vitesse", key: "u_p0", min: 0, max: 1, default: 0.3, step: 0.01 },
      { label: "Cercles", key: "u_p1", min: 2, max: 8, default: 4,   step: 1    },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0) * 2.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = u_time * (mix(0.15, 1.2, u_p0) + u_bass * 1.4);
  // balayage rotatif
  float scan = mod(t, TWO_PI) - PI;
  float da   = mod(a - scan + TWO_PI, TWO_PI);
  float sweep = exp(-da * 2.2) * step(r, 0.96) * step(0.015, r);
  // structure HUD : cercles (u_p1 = nombre)
  float spacing = 1.0 / max(u_p1, 1.0);
  float rings = smoothstep(0.013, 0.0, mod(r, spacing) - (spacing - 0.016));
  float axes  = smoothstep(0.005, 0.0, min(abs(p.x), abs(p.y)));
  // blips persistants pseudo-aleatoires
  float bA  = floor(a * 10.0) / 10.0;
  float bR  = 0.15 + hash(vec2(floor(bA * 7.3), 1.0)) * 0.72;
  float age = mod(u_time * 0.4 - hash(vec2(floor(bA * 7.3), 2.0)) * 12.0, 6.0);
  float blip = step(0.91, hash(vec2(floor(bA * 7.3), 0.0)));
  blip *= exp(-age * 0.7) * step(abs(r - bR), 0.04) * step(abs(a - bA), 0.09);
  vec3 col = vec3(0.0, 0.022, 0.01);
  col += vec3(0.0, 0.28, 0.10) * (rings + axes) * 0.4;
  col += vec3(0.0, 0.88, 0.30) * sweep * 0.7;
  col += vec3(0.55, 1.0, 0.65) * blip * 3.5;
  return col * (0.55 + u_level * 0.6);
}`,
  },
  {
    name: "Interférence",
    params: [
      { label: "Fréquence", key: "u_p0", min: 5,  max: 50, default: 22,  step: 1    },
      { label: "Vitesse",   key: "u_p1", min: 0,  max: 1,  default: 0.4, step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time;
  float tsp = mix(2.0, 12.0, u_p1);
  vec2 s1 = vec2( 0.30 * cos(t * 0.30),        0.20 * sin(t * 0.38));
  vec2 s2 = vec2(-0.26 * sin(t * 0.33 + 1.0),  0.27 * cos(t * 0.24));
  vec2 s3 = vec2( 0.12 * cos(t * 0.47 + 2.0), -0.23 * sin(t * 0.42 + 1.5));
  float f  = u_p0 + u_bass * 10.0;
  float w1 = sin(length(p - s1) * f           - t * tsp);
  float w2 = sin(length(p - s2) * (f * 1.07)  + t * (tsp * 0.86));
  float w3 = sin(length(p - s3) * (f * 0.94)  - t * (tsp * 0.76)) * (0.4 + u_mid * 0.8);
  float v  = (w1 + w2 + w3) / 3.0 * 0.5 + 0.5;
  vec3 col = mix(vec3(0.0, 0.01, 0.02), vec3(0.02, 0.38, 0.28), v);
  col = mix(col, vec3(0.95, 0.44, 0.04), pow(v, 7.0) * (0.4 + u_bass * 0.8));
  return col;
}`,
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════════
  // NEW 3D GENERATORS (6)
  // ══════════════════════════════════════════════════════════════════════════════════════════════════

  {
    name: "IFS Fractal",
    params: [
      { label: "Puissance",   key: "u_p0", min: 2, max: 10, default: 6,   step: 0.5  },
      { label: "Échelle",     key: "u_p1", min: 0, max: 1,  default: 0.5, step: 0.01 },
      { label: "Itérations",  key: "u_p2", min: 1, max: 20, default: 10,  step: 1    },
    ],
    src: /* glsl */ `
float ifs_fold(inout vec3 p) {
  float k = 1.0 + u_p1 * 0.8;
  p *= k;
  if (p.x > 1.0) p.x = 2.0 - p.x;
  if (p.y > 1.0) p.y = 2.0 - p.y;
  if (p.z > 1.0) p.z = 2.0 - p.z;
  float r2 = dot(p, p);
  if (r2 < 0.25) {
    p /= r2 * u_p0;
  }
  return r2;
}
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 ro = vec3(cos(u_time * 0.3), sin(u_time * 0.5), 0.5 + u_bass * 0.5);
  vec3 rd = normalize(vec3(p, 0.8));
  float d = 0.0, bright = 0.0;
  vec3 pos = ro + rd * 0.1;
  int niter = int(u_p2);
  for (int i = 0; i < 20; i++) {
    if (i >= niter) break;
    float r2 = ifs_fold(pos);
    pos += rd * max(0.001, r2 * 0.01);
    bright += 0.1 / (0.5 + r2 * 5.0);
    d += 0.02;
    if (d > 2.0) break;
  }
  bright *= 0.5 + u_level * 0.7;
  vec3 col = mix(vec3(0.02, 0.05, 0.1), vec3(0.9, 0.3, 0.05), bright * 0.5);
  col = mix(col, vec3(0.1, 0.8, 0.2), sin(bright + u_time * 0.5) * 0.5 + 0.5);
  return col * (0.5 + u_mid * 0.5);
}`,
  },

  {
    name: "Volumetric Fog",
    params: [
      { label: "Densité",     key: "u_p0", min: 1, max: 10, default: 4,   step: 0.5  },
      { label: "Étapes lumi", key: "u_p1", min: 4, max: 32, default: 16,  step: 2    },
      { label: "Vitesse",     key: "u_p2", min: 0, max: 1,  default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
float fbm3(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * abs(sin(p.x * 2.0) * sin(p.y * 2.0) * sin(p.z * 2.0));
    p = p * 2.1 + vec3(1.7, 9.2, 5.3);
    a *= 0.5;
  }
  return v;
}
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 ro = vec3(sin(u_time * 0.2) * 2.0, cos(u_time * 0.15) * 2.0, u_time * mix(0.1, 0.5, u_p2));
  vec3 rd = normalize(vec3(p, 1.5));
  vec3 col = vec3(0.0);
  float transmit = 1.0;
  int nsteps = int(u_p1);
  for (int step = 0; step < 32; step++) {
    if (step >= nsteps) break;
    vec3 pos = ro + rd * (float(step) * 0.1);
    float density = fbm3(pos * u_p0) * 0.5 + 0.5;
    density *= u_level * 0.8;
    vec3 lightCol = mix(vec3(0.05, 0.2, 0.5), vec3(0.9, 0.3, 0.05), fbm3(pos + u_time) * 0.5 + 0.5);
    col += lightCol * density * transmit * 0.08;
    transmit *= 0.95;
  }
  col += (fbm3(ro * 3.0 + u_time) * 0.5 + 0.5) * vec3(0.1, 0.4, 0.8) * u_treble * 0.3;
  return col;
}`,
  },

  {
    name: "Torus Knot",
    params: [
      { label: "P (tours)",   key: "u_p0", min: 1, max: 8,  default: 3,   step: 1    },
      { label: "Q (boucles)", key: "u_p1", min: 1, max: 8,  default: 2,   step: 1    },
      { label: "Vitesse",     key: "u_p2", min: 0, max: 1,  default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
float torus_knot(vec3 p) {
  float t = atan(p.y, p.x);
  float r = length(p.xy);
  float theta = atan(p.z, r - 1.0);
  float p_val = u_p0;
  float q_val = u_p1;
  float curve_t = atan(p.z, r - 1.0) * q_val / p_val + t;
  float curve_r = 0.5 + 0.35 * cos(curve_t * p_val);
  return length(vec3(cos(t) * (r - curve_r), sin(t) * (r - curve_r), p.z - sin(curve_t * p_val * 0.5)));
}
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 ro = vec3(cos(u_time * mix(0.1, 0.5, u_p2)), sin(u_time * mix(0.1, 0.5, u_p2)), 0.3);
  vec3 rd = normalize(vec3(p, 1.2));
  float d = 0.0, bright = 0.0;
  vec3 pos = ro + rd * 0.1;
  for (int i = 0; i < 50; i++) {
    float dist = torus_knot(pos);
    if (dist < 0.01) { bright += 0.3; break; }
    pos += rd * max(0.01, dist * 0.5);
    bright += 0.02 / (0.3 + dist * 10.0);
    d += length(rd) * 0.02;
    if (d > 3.0) break;
  }
  bright *= 0.6 + u_level * 0.5;
  float hue = atan(pos.y, pos.x) / TWO_PI + u_time * 0.1;
  vec3 col = mix(vec3(0.0, 0.5, 0.9), vec3(0.9, 0.2, 0.6), fract(hue));
  return col * bright * (0.5 + u_bass * 0.5);
}`,
  },

  {
    name: "Perlin 3D",
    params: [
      { label: "Échelle",  key: "u_p0", min: 1, max: 10, default: 3,   step: 0.5  },
      { label: "Octaves",  key: "u_p1", min: 1, max: 8,  default: 4,   step: 1    },
      { label: "Vitesse",  key: "u_p2", min: 0, max: 1,  default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
float perlin3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(
      mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
      mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x),
      f.y
    ),
    mix(
      mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
      mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x),
      f.x
    ),
    f.z
  );
  return n;
}
float fbm3d(vec3 p) {
  float v = 0.0, a = 0.5;
  int noctaves = int(clamp(u_p1, 1.0, 8.0));
  for (int i = 0; i < 8; i++) {
    if (i >= noctaves) break;
    v += a * perlin3(p);
    p = p * 2.1 + vec3(1.7, 9.2, 5.3);
    a *= 0.5;
  }
  return v;
}
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 ro = vec3(sin(u_time * 0.2), cos(u_time * 0.15), u_time * mix(0.1, 0.5, u_p2));
  vec3 rd = normalize(vec3(p, 1.2));
  float d = 0.0, bright = 0.0;
  vec3 pos = ro + rd * 0.1;
  for (int i = 0; i < 50; i++) {
    float noise = fbm3d(pos * u_p0);
    bright += abs(noise) * 0.08;
    pos += rd * 0.04;
    d += 0.04;
    if (d > 2.0) break;
  }
  bright *= 0.5 + u_level * 0.7;
  vec3 col = mix(vec3(0.02, 0.1, 0.2), vec3(0.3, 0.7, 0.9), bright * 0.3);
  col = mix(col, vec3(0.9, 0.2, 0.4), sin(bright * 3.0 + u_time) * 0.5 + 0.5);
  return col * (0.5 + u_mid * 0.5);
}`,
  },

  {
    name: "Spherical Harmonics",
    params: [
      { label: "Mode L",    key: "u_p0", min: 1, max: 6,  default: 3,   step: 1    },
      { label: "Fréquence", key: "u_p1", min: 1, max: 10, default: 4,   step: 1    },
      { label: "Vitesse",   key: "u_p2", min: 0, max: 1,  default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
float sph_harmonic(vec3 p) {
  float theta = acos(p.z / length(p));
  float phi = atan(p.y, p.x);
  float l = u_p0;
  float m = u_p1;
  float sh = sin(theta) * cos(m * phi + u_time * mix(0.1, 0.8, u_p2));
  sh *= pow(abs(cos(l * theta)), 2.0);
  return sh;
}
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 ro = vec3(sin(u_time * 0.2) * 1.5, cos(u_time * 0.15) * 1.5, 1.0);
  vec3 rd = normalize(vec3(p, 1.2));
  float d = 0.0, bright = 0.0;
  vec3 pos = ro + rd * 0.1;
  for (int i = 0; i < 50; i++) {
    float sh = sph_harmonic(normalize(pos));
    float val = abs(sh) * 0.5 + 0.5;
    bright += val * 0.08;
    pos += rd * 0.04;
    d += 0.04;
    if (d > 2.5) break;
  }
  bright *= 0.6 + u_level * 0.5;
  vec3 col = mix(vec3(0.05, 0.15, 0.35), vec3(0.8, 0.4, 0.1), bright * 0.4);
  col = mix(col, vec3(0.2, 0.8, 0.5), sin(bright * 2.0 + u_time) * 0.5 + 0.5);
  return col * (0.5 + u_treble * 0.5);
}`,
  },

  {
    name: "Klein Bottle",
    params: [
      { label: "Rotation1", key: "u_p0", min: 0, max: 1, default: 0.3, step: 0.01 },
      { label: "Rotation2", key: "u_p1", min: 0, max: 1, default: 0.5, step: 0.01 },
      { label: "Vitesse",   key: "u_p2", min: 0, max: 1, default: 0.3, step: 0.01 },
    ],
    src: /* glsl */ `
float klein_sdf(vec3 p) {
  float u = atan(p.x, p.z);
  float v = length(vec2(length(p.xz) - 2.0, p.y));
  float w = v < 1.5 ? (2.0 * u / TWO_PI) : (2.0 - 2.0 * u / TWO_PI);
  float x = 3.0 * cos(w) * (1.0 + sin(w) * 0.5 * cos(u));
  float y = -5.0 * sin(w) + 10.0 * cos(w) * sin(u);
  float z = 15.0 * cos(u) * (1.0 + sin(w) * 0.5 * sin(u));
  vec3 surf = vec3(x, y, z) * 0.1;
  return length(p - surf);
}
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 ro = vec3(
    sin(u_time * mix(0.1, 0.5, u_p0)) * 2.0,
    cos(u_time * mix(0.1, 0.5, u_p1)) * 2.0,
    1.5
  );
  vec3 rd = normalize(vec3(p, 1.2));
  float d = 0.0, bright = 0.0;
  vec3 pos = ro + rd * 0.1;
  for (int i = 0; i < 50; i++) {
    float dist = klein_sdf(pos);
    if (dist < 0.02) { bright += 0.3; break; }
    pos += rd * max(0.01, dist * 0.4);
    bright += 0.05 / (0.5 + dist * 10.0);
    d += 0.02;
    if (d > 2.5) break;
  }
  bright *= 0.6 + u_level * 0.5;
  vec3 col = mix(vec3(0.05, 0.2, 0.4), vec3(0.9, 0.4, 0.1), bright * 0.3);
  col = mix(col, vec3(0.3, 0.7, 0.9), sin(bright + u_time * mix(0.1, 0.5, u_p2)) * 0.5 + 0.5);
  return col * (0.5 + u_bass * 0.5);
}`,
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════════
  // NEW TEXT GENERATORS (5)
  // ══════════════════════════════════════════════════════════════════════════════════════════════════

  {
    name: "Typography",
    params: [
      { label: "Durée texte",  key: "holdMs", min: 1000, max: 15000, default: 8000, step: 500  },
      { label: "Géométrie",    key: "u_p0", min: 0,    max: 1,     default: 0.5,  step: 0.01 },
      { label: "Épaisseur",    key: "u_p1", min: 0,    max: 1,     default: 0.4,  step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float txt = textCol(uv).g;
  float t = u_time;
  // distorsion géométrique des lettres
  float dist = length((uv - 0.5) * vec2(res.x / res.y, 1.0));
  float warp = sin(dist * mix(3.0, 15.0, u_p0) - t) * 0.15;
  vec2 wuv = uv + normalize((uv - 0.5)) * warp;
  float wtxt = textCol(wuv).g;
  // épaisseur variable avec pulsation
  float edge = smoothstep(
    mix(0.01, 0.1, u_p1) + u_bass * 0.05,
    0.0,
    abs(wtxt - 0.5)
  );
  // effet de dégradé radial
  float glow = exp(-dist * mix(2.0, 8.0, u_p0)) * 0.4;
  vec3 col = vec3(0.0);
  col += vec3(0.1, 0.9, 0.4) * (edge + wtxt * 0.3);
  col += vec3(0.9, 0.3, 0.05) * glow * (0.5 + u_mid * 0.5);
  col += (hash(uv * res + t) - 0.5) * 0.08;
  return col * (0.55 + u_level * 0.7);
}`,
  },

  {
    name: "Calligraphic",
    params: [
      { label: "Durée texte",   key: "holdMs", min: 1000, max: 15000, default: 8000, step: 500  },
      { label: "Épaisseur",     key: "u_p0", min: 0,    max: 1,     default: 0.4,  step: 0.01 },
      { label: "Fluidité",      key: "u_p1", min: 0,    max: 1,     default: 0.5,  step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float txt = textCol(uv).g;
  float t = u_time;
  // angle de la brsse (calligraphie)
  float angle = atan(sin(uv.y * res.y * 0.1 - t * mix(0.5, 3.0, u_p1)), cos(uv.x * res.x * 0.1));
  vec2 brush = vec2(cos(angle), sin(angle)) * mix(0.002, 0.02, u_p0);
  float stroked = max(textCol(uv + brush).g, textCol(uv - brush).g);
  // variation d'épaisseur selon hauteur
  float thick = mix(0.01, 0.08, u_p0) * (0.5 + 0.5 * sin(uv.y * res.y * 0.05));
  float edge = smoothstep(thick, 0.0, abs(stroked - 0.5));
  // phosphore + traçage
  vec3 col = vec3(0.0, 0.5, 0.2) * edge;
  col += vec3(0.1, 0.8, 0.4) * stroked * 0.4;
  col += vec3(0.9, 0.5, 0.1) * (edge * u_bass + stroked * u_mid) * 0.3;
  return col * (0.5 + u_level * 0.7);
}`,
  },

  {
    name: "Text Wave",
    params: [
      { label: "Durée texte",  key: "holdMs", min: 1000, max: 15000, default: 8000, step: 500  },
      { label: "Amplitude",    key: "u_p0", min: 0,    max: 1,     default: 0.4,  step: 0.01 },
      { label: "Fréquence",    key: "u_p1", min: 1,    max: 10,    default: 3.0,  step: 0.5  },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  // onde horizontale sinusoïdale
  float wave_y = uv.y + sin(uv.x * mix(1.0, 8.0, u_p1) - t * mix(0.5, 3.0, u_p0)) * mix(0.02, 0.15, u_p0);
  float txt = textCol(vec2(uv.x, wave_y)).g;
  // onde verticale supplémentaire
  float wave_x = uv.x + cos(uv.y * mix(1.0, 8.0, u_p1) - t * mix(0.3, 2.0, u_p0)) * mix(0.01, 0.08, u_p0);
  float txt2 = textCol(vec2(wave_x, uv.y)).g;
  float combined = max(txt, txt2);
  // thickness dynamique
  float thick = smoothstep(0.012, 0.0, abs(combined - 0.5));
  // coloration onde
  vec3 col = vec3(0.0);
  col += vec3(0.0, 0.7, 0.3) * thick * (0.5 + 0.5 * sin(t + uv.x * 5.0));
  col += vec3(0.1, 0.85, 0.6) * combined * 0.25;
  col += vec3(0.9, 0.3, 0.1) * thick * u_bass * 0.4;
  return col * (0.55 + u_level * 0.65);
}`,
  },

  {
    name: "Glyphic",
    params: [
      { label: "Durée texte", key: "holdMs", min: 1000, max: 15000, default: 8000, step: 500  },
      { label: "Densité",     key: "u_p0", min: 2,    max: 12,    default: 6.0,  step: 0.5  },
      { label: "Vitesse",     key: "u_p1", min: 0,    max: 1,     default: 0.3,  step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  // grille de glyphes (caractères abstraits)
  vec2 grid_uv = floor(uv * mix(2.0, 12.0, u_p0)) / mix(2.0, 12.0, u_p0);
  vec2 frac_uv = fract(uv * mix(2.0, 12.0, u_p0));
  // caractère dynamique par position + temps
  float char_id = hash(grid_uv + floor(t * mix(1.0, 5.0, u_p1)));
  float txt = textCol(uv).g;
  // forme géométrique (traits de glyphe)
  float glyph = 0.0;
  glyph += abs(frac_uv.x - 0.5) * step(0.3, char_id);
  glyph += abs(frac_uv.y - 0.5) * step(0.6, char_id);
  glyph = 1.0 - smoothstep(0.05, 0.25, glyph);
  // fusion texte + glyphe
  float blend = max(txt * 0.5, glyph);
  vec3 col = vec3(0.0, 0.6, 0.3) * blend;
  col += vec3(0.1, 0.8, 0.5) * glyph * (0.4 + u_mid * 0.5);
  col += vec3(0.9, 0.4, 0.05) * glyph * u_bass * 0.3;
  return col * (0.55 + u_level * 0.65);
}`,
  },

  {
    name: "Typewriter Rows",
    params: [
      { label: "Durée texte",  key: "holdMs", min: 1000, max: 15000, default: 8000, step: 500  },
      { label: "Vitesse tape", key: "u_p0", min: 0,    max: 1,     default: 0.5,  step: 0.01 },
      { label: "Retour",       key: "u_p1", min: 0,    max: 1,     default: 0.3,  step: 0.01 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  float speed = mix(0.5, 4.0, u_p0);
  // simuler des rangées tapées progressivement
  float row = floor(uv.y * 12.0);
  float row_time = t * speed - row * mix(0.1, 0.5, u_p1);
  // progression de la dactylographie (0->1 par ligne)
  float type_progress = mod(row_time, 1.0);
  // limite la colonne écrite
  float col_limit = uv.x < type_progress ? 1.0 : 0.0;
  float txt = textCol(uv).g * col_limit;
  // effet de retour à la ligne (carriage return)
  float return_flash = smoothstep(0.05, 0.0, abs(type_progress - 0.95)) * col_limit;
  // trait du curseur (typewriter cursor)
  float cursor_pos = type_progress;
  float cursor = smoothstep(0.01, 0.0, abs(uv.x - cursor_pos) * res.x / res.y) * smoothstep(0.05, 0.0, abs(uv.y - (row + 0.5) / 12.0));
  vec3 col = vec3(0.0);
  col += vec3(0.0, 0.7, 0.2) * txt * (0.5 + u_level * 0.5);
  col += vec3(1.0, 0.8, 0.0) * return_flash * u_bass;
  col += vec3(0.9, 0.9, 0.9) * cursor;
  col += (hash(uv * res + t) - 0.5) * 0.06;
  return col;
}`,
  },
  // ── Shaders GLSL réels d'Internet (Shadertoy-style) ──────────────────────────
  {
    name: "Voronoi cells",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  uv *= 8.0;
  vec2 i_uv = floor(uv);
  vec2 f_uv = fract(uv);

  float minDist = 1.0;
  vec3 col = vec3(0.0);

  for (float y = -1.0; y <= 1.0; y++) {
    for (float x = -1.0; x <= 1.0; x++) {
      vec2 neighbor = vec2(x, y);
      vec2 cell = i_uv + neighbor;
      vec2 cellCenter = cell + hash(cell + u_time * 0.1);

      float dist = length(f_uv + neighbor - cellCenter);
      if (dist < minDist) {
        minDist = dist;
        col = mix(vec3(0.1, 0.8, 0.6), vec3(0.9, 0.2, 0.4), hash(cell));
      }
    }
  }

  col += smoothstep(0.05, 0.0, minDist) * vec3(1.0);
  col *= 0.5 + 0.5 * u_level;
  return col;
}`,
  },
  {
    name: "Perlin-like noise",
    src: /* glsl */ `
float perlin_like(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  float n1 = perlin_like(uv * 3.0 + t);
  float n2 = perlin_like(uv * 6.0 - t * 0.7);
  float n3 = perlin_like(uv * 12.0 + t * 1.3);

  float fbm = n1 * 0.5 + n2 * 0.25 + n3 * 0.125;
  vec3 col = mix(vec3(0.1, 0.2, 0.4), vec3(0.8, 0.4, 0.1), fbm);
  col += fftAt(uv.x) * 0.3;
  return col;
}`,
  },
  {
    name: "Stripes wave",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float freq = 8.0 + u_bass * 8.0;
  float wave = sin(uv.x * freq + u_time * 2.0 - uv.y * 3.0);
  float stripe = abs(wave) * 0.5;

  vec3 col = vec3(0.0);
  col.r = stripe + sin(u_time * 0.5) * 0.2;
  col.g = stripe + cos(u_time * 0.7) * 0.2;
  col.b = stripe + sin(u_time * 0.3) * 0.2;

  col += fftAt(uv.x * 0.3) * vec3(0.4, 0.2, 0.8);
  return col * (0.6 + u_level * 0.6);
}`,
  },
  {
    name: "Radial symmetry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 pos = uv - 0.5;
  float angle = atan(pos.y, pos.x);
  float radius = length(pos);

  float sides = 6.0 + u_mid * 8.0;
  float pattern = cos(angle * sides + u_time);
  float rings = sin(radius * 12.0 - u_time);

  float combined = pattern * rings;
  vec3 col = mix(vec3(0.1, 0.05, 0.2), vec3(0.9, 0.3, 0.7), combined * 0.5 + 0.5);
  col *= smoothstep(1.0, 0.3, radius);
  return col;
}`,
  },
  {
    name: "Chromatic shift",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  float shift = 0.01 + u_bass * 0.05;

  float r = sin(uv.x * 10.0 + t) * 0.5 + 0.5;
  r = texture(u_audio, vec2(uv.x + shift, 0.25)).r;

  float g = sin(uv.y * 10.0 + t * 1.3) * 0.5 + 0.5;
  g = texture(u_audio, vec2(uv.x, 0.25)).r;

  float b = sin((uv.x + uv.y) * 10.0 + t * 0.7) * 0.5 + 0.5;
  b = texture(u_audio, vec2(uv.x - shift, 0.25)).r;

  return vec3(r, g, b) * (0.7 + u_level * 0.5);
}`,
  },
  {
    name: "Mandelbrot (complete)",
    src: /* glsl */ `
#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;

void main() {
  vec2 uv = (gl_FragCoord.xy - u_resolution.xy * 0.5) / u_resolution.y * 3.0;
  uv += vec2(sin(u_time * 0.3) * 0.5, cos(u_time * 0.2) * 0.3);

  vec2 c = uv;
  vec2 z = vec2(0.0);
  float iter = 0.0;

  for (int i = 0; i < 64; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (length(z) > 4.0) break;
    iter += 1.0;
  }

  vec3 col = mix(vec3(0.0, 0.0, 0.1), vec3(0.9, 0.4, 0.1), iter / 64.0);
  fragColor = vec4(col, 1.0);
}`,
  },
];
