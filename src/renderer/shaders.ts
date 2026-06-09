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
  category?: "Text" | "Plasma" | "Geometry" | "Noise" | "Interactive" | "Real-world";
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
  float v = fftAt(uv.x) * (0.8 + 0.4 * u_bass);  // hauteur de la barre (0..1), modulée par les basses
  float bar = step(uv.y, v);                      // rempli sous la valeur
  vec3 col = mix(vec3(0.0, 0.04 * (1.0 - u_mid), 0.03), vec3(0.10 + u_treble * 0.1, 0.90, 0.40 + u_mid * 0.2), bar);
  float peak_width = u_p1 * (0.8 + 0.4 * u_bass);
  col += vec3(0.9, 0.3 + u_treble * 0.2, 0.05) * smoothstep(peak_width, 0.0, abs(uv.y - v)); // crête chaude
  // séparation des barres
  col *= (0.4 + 0.4 * u_level) + 0.6 * step(0.12, fract(uv.x * u_p0));
  col += vec3(0.0, u_bass * 0.1, 0.0);
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
  float line_thickness = mix(0.004, 0.06, u_p0) * (0.7 + 0.6 * u_bass);
  float line = smoothstep(line_thickness, 0.0, d);
  vec3 col = vec3(0.0, 0.02 * (1.0 - u_mid), 0.04) + vec3(0.10, 0.70, 0.90) * line * (0.6 + 0.4 * u_bass);
  float halo_thickness = mix(0.02, 0.4, u_p1) * (0.8 + 0.4 * u_treble);
  col += vec3(0.10, 0.70, 0.90) * (0.1 + 0.15 * u_mid) * smoothstep(halo_thickness, 0.0, d);
  col *= 0.5 + 0.7 * u_level;
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
  // ── Shaders GLSL réels d'Internet (Shadertoy-style) ──────────────────────────
  {
    name: "Voronoi cells",
    params: [
      { label: "Cells", key: "u_p0", min: 2, max: 20, default: 8.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.5, step: 0.1 },
    ],
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
    params: [
      { label: "Scale", key: "u_p0", min: 1, max: 10, default: 3.0, step: 0.5 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.5, step: 0.1 },
    ],
    src: /* glsl */ `
float perlin_like(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * (0.3 + u_bass * 1.5);
  float n1 = perlin_like(uv * (3.0 + u_treble * 3.0) + t);
  float n2 = perlin_like(uv * (6.0 + u_mid * 4.0) - t * 0.7);
  float n3 = perlin_like(uv * 12.0 + t * 1.3);

  float fbm = n1 * 0.5 + n2 * 0.25 + n3 * 0.125;
  vec3 col = mix(vec3(0.1, 0.2 * (1.0 - u_mid), 0.4), vec3(0.8 + u_treble * 0.2, 0.4 + u_bass * 0.3, 0.1), fbm);
  col += fftAt(uv.x) * (0.2 + 0.3 * u_bass);
  col *= 0.5 + 0.7 * u_level;
  return col;
}`,
  },
  {
    name: "Stripes wave",
    params: [
      { label: "Frequency", key: "u_p0", min: 1, max: 20, default: 8.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 2.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float freq = u_p0 * (0.8 + u_bass * 1.2);
  float wave = sin(uv.x * freq + u_time * u_p1 * (1.0 + u_treble) - uv.y * (2.0 + u_mid));
  float stripe = abs(wave) * (0.4 + 0.2 * u_bass);

  vec3 col = vec3(0.0);
  col.r = stripe + sin(u_time * (0.5 + u_bass)) * 0.2;
  col.g = stripe + cos(u_time * (0.7 + u_mid)) * 0.2;
  col.b = stripe + sin(u_time * (0.3 + u_treble)) * 0.2;

  col += fftAt(uv.x * 0.3) * vec3(0.4, 0.2, 0.8) * (0.6 + 0.4 * u_bass);
  return col * (0.5 + 0.8 * u_level);
}`,
  },
  {
    name: "Radial symmetry",
    params: [
      { label: "Sides", key: "u_p0", min: 3, max: 16, default: 6.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 pos = uv - 0.5;
  float angle = atan(pos.y, pos.x);
  float radius = length(pos);

  float sides = u_p0 * (0.9 + 0.2 * u_mid);
  float pattern = cos(angle * sides + u_time * u_p1 * (0.8 + u_bass));
  float rings = sin(radius * (12.0 + u_treble * 4.0) - u_time * u_p1);

  float combined = pattern * rings * (0.7 + 0.3 * u_bass);
  vec3 col = mix(vec3(0.1, 0.05 + u_bass * 0.1, 0.2), vec3(0.9, 0.3 + u_mid * 0.3, 0.7 + u_treble * 0.2), combined * 0.5 + 0.5);
  col *= smoothstep(1.0, 0.3, radius);
  col *= 0.5 + 0.7 * u_level;
  return col;
}`,
  },
  {
    name: "Chromatic shift",
    params: [
      { label: "Scale", key: "u_p0", min: 1, max: 10, default: 3.0, step: 0.5 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p1 * (0.8 + u_bass);
  float shift = (0.008 + u_bass * 0.06) * u_p0;

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
    name: "Cube Raymarching",
    params: [
      { label: "Rotation", key: "u_p0", min: 0, max: 2, default: 0.5, step: 0.1 },
      { label: "Scale", key: "u_p1", min: 0.3, max: 1.5, default: 0.6, step: 0.1 },
    ],
    src: /* glsl */ `
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0) * 2.5;
  vec3 ro = vec3(sin(u_time * u_p0 * (0.5 + u_bass)) * 1.5, u_bass * 0.5, 3.0 - u_mid);
  vec3 rd = normalize(vec3(p, -1.0));

  float t = 0.1;
  for(int i = 0; i < 80; i++) {
    vec3 pos = ro + rd * t;
    float d = sdBox(pos, vec3(u_p1 * (0.8 + 0.4 * u_bass)));
    if(d < 0.001) break;
    if(t > 50.0) break;
    t += d * (0.6 + 0.4 * u_treble);
  }

  vec3 pos = ro + rd * t;
  vec3 n = normalize(vec3(
    sdBox(pos+vec3(0.001,0,0), vec3(u_p1))-sdBox(pos-vec3(0.001,0,0), vec3(u_p1)),
    sdBox(pos+vec3(0,0.001,0), vec3(u_p1))-sdBox(pos-vec3(0,0.001,0), vec3(u_p1)),
    sdBox(pos+vec3(0,0,0.001), vec3(u_p1))-sdBox(pos-vec3(0,0,0.001), vec3(u_p1))
  ));

  vec3 light = normalize(vec3(1.0, 1.0 + u_mid, -1.0 - u_treble));
  float spec = pow(max(0.0, dot(reflect(-light, n), -rd)), 16.0) * (0.6 + 0.4 * u_bass);
  vec3 col = vec3(0.2, 0.5, 0.9 + u_treble * 0.2) * (0.3 + 0.7 * max(0.0, dot(n, light))) + spec * 0.8;
  col += u_bass * 0.4;
  col *= exp(-t * 0.08) * (0.7 + 0.3 * u_level);
  return col;
}`,
  },
  {
    name: "Neuron Network",
    params: [
      { label: "Grid Size", key: "u_p0", min: 3, max: 10, default: 7.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.4, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  vec3 col = vec3(0.0);
  float t = u_time * u_p1 * (0.8 + u_bass * 1.2);
  float grid_size = u_p0;

  // Réseau de neurones en grille 3D projeté
  for(float i = 0.0; i < 10.0; i++) {
    if(i >= grid_size) break;
    for(float j = 0.0; j < 10.0; j++) {
      if(j >= grid_size) break;
      // Position du neurone dans un cube
      float layer = mod(i, 3.0);
      float angle = (i + j * 0.5) * (0.8 + u_treble * 0.3) + t * 0.3;
      float radius = (0.12 + 0.06 * sin(t + layer)) * (0.8 + 0.4 * u_mid);

      vec2 pos = vec2(cos(angle), sin(angle)) * radius;
      pos += vec2(cos(t + i * 0.3 + u_bass), sin(t + j * 0.3 + u_mid)) * (0.06 + u_bass * 0.08);

      // Distance au neurone
      float d = distance(p, pos);

      // Neurone avec brillance
      vec3 neuron_col = vec3(
        0.2 + 0.6 * sin(t + i * 0.5 + u_treble),
        0.1 + 0.7 * sin(t + j * 0.5 + u_bass),
        0.4 + 0.5 * sin(t + i + j + u_mid)
      );
      col += neuron_col * ((0.08 + u_bass * 0.04) / (d * 80.0 + 0.05));
      col += vec3(0.9, 0.8, 1.0 + u_treble * 0.2) * pow(max(0.0, 0.02 - d), 2.0) * (0.3 + 0.2 * u_bass);

      // Connexions entre neurones proches
      for(float k = i + 1.0; k < min(i + 3.0, grid_size); k++) {
        for(float l = j; l < min(j + 2.0, grid_size); l++) {
          float angle2 = (k + l * 0.5) * (0.8 + u_treble * 0.3) + t * 0.3;
          float radius2 = (0.12 + 0.06 * sin(t + mod(k, 3.0))) * (0.8 + 0.4 * u_mid);
          vec2 pos2 = vec2(cos(angle2), sin(angle2)) * radius2;
          pos2 += vec2(cos(t + k * 0.3 + u_bass), sin(t + l * 0.3 + u_mid)) * (0.06 + u_bass * 0.08);

          float conn_d = distance(p, mix(pos, pos2, 0.5));
          col += vec3(0.3, 0.6, 0.9) * (0.015 + u_bass * 0.015) / (conn_d * 100.0 + 0.05);
        }
      }
    }
  }

  col *= 0.5 + 0.8 * u_level;
  col += vec3(u_bass * 0.2);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Liquid Sphere",
    params: [
      { label: "Viscosity", key: "u_p0", min: 0, max: 1, default: 0.5, step: 0.05 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.8, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0) * 2.0;
  float r = length(p);
  float t = u_time;

  // Sphère liquide avec perturbations
  float wave = sin(r * 8.0 - t * 2.5) * 0.08 + sin(r * 4.0 + t * 1.5) * 0.04;
  float rad = 0.4 + wave;

  if(r < rad) {
    // Intérieur lumineux avec gradient
    float center_dist = length(p - vec2(sin(t*0.4), cos(t*0.3))*0.15);
    float inside = sin(center_dist * 12.0 - t*2.0) * 0.5 + 0.5;
    vec3 col = mix(vec3(0.05, 0.2, 0.7), vec3(0.9, 0.3, 0.1), inside);
    col += vec3(0.2, 0.3, 0.4) * sin(r * 6.0 + t) * 0.3;

    // Specular highlight (brillance)
    vec2 n = normalize(p);
    float spec = pow(max(0.0, dot(n, normalize(vec2(sin(t*0.5), cos(t*0.3))))), 4.0);
    col += vec3(0.9, 0.95, 1.0) * spec * 0.6;

    // Fresnel effect (bordure brillante)
    float fresnel = pow(1.0 - (rad - r) / wave, 2.0);
    col += vec3(0.7, 0.8, 1.0) * fresnel * 0.4;

    return col * (0.7 + u_bass * 0.3);
  }

  // Fond dégradé
  float bg = 0.02 + 0.03 * sin(uv.x * 5.0 + t) * sin(uv.y * 5.0 - t);
  return vec3(bg * 0.3, bg * 0.4, bg * 0.6);
}`,
  },
  {
    name: "Scanlines",
    params: [
      { label: "Frequency", key: "u_p0", min: 5, max: 30, default: 20.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;

  // Ligne de scan CRT rétro
  float scanline = sin(uv.y * res.y * 0.5 + t) * 0.5 + 0.5;
  float intensity = 0.7 + 0.3 * scanline;

  // Bruit horizontal style CRT
  float noise = hash(vec2(uv.x * 20.0, floor(uv.y * res.y)));

  // Dégradé vertical minimaliste
  float vert = uv.y * 0.5 + 0.5;

  // Audio reactivity en monochrome
  float audio_line = abs(sin(uv.x * 10.0 - t * 2.0)) * u_bass;

  vec3 col = vec3(vert * intensity) * (0.5 + noise * 0.2);
  col += vec3(1.0) * audio_line * 0.3;
  col *= 0.8 + 0.2 * u_level;

  return col;
}`,
  },
  {
    name: "Wire Grid",
    params: [
      { label: "Grid Scale", key: "u_p0", min: 2, max: 20, default: 8.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.5, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;

  // Grille filaire minimaliste
  float grid_size = 8.0;
  vec2 grid = abs(fract(uv * grid_size) - 0.5);
  float grid_line = min(grid.x, grid.y);

  // Lignes horizontales animées
  float h_line = abs(sin((uv.y * grid_size + t) * 3.14159)) - 0.4;
  h_line = step(0.0, h_line) * step(0.0, 0.1 - abs(h_line));

  // Distorsion minimaliste
  float dist = abs(sin(uv.x * 20.0 + t * 2.0) * 0.02);
  float final_line = step(0.02, grid_line);

  float brightness = final_line * (0.6 + 0.4 * h_line);
  brightness += u_bass * 0.2;

  return vec3(brightness * 0.8) * (0.5 + u_level * 0.5);
}`,
  },
  {
    name: "Circuit Board",
    params: [
      { label: "Density", key: "u_p0", min: 2, max: 20, default: 10.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.6, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.3;

  // Traces de circuit minimalistes
  vec2 p = uv * 4.0;
  vec2 id = floor(p);
  vec2 f = fract(p);

  // Lignes horizontales et verticales
  float h_trace = step(0.45, f.y) * step(f.y, 0.55);
  float v_trace = step(0.45, f.x) * step(f.x, 0.55);

  // Points de connection (via)
  float via = length(f - 0.5);
  float via_circle = step(via, 0.08);

  // Animation des traces
  float pulse = sin(id.x * 0.5 + id.y * 0.3 + t) * 0.5 + 0.5;

  float trace_bright = (h_trace + v_trace) * pulse;
  float total = max(trace_bright, via_circle);

  total += u_bass * 0.15;

  return vec3(total * 0.7) * (0.6 + u_level * 0.4);
}`,
  },
  {
    name: "Binary Stream",
    params: [
      { label: "Speed", key: "u_p0", min: 0, max: 2, default: 1.0, step: 0.1 },
      { label: "Density", key: "u_p1", min: 0.1, max: 1.0, default: 0.5, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;

  // Flux binaire (0 et 1)
  float col_size = 12.0;
  float row_size = 6.0;

  vec2 grid = floor(vec2(uv.x * col_size, (uv.y + t * 0.3) * row_size));
  float idx = mod(hash(grid) * 100.0, 2.0);

  // Afficher 0 ou 1
  vec2 f = fract(vec2(uv.x * col_size, (uv.y + t * 0.3) * row_size));

  // Caractère simple: ligne pour 1, carré pour 0
  float char_line = 0.0;
  if(idx < 1.0) {
    // "1" = ligne verticale
    char_line = step(0.4, f.x) * step(f.x, 0.6) * step(0.2, f.y) * step(f.y, 0.8);
  } else {
    // "0" = carré
    char_line = step(0.3, f.x) * step(f.x, 0.7) * step(0.2, f.y) * step(f.y, 0.8);
    char_line += (step(0.3, f.x) * step(f.x, 0.4) + step(0.6, f.x) * step(f.x, 0.7)) * (step(0.2, f.y) * step(f.y, 0.8));
  }

  float brightness = max(char_line, 0.05 * u_bass);

  return vec3(brightness * 0.8);
}`,
  },
  {
    name: "Glitch Minimal",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * (0.8 + u_bass * 1.5);

  // Corruption minimaliste - audio-reactive
  vec2 p = uv;

  // Décalage aléatoire par scanlines - affected by bass
  float scan = floor(p.y * 20.0);
  float glitch_intensity = abs(sin(scan * 0.1 + t * (3.0 + u_treble * 2.0))) * step(0.8, fract(scan * 0.3 + t)) * (0.5 + 0.5 * u_bass);

  // Offset et duplication
  float offset = glitch_intensity * (0.06 + u_mid * 0.12);
  float r = texture(u_audio, vec2(p.x + offset, p.y * 0.25)).r;
  float g = texture(u_audio, vec2(p.x, (p.y + offset) * 0.25)).r;
  float b = texture(u_audio, vec2(p.x - offset, p.y * 0.25)).r;

  // Pattern blocky - influenced by bass
  float block = floor(p.x * (12.0 + u_treble * 4.0));
  float block_glitch = step(0.9, fract(block * 0.1 + t * (2.0 + u_mid))) * glitch_intensity;

  float brightness = max(max(r, g), b) * (1.0 - block_glitch) + block_glitch;

  brightness *= 0.5 + 0.8 * u_level;
  brightness += u_bass * 0.2;

  return vec3(brightness);
}`,
  },
  {
    name: "Node Grid",
    params: [
      { label: "Grid Size", key: "u_p0", min: 3, max: 10, default: 5.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.3, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.3;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Grille régulière de nœuds
  float grid_scale = 5.0;
  vec2 grid_pos = floor(uv * grid_scale);
  vec2 grid_frac = fract(uv * grid_scale);

  // Distance au nœud le plus proche
  float min_dist = 10.0;
  vec2 closest_node = vec2(0.0);

  for(int dx = -1; dx <= 1; dx++) {
    for(int dy = -1; dy <= 1; dy++) {
      vec2 node_grid = grid_pos + vec2(float(dx), float(dy));
      vec2 node_world = (node_grid + 0.5) / grid_scale;

      // Perturbation animée
      float h = hash(node_grid);
      node_world += vec2(sin(t + h * 10.0), cos(t * 0.8 + h * 8.0)) * 0.04;

      float d = distance(uv, node_world);
      if(d < min_dist) {
        min_dist = d;
        closest_node = node_world;
      }

      // Dessiner le nœud
      float ring = smoothstep(0.015, 0.008, d) * smoothstep(0.008, 0.012, d);
      col += vec3(ring * 0.85);
    }
  }

  // Lignes vers 4 plus proches voisins
  for(int i = 0; i < 4; i++) {
    float angle = float(i) * 1.5708;  // 4 directions
    vec2 dir = normalize(vec2(cos(angle), sin(angle)));
    float step_size = 1.0 / grid_scale;

    // Tracer jusqu'au nœud suivant
    for(float s = 0.0; s <= 1.5; s += 0.1) {
      vec2 point = closest_node + dir * step_size * s;
      if(point.x < 0.0 || point.x > 1.0 || point.y < 0.0 || point.y > 1.0) break;

      vec2 perp = vec2(-dir.y, dir.x);
      float dist_to_line = abs(dot(uv - point, perp));

      if(dist_to_line < 0.008) {
        float line = smoothstep(0.01, 0.0, dist_to_line);
        col += vec3(line * 0.6);
      }
    }
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.05);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Spiral Nodes",
    params: [
      { label: "Count", key: "u_p0", min: 5, max: 20, default: 15.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.5, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Spirale de nœuds
  for(int i = 0; i < 15; i++) {
    float fi = float(i);
    float angle = fi * 0.5 + t * 0.3;
    float radius = 0.3 + fi * 0.08;

    vec2 node_pos = vec2(cos(angle), sin(angle)) * radius;
    float d = length(p - node_pos);

    // Nœud
    float ring = smoothstep(0.08, 0.06, d) * smoothstep(0.06, 0.075, d);
    col += vec3(ring * 0.9);

    // Connexion avec le nœud précédent
    if(i > 0) {
      float prev_angle = (fi - 1.0) * 0.5 + t * 0.3;
      float prev_radius = 0.3 + (fi - 1.0) * 0.08;
      vec2 prev_pos = vec2(cos(prev_angle), sin(prev_angle)) * prev_radius;

      vec2 line_dir = normalize(prev_pos - node_pos);
      vec2 line_perp = vec2(-line_dir.y, line_dir.x);
      float dist_along = dot(p - node_pos, line_dir);
      float dist_to_line = abs(dot(p - node_pos, line_perp));
      float line_len = distance(node_pos, prev_pos);

      if(dist_along >= 0.0 && dist_along <= line_len && dist_to_line < 0.008) {
        float line = smoothstep(0.01, 0.0, dist_to_line);
        col += vec3(line * 0.7);
      }
    }
  }

  col *= 0.75 + 0.25 * u_level;
  col += vec3(u_bass * 0.08);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Tree Network",
    params: [
      { label: "Branches", key: "u_p0", min: 2, max: 8, default: 4.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.5, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Arbre hiérarchique de nœuds
  for(int level = 0; level < 4; level++) {
    int node_count = int(pow(2.0, float(level)));
    float y_offset = 0.8 - float(level) * 0.3;

    for(int i = 0; i < node_count; i++) {
      if(i >= 8) break;  // Limite pour perf

      float fi = float(i);
      float x = (fi + 0.5) / float(node_count) * 2.0 - 1.0;
      vec2 node_pos = vec2(x, y_offset);

      // Perturbation
      node_pos += vec2(sin(t + fi * 0.7) * 0.1, cos(t * 0.5 + fi) * 0.05);

      float d = length(p - node_pos);
      float ring = smoothstep(0.06, 0.04, d) * smoothstep(0.04, 0.055, d);
      col += vec3(ring * 0.9);

      // Connexion parent
      if(level > 0) {
        int parent = i / 2;
        float parent_x = (float(parent) + 0.5) / float(node_count / 2) * 2.0 - 1.0;
        vec2 parent_pos = vec2(parent_x, y_offset + 0.3);
        parent_pos += vec2(sin(t + float(parent) * 0.7) * 0.1, cos(t * 0.5 + float(parent)) * 0.05);

        vec2 line_dir = normalize(parent_pos - node_pos);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_along = dot(p - node_pos, line_dir);
        float dist_to_line = abs(dot(p - node_pos, line_perp));
        float line_len = distance(node_pos, parent_pos);

        if(dist_along >= 0.0 && dist_along <= line_len && dist_to_line < 0.006) {
          float line = smoothstep(0.008, 0.0, dist_to_line);
          col += vec3(line * 0.65);
        }
      }
    }
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.06);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Wave Nodes",
    params: [
      { label: "Nodes", key: "u_p0", min: 3, max: 15, default: 8.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.7, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.6;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Vagues horizontales de nœuds
  int row_count = 8;
  for(int row = 0; row < row_count; row++) {
    float y = float(row) / float(row_count) * 2.0 - 1.0;
    int nodes_in_row = 12;

    for(int i = 0; i < nodes_in_row; i++) {
      float fi = float(i);
      float x = (fi + 0.5) / float(nodes_in_row) * 2.0 - 1.0;

      // Perturbation en vague
      float wave = sin(fi * 0.5 + t * 2.0 + float(row) * 0.3) * 0.15;
      vec2 node_pos = vec2(x + wave, y);

      float d = length(p - node_pos);
      float ring = smoothstep(0.05, 0.03, d) * smoothstep(0.03, 0.048, d);
      col += vec3(ring * 0.85);

      // Connexion horizontale
      if(i > 0) {
        float prev_wave = sin((fi - 1.0) * 0.5 + t * 2.0 + float(row) * 0.3) * 0.15;
        vec2 prev_pos = vec2(x - 1.0 / float(nodes_in_row) + prev_wave, y);

        vec2 line_dir = normalize(prev_pos - node_pos);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_along = dot(p - node_pos, line_dir);
        float dist_to_line = abs(dot(p - node_pos, line_perp));

        if(dist_along >= 0.0 && dist_along <= distance(node_pos, prev_pos) && dist_to_line < 0.006) {
          float line = smoothstep(0.008, 0.0, dist_to_line);
          col += vec3(line * 0.6);
        }
      }
    }
  }

  col *= 0.75 + 0.25 * u_level;
  col += vec3(u_bass * 0.1);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Cluster Network",
    params: [
      { label: "Clusters", key: "u_p0", min: 2, max: 10, default: 5.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.6, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // 5 clusters de nœuds
  for(int cluster = 0; cluster < 5; cluster++) {
    float fc = float(cluster);
    float cluster_angle = fc * 1.25 + t * 0.2;
    float cluster_radius = 0.6;
    vec2 cluster_center = vec2(cos(cluster_angle), sin(cluster_angle)) * cluster_radius;

    // 6 nœuds par cluster
    for(int i = 0; i < 6; i++) {
      float fi = float(i);
      float angle = fi * 1.047 + t * 0.5 + fc * 2.0;
      float radius = 0.15;

      vec2 node_pos = cluster_center + vec2(cos(angle), sin(angle)) * radius;
      float d = length(p - node_pos);

      float ring = smoothstep(0.045, 0.03, d) * smoothstep(0.03, 0.042, d);
      col += vec3(ring * 0.9);

      // Connexions intra-cluster
      if(i > 0) {
        float prev_angle = (fi - 1.0) * 1.047 + t * 0.5 + fc * 2.0;
        vec2 prev_pos = cluster_center + vec2(cos(prev_angle), sin(prev_angle)) * radius;

        vec2 line_dir = normalize(prev_pos - node_pos);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_along = dot(p - node_pos, line_dir);
        float dist_to_line = abs(dot(p - node_pos, line_perp));
        float line_len = distance(node_pos, prev_pos);

        if(dist_along >= 0.0 && dist_along <= line_len && dist_to_line < 0.005) {
          float line = smoothstep(0.007, 0.0, dist_to_line);
          col += vec3(line * 0.6);
        }
      }
    }

    // Connexions inter-clusters
    if(cluster < 4) {
      float next_angle = (fc + 1.0) * 1.25 + t * 0.2;
      vec2 next_center = vec2(cos(next_angle), sin(next_angle)) * cluster_radius;

      vec2 line_dir = normalize(next_center - cluster_center);
      vec2 line_perp = vec2(-line_dir.y, line_dir.x);
      float dist_to_line = abs(dot(p - cluster_center, line_perp));
      float dist_along = dot(p - cluster_center, line_dir);
      float line_len = distance(cluster_center, next_center);

      if(dist_along >= 0.0 && dist_along <= line_len && dist_to_line < 0.004) {
        float line = smoothstep(0.006, 0.0, dist_to_line);
        col += vec3(line * 0.4);
      }
    }
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.07);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Grid Lines",
    params: [
      { label: "Grid Size", key: "u_p0", min: 2, max: 20, default: 8.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.5, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.3;
  vec2 p = uv;

  // Grille simple avec modulation animée
  float grid_size = 12.0;
  vec2 grid = abs(fract(p * grid_size) - 0.5);
  float grid_line = min(grid.x, grid.y);

  // Animation : les lignes s'épaississent et se rétrécissent
  float thickness = 0.08 + 0.04 * sin(t * 2.0);
  float line = step(grid_line, thickness);

  // Dégradé basé sur position
  float grad = uv.y * 0.5 + 0.5;
  vec3 col = vec3(line * grad);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.05);
  return col;
}`,
  },
  {
    name: "Squares Pattern",
    params: [
      { label: "Scale", key: "u_p0", min: 1, max: 20, default: 8.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.6, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = uv;

  // Carrés animés
  float square_size = 0.2;
  vec2 sq = fract(p / square_size);
  float d_to_edge = min(min(sq.x, sq.y), min(1.0 - sq.x, 1.0 - sq.y));

  float border = smoothstep(0.08, 0.02, d_to_edge);

  // Remplissage avec animation
  float fill_amount = 0.5 + 0.5 * sin(t + length(uv) * 5.0);
  float fill = step(fill_amount, 0.5 + d_to_edge);

  vec3 col = vec3(border * 0.9 + fill * 0.3);

  col *= 0.75 + 0.25 * u_level;
  col += vec3(u_bass * 0.06);
  return col;
}`,
  },
  {
    name: "Cross Pattern",
    params: [
      { label: "Density", key: "u_p0", min: 2, max: 16, default: 6.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.8, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  // Croix principal
  float h_line = abs(p.y);
  float v_line = abs(p.x);
  float cross = min(h_line, v_line);

  float thickness = 0.1 + 0.05 * sin(t * 2.0);
  float main_cross = step(cross, thickness);

  // Croix animées qui tournent
  float angle = atan(p.y, p.x) + t * 0.5;
  float radius = length(p);

  float rotated_cross = min(abs(sin(angle)), abs(cos(angle)));
  float rot_line = smoothstep(radius * 0.3, 0.0, rotated_cross - 0.15);

  vec3 col = vec3(main_cross * 0.8 + rot_line * 0.4);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.08);
  return col;
}`,
  },
  {
    name: "Hexagon Maze",
    params: [
      { label: "Scale", key: "u_p0", min: 2, max: 20, default: 8.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.6, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.3;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Grille hexagonale
  float hex_size = 0.25;
  vec2 hex_pos = uv / hex_size;

  // Offset tous les deux rangées
  if(mod(hex_pos.y, 2.0) > 1.0) {
    hex_pos.x += 0.5;
  }

  vec2 hex_center = floor(hex_pos) * hex_size;
  if(mod(floor(hex_pos).y, 2.0) > 0.5) {
    hex_center.x += hex_size * 0.5;
  }

  // Tracer hexagones
  for(int i = 0; i < 6; i++) {
    float angle = float(i) * 1.047;
    vec2 vertex = hex_center + vec2(cos(angle), sin(angle)) * hex_size * 0.3;

    float d = distance(uv, vertex);
    float ring = smoothstep(0.04, 0.01, d) * smoothstep(0.01, 0.035, d);
    col += vec3(ring * 0.8);
  }

  col *= 0.75 + 0.25 * u_level;
  col += vec3(u_bass * 0.05);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Lines Pulse",
    params: [
      { label: "Lines", key: "u_p0", min: 3, max: 20, default: 12.0, step: 1.0 },
      { label: "Pulse Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.8;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Lignes parallèles animées
  for(int i = -5; i <= 5; i++) {
    float fi = float(i);
    float line_y = p.y + sin(t + fi * 0.3) * 0.3;

    float thickness = 0.05 + 0.03 * sin(t * 2.0 + fi);
    float line = smoothstep(thickness, 0.0, abs(line_y - fi * 0.25));

    col += vec3(line * (0.6 + 0.4 * abs(sin(fi * 0.5))));
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.1);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Dots Matrix",
    params: [
      { label: "Density", key: "u_p0", min: 2, max: 20, default: 10.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = uv;

  // Matrice de points
  float dot_size = 0.08;
  vec2 dots = fract(p * 12.0);

  float d_to_center = length(dots - 0.5);
  float dot_radius = dot_size * (0.5 + 0.5 * sin(t + length(uv) * 10.0));

  float dot = smoothstep(dot_radius + 0.02, dot_radius - 0.01, d_to_center);

  // Remplissage animé
  float fill = smoothstep(dot_radius, 0.0, d_to_center);

  vec3 col = vec3(dot * 0.9 + fill * 0.4);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.07);
  return col;
}`,
  },
  {
    name: "Concentric Circles",
    params: [
      { label: "Count", key: "u_p0", min: 3, max: 20, default: 10.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.8, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  float r = length(p);

  // Cercles concentriques animés
  float circle = sin(r * 20.0 - t * 3.0) * 0.5 + 0.5;
  float line = smoothstep(0.1, 0.0, abs(circle - 0.5));

  // Modulation radiale
  float glow = exp(-r * 3.0) * 0.6;

  vec3 col = vec3(line * 0.9 + glow * 0.3);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.08);
  return col;
}`,
  },
  {
    name: "Radial Lines",
    params: [
      { label: "Lines", key: "u_p0", min: 4, max: 32, default: 16.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.8, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  float angle = atan(p.y, p.x);
  float r = length(p);

  // Lignes radiantes
  float line_count = 12.0;
  float radial = abs(sin(angle * line_count)) * smoothstep(0.01, 0.0, abs(sin(angle * line_count)) - 0.5);

  // Modulation d'épaisseur animée
  float thickness = 0.3 + 0.2 * sin(t * 2.0 + r * 5.0);
  float lines = smoothstep(thickness, thickness - 0.1, r);

  vec3 col = vec3(radial * lines * 0.85);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.07);
  return col;
}`,
  },
  {
    name: "Sine Waves",
    params: [
      { label: "Frequency", key: "u_p0", min: 1, max: 20, default: 8.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.6;
  vec2 p = uv;

  // Ondes sinusoïdales superposées
  float wave1 = sin(p.x * 8.0 - t * 2.0) * 0.3;
  float wave2 = sin(p.x * 5.0 + t * 1.5) * 0.2;
  float wave3 = cos(p.x * 3.0 - t * 0.8) * 0.1;

  float y_offset = wave1 + wave2 + wave3;

  // Dessiner les courbes
  float dist_to_wave = abs(p.y - (0.5 + y_offset));
  float line = smoothstep(0.04, 0.0, dist_to_wave);

  // Gradient basé sur X
  float grad = p.x;
  vec3 col = vec3(line * (0.5 + grad * 0.5));

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.06);
  return col;
}`,
  },
  {
    name: "Lattice Structure",
    params: [
      { label: "Scale", key: "u_p0", min: 2, max: 20, default: 8.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.5, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.3;
  vec2 p = uv;

  // Structure en treillis avec rotation
  float angle = t * 0.5;
  vec2 rot_p = vec2(
    p.x * cos(angle) - p.y * sin(angle),
    p.x * sin(angle) + p.y * cos(angle)
  );

  // Grille diagonale
  float lattice_size = 0.15;
  vec2 lattice = fract(rot_p / lattice_size);

  float h_line = smoothstep(0.05, 0.0, abs(lattice.y - 0.5));
  float v_line = smoothstep(0.05, 0.0, abs(lattice.x - 0.5));

  vec3 col = vec3((h_line + v_line) * 0.75);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.05);
  return col;
}`,
  },
  {
    name: "Voronoi Diagram",
    params: [
      { label: "Cells", key: "u_p0", min: 2, max: 20, default: 8.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.5, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = uv;

  float min_dist = 10.0;
  float edge_dist = 10.0;

  // Centres de Voronoi
  for(int i = 0; i < 9; i++) {
    float fi = float(i);
    vec2 center = vec2(
      0.3 + mod(fi, 3.0) * 0.35,
      0.3 + floor(fi / 3.0) * 0.35
    );

    // Perturbation animée
    center += vec2(sin(t + fi * 2.0), cos(t * 0.7 + fi)) * 0.05;

    float d = distance(p, center);
    if(d < min_dist) {
      edge_dist = min_dist - d;
      min_dist = d;
    }
  }

  // Dessiner les bords
  float edge = smoothstep(0.03, 0.0, min_dist);

  vec3 col = vec3(edge * 0.8);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.06);
  return col;
}`,
  },
  {
    name: "Orbits",
    params: [
      { label: "Layers", key: "u_p0", min: 3, max: 10, default: 6.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Centres orbitaux
  for(int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 center = vec2(cos(fi * 1.57), sin(fi * 1.57)) * 0.5;

    // Orbites
    for(int j = 0; j < 3; j++) {
      float fj = float(j);
      float radius = 0.2 + fj * 0.15;
      float orbit_angle = t * (2.0 - fj * 0.5) + fi * 0.5;

      vec2 planet_pos = center + vec2(cos(orbit_angle), sin(orbit_angle)) * radius;

      float d = length(p - planet_pos);
      float planet = smoothstep(0.04, 0.02, d) * smoothstep(0.02, 0.035, d);

      col += vec3(planet * 0.8);

      // Orbite tracée
      float orbit_line = smoothstep(0.01, 0.0, abs(length(p - center) - radius));
      col += vec3(orbit_line * 0.3);
    }
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.05);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Rotating Rects",
    params: [
      { label: "Count", key: "u_p0", min: 3, max: 20, default: 8.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Rectangles en rotation
  for(int i = 0; i < 6; i++) {
    float fi = float(i);
    float angle = t * (1.0 + fi * 0.2) + fi * 1.047;

    // Rotation
    vec2 rot_p = vec2(
      p.x * cos(angle) - p.y * sin(angle),
      p.x * sin(angle) + p.y * cos(angle)
    );

    // Rectangle
    float size = 0.2 + fi * 0.08;
    float rect = smoothstep(0.08, 0.05, max(abs(rot_p.x), abs(rot_p.y)) - size);

    col += vec3(rect * (0.5 + 0.5 * fi / 6.0));
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.07);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Polygon Grid",
    params: [
      { label: "Sides", key: "u_p0", min: 3, max: 12, default: 6.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.8, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.3;
  vec2 p = uv;

  vec3 col = vec3(0.0);

  // Grille de polygones
  float poly_size = 0.15;
  vec2 grid_id = floor(p / poly_size);

  for(int i = -1; i <= 1; i++) {
    for(int j = -1; j <= 1; j++) {
      vec2 cell = grid_id + vec2(float(i), float(j));
      vec2 cell_center = (cell + 0.5) * poly_size;

      // Nombre de côtés animé
      float sides = 3.0 + 2.0 * sin(t + length(cell));

      // Polygone
      for(float k = 0.0; k < 6.0; k++) {
        float angle = k * 2.0 * 3.14159 / sides + t * 0.5;
        vec2 vertex = cell_center + vec2(cos(angle), sin(angle)) * poly_size * 0.4;

        float d = distance(p, vertex);
        float ring = smoothstep(0.03, 0.01, d);
        col += vec3(ring * 0.6);
      }
    }
  }

  col *= 0.75 + 0.25 * u_level;
  col += vec3(u_bass * 0.06);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Expanding Rings",
    params: [
      { label: "Count", key: "u_p0", min: 3, max: 20, default: 10.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.8;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  float r = length(p);

  // Anneaux qui s'expandent
  float ring = mod(r - t * 0.5, 0.2);
  float line = smoothstep(0.08, 0.02, abs(ring - 0.1));

  // Modulation radiale
  float fade = exp(-r * 1.5);

  vec3 col = vec3(line * fade * 0.9);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.08);
  return col;
}`,
  },
  {
    name: "Twisted Bands",
    params: [
      { label: "Count", key: "u_p0", min: 2, max: 12, default: 6.0, step: 1.0 },
      { label: "Twist", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  // Bandes qui se tordent
  float x_twist = p.x + sin(p.y * 5.0 + t) * 0.3;
  float wave = sin(x_twist * 3.0 - t * 2.0) * 0.5 + 0.5;

  float band = smoothstep(0.3, 0.0, abs(wave - 0.5)) * smoothstep(0.3, 0.2, abs(p.y));

  vec3 col = vec3(band * (0.5 + 0.5 * wave));

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.06);
  return col;
}`,
  },
  {
    name: "Double Orbits",
    params: [
      { label: "Layers", key: "u_p0", min: 3, max: 10, default: 6.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // 2 systèmes orbitaux opposés
  for(int system = 0; system < 2; system++) {
    float fs = float(system);
    vec2 center = vec2(cos(fs * 3.14159), sin(fs * 3.14159)) * 0.4;

    // 4 orbites par système
    for(int orbit = 0; orbit < 4; orbit++) {
      float fo = float(orbit);
      float radius = 0.15 + fo * 0.12;
      float speed = 2.0 - fo * 0.3;

      // Planètes
      for(int i = 0; i < 3; i++) {
        float fi = float(i);
        float angle = t * speed + fi * 2.094 + fs * 1.57;
        vec2 planet_pos = center + vec2(cos(angle), sin(angle)) * radius;

        float d = length(p - planet_pos);
        float planet = smoothstep(0.035, 0.015, d) * smoothstep(0.015, 0.03, d);
        col += vec3(planet * (0.6 + 0.4 * fi / 3.0));

        // Orbite fine
        float orbit_line = smoothstep(0.008, 0.0, abs(length(p - center) - radius));
        col += vec3(orbit_line * 0.25);
      }
    }
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.06);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Spiral Orbits",
    params: [
      { label: "Spiral Arms", key: "u_p0", min: 1, max: 8, default: 3.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Spirale d'orbites
  for(int i = 0; i < 20; i++) {
    float fi = float(i);

    // Paramètres spiralés
    float angle = t * 0.3 + fi * 0.3;
    float radius = 0.1 + fi * 0.08;
    float spiral_offset = fi * 0.05;

    // Centre de la spirale
    vec2 center = vec2(cos(angle), sin(angle)) * spiral_offset;

    // Planète
    vec2 planet_pos = center + vec2(cos(angle * 2.0), sin(angle * 2.0)) * radius;
    float d = length(p - planet_pos);

    float planet = smoothstep(0.03, 0.01, d) * smoothstep(0.01, 0.027, d);
    float brightness = 0.3 + 0.7 * fi / 20.0;
    col += vec3(planet * brightness);

    // Orbite
    float orbit_line = smoothstep(0.005, 0.0, abs(length(p - center) - radius));
    col += vec3(orbit_line * 0.2);
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.07);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Ellipse Orbits",
    params: [
      { label: "Count", key: "u_p0", min: 3, max: 12, default: 8.0, step: 1.0 },
      { label: "Eccentricity", key: "u_p1", min: 0.1, max: 0.9, default: 0.6, step: 0.05 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // 5 orbites elliptiques
  for(int i = 0; i < 5; i++) {
    float fi = float(i);
    float eccentricity = 0.3 + fi * 0.1;  // excentricité
    float major_axis = 0.15 + fi * 0.15;
    float minor_axis = major_axis * (1.0 - eccentricity);

    // Angle et position sur ellipse
    float angle = t * (2.0 - fi * 0.2);
    vec2 ellipse_pos = vec2(
      cos(angle) * major_axis,
      sin(angle) * minor_axis
    );

    float d = length(p - ellipse_pos);
    float planet = smoothstep(0.04, 0.02, d) * smoothstep(0.02, 0.035, d);
    col += vec3(planet * (0.5 + 0.5 * fi / 5.0));

    // Dessiner l'orbite elliptique
    float orbit_sample = smoothstep(0.008, 0.0, abs(
      length(p) - length(vec2(
        cos(atan(p.y, p.x)) * major_axis,
        sin(atan(p.y, p.x)) * minor_axis
      ))
    ));
    col += vec3(orbit_sample * 0.25);
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.06);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Binary Stars",
    params: [
      { label: "Stars", key: "u_p0", min: 2, max: 8, default: 3.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Star 1
  vec2 star1_pos = vec2(-0.35, 0.0);
  float d_star1 = length(p - star1_pos);
  float star1 = smoothstep(0.06, 0.04, d_star1) * smoothstep(0.04, 0.055, d_star1);
  col += vec3(star1 * 0.9);
  col += vec3(exp(-d_star1 * 8.0) * 0.3);

  // Star 2
  vec2 star2_pos = vec2(0.35, 0.0);
  float d_star2 = length(p - star2_pos);
  float star2 = smoothstep(0.06, 0.04, d_star2) * smoothstep(0.04, 0.055, d_star2);
  col += vec3(star2 * 0.9);
  col += vec3(exp(-d_star2 * 8.0) * 0.3);

  // Orbites autour star 1
  for(int i = 0; i < 3; i++) {
    float fi = float(i);
    float radius = 0.1 + fi * 0.08;
    float angle = t * (2.5 - fi * 0.3);

    vec2 planet_pos = star1_pos + vec2(cos(angle), sin(angle)) * radius;
    float d = length(p - planet_pos);

    float planet = smoothstep(0.035, 0.015, d) * smoothstep(0.015, 0.03, d);
    col += vec3(planet * 0.7);

    float orbit_line = smoothstep(0.006, 0.0, abs(length(p - star1_pos) - radius));
    col += vec3(orbit_line * 0.2);
  }

  // Orbites autour star 2
  for(int i = 0; i < 3; i++) {
    float fi = float(i);
    float radius = 0.1 + fi * 0.08;
    float angle = t * (2.5 - fi * 0.3) + 1.047;

    vec2 planet_pos = star2_pos + vec2(cos(angle), sin(angle)) * radius;
    float d = length(p - planet_pos);

    float planet = smoothstep(0.035, 0.015, d) * smoothstep(0.015, 0.03, d);
    col += vec3(planet * 0.7);

    float orbit_line = smoothstep(0.006, 0.0, abs(length(p - star2_pos) - radius));
    col += vec3(orbit_line * 0.2);
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.07);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Orbital Chaos",
    params: [
      { label: "Chaos", key: "u_p0", min: 0, max: 1, default: 0.6, step: 0.05 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.0, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.6;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Système chaotique avec beaucoup de petites orbites
  for(int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    float layer_offset = fl * 0.3;

    for(int i = 0; i < 8; i++) {
      float fi = float(i);
      float angle1 = fi * 0.785 + t * (1.5 + fl * 0.5);
      float radius1 = 0.2 + fl * 0.15;

      vec2 center = vec2(cos(angle1), sin(angle1)) * radius1;

      // Sous-orbites
      for(int j = 0; j < 2; j++) {
        float fj = float(j);
        float angle2 = t * (3.0 + fj) + fi * 0.5;
        float radius2 = 0.08 + fj * 0.06;

        vec2 planet_pos = center + vec2(cos(angle2), sin(angle2)) * radius2;
        float d = length(p - planet_pos);

        float planet = smoothstep(0.02, 0.008, d);
        col += vec3(planet * (0.4 + 0.6 * fj));
      }
    }
  }

  col *= 0.75 + 0.25 * u_level;
  col += vec3(u_bass * 0.08);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Orbital Trail",
    params: [
      { label: "Planets", key: "u_p0", min: 3, max: 8, default: 5.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.5, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p1 * (0.6 + u_bass * 2.0);
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Centre - pulsates with bass
  vec2 center = vec2(0.0);
  float d_center = length(p - center);
  float sun_size = 0.07 + u_bass * 0.02;
  float sun = smoothstep(sun_size + 0.01, sun_size - 0.01, d_center);
  col += vec3(sun * (0.7 + 0.3 * u_bass));

  // Planètes avec trails
  int planet_count = int(u_p0);
  for(int i = 0; i < 8; i++) {
    if(i >= planet_count) break;
    float fi = float(i);
    float radius = 0.15 + fi * (0.15 * (0.8 + 0.4 * u_mid));
    float speed = (2.0 - fi * 0.3) * (0.8 + 0.4 * u_treble);
    float angle = t * speed;

    vec2 planet_pos = center + vec2(cos(angle), sin(angle)) * radius;

    // Trail (trace antérieure)
    for(float trail = 0.0; trail < 1.0; trail += 0.1) {
      float trail_angle = angle - trail * 0.5;
      vec2 trail_pos = center + vec2(cos(trail_angle), sin(trail_angle)) * radius;

      float d_trail = length(p - trail_pos);
      float trail_dot = smoothstep(0.02, 0.0, d_trail);
      col += vec3(trail_dot * (1.0 - trail) * (0.2 + 0.2 * u_bass));
    }

    // Planète actuelle
    float d = length(p - planet_pos);
    float planet_size = 0.03 + u_mid * 0.02;
    float planet = smoothstep(planet_size + 0.01, planet_size - 0.01, d);
    col += vec3(planet * (0.6 + 0.4 * u_bass));

    // Orbite
    float orbit_line = smoothstep(0.007 * (0.8 + 0.4 * u_bass), 0.0, abs(length(p - center) - radius));
    col += vec3(orbit_line * (0.15 + 0.15 * u_bass));
  }

  col *= 0.5 + 0.8 * u_level;
  col += vec3(u_bass * 0.15 + u_treble * 0.05);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Tentacle Spheres",
    params: [
      { label: "Spheres", key: "u_p0", min: 3, max: 12, default: 8.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.6, step: 0.1 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p1 * (0.7 + u_bass * 1.5);
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Dynamically sized sphere array
  vec2 nodes[12];
  float sizes[12];
  int sphere_count = int(u_p0);

  for(int i = 0; i < 12; i++) {
    if(i >= sphere_count) break;
    float fi = float(i);

    // Positions très aléatoires basées sur du hash
    float h1 = hash(vec2(fi, 0.0));
    float h2 = hash(vec2(fi, 1.0));
    float h3 = hash(vec2(fi, 2.0));

    // Mouvement brownien : dérive progressive avec du sin/cos chaotique
    vec2 base = vec2(h1 * 2.0 - 1.0, h2 * 2.0 - 1.0) * 0.9;
    float drift_x = sin(t * (0.3 + u_mid) + fi * 2.3) * sin(t * (0.2 + u_treble) + fi) * (0.2 + u_bass * 0.2);
    float drift_y = cos(t * (0.25 + u_bass) + fi * 1.7) * cos(t * (0.15 + u_mid) + fi * 0.5) * (0.2 + u_bass * 0.2);

    nodes[i] = base + vec2(drift_x, drift_y);
    sizes[i] = (0.04 + h3 * 0.05) * (0.8 + 0.4 * u_bass);
  }

  // Dessiner les nœuds (vides, juste le contour)
  for(int i = 0; i < 12; i++) {
    if(i >= sphere_count) break;
    float d = length(p - nodes[i]);
    // Juste le ring du nœud, pas rempli
    float ring = smoothstep(sizes[i] + 0.008, sizes[i] - 0.002, d) * smoothstep(sizes[i] - 0.008, sizes[i], d);
    col += vec3(ring * (0.7 + 0.3 * u_bass));

    // Lignes vers les autres sphères proches
    for(int j = i + 1; j < 12; j++) {
      if(j >= sphere_count) break;
      vec2 target = nodes[j];
      vec2 start = nodes[i];
      float dist_to_target = distance(start, target);

      // Connection distance affected by bass
      float connection_dist = 1.5 * (0.8 + 0.4 * u_mid);
      if(dist_to_target > connection_dist) continue;

      // Tracer une ligne simple
      vec2 line_dir = normalize(target - start);
      vec2 line_perp = vec2(-line_dir.y, line_dir.x);

      float dist_along_line = dot(p - start, line_dir);
      float dist_to_line = abs(dot(p - start, line_perp));

      // Vérifier qu'on est entre les deux points
      if(dist_along_line >= 0.0 && dist_along_line <= dist_to_target) {
        if(dist_to_line < 0.008 * (0.8 + 0.4 * u_bass)) {
          float line = smoothstep(0.01, 0.0, dist_to_line);
          float brightness = 0.3 + 0.7 * (0.5 + 0.5 * sin(dist_along_line * 5.0 + float(i) * 0.5 + u_treble));
          col += vec3(line * brightness * (0.5 + 0.5 * u_bass));
        }
      }
    }
  }

  // Fond affected by bass
  float bg = 0.01 * (0.3 + 0.5 * sin(t * (0.1 + u_bass)) + 0.2 * u_mid);
  col += vec3(bg);

  // Audio reactivity très marquée
  col *= 0.5 + 0.8 * u_level;
  col += vec3(u_bass * 0.2 + u_treble * 0.08);

  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Void Vortex",
    params: [
      { label: "Spin", key: "u_p0", min: 0, max: 2, default: 1.2, step: 0.1 },
      { label: "Event Horizon", key: "u_p1", min: 0.1, max: 0.8, default: 0.3, step: 0.05 },
    ],
    category: "Interactive",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0) * 2.0;
  float t = u_time * u_p0;
  float r = length(p);
  float a = atan(p.y, p.x) + t * 0.5;

  // Event horizon (inner void)
  float horizon = u_p1 + u_level * 0.15;
  float inside_horizon = smoothstep(horizon + 0.02, horizon - 0.02, r);

  // Spiral distortion
  float spiral = sin(a * 3.0 - t + r * 8.0) * 0.5 + 0.5;
  float accretion = smoothstep(0.1, 0.6, r) * (1.0 - smoothstep(horizon, 0.0, r));

  // Deep void center
  vec3 col = mix(vec3(0.02, 0.0, 0.05), vec3(0.15, 0.05, 0.3), spiral * accretion);

  // Accretion disk glow
  float disk = smoothstep(horizon + 0.15, horizon + 0.05, r) *
               smoothstep(horizon - 0.05, horizon - 0.15, r);
  col += vec3(0.8, 0.2, 0.6) * disk * (0.6 + u_mid * 0.8);

  // Event horizon ring
  float ring = smoothstep(horizon + 0.01, horizon - 0.01, r);
  col += vec3(0.9, 0.4, 0.8) * ring * 0.5;

  col *= 0.5 + 0.5 * u_level;
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Singularity Core",
    params: [
      { label: "Collapse", key: "u_p0", min: 0, max: 1, default: 0.5, step: 0.05 },
      { label: "Density", key: "u_p1", min: 1, max: 10, default: 5.0, step: 0.5 },
    ],
    category: "Interactive",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time;

  float r = length(p);
  float collapse = mix(0.1, 0.02, u_p0);
  float density = u_p1;

  // Particle field collapsing toward center
  float particles = 0.0;
  for(float i = 0.0; i < 5.0; i++) {
    float seed = hash(vec2(i, 0.0));
    float orbital_r = 0.5 + seed * 0.3;
    float angle = t * (1.0 - seed) + seed * 6.28;
    vec2 particle_pos = vec2(cos(angle), sin(angle)) * orbital_r;

    // Pull toward center based on collapse parameter
    particle_pos *= mix(1.0, collapse * 10.0, u_p0);

    float d = length(p - particle_pos);
    float particle = exp(-d * d * density * 10.0);
    particles += particle * (0.3 + u_mid * 0.4);
  }

  // Core energy
  float core = exp(-r * r * density * 20.0);

  vec3 col = mix(vec3(0.01, 0.02, 0.04), vec3(0.6, 0.2, 0.9), core);
  col += vec3(0.9, 0.3, 0.7) * particles;
  col += vec3(1.0, 0.5, 0.2) * smoothstep(0.08, 0.02, r) * (0.4 + u_treble);

  col *= 0.6 + 0.4 * u_level;
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Quantum Mesh",
    params: [
      { label: "Scale", key: "u_p0", min: 2, max: 20, default: 8.0, step: 1.0 },
      { label: "Breakdown", key: "u_p1", min: 0, max: 1, default: 0.3, step: 0.05 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * (0.2 + u_bass * 1.2);

  float scale = u_p0 * (0.8 + 0.4 * u_mid);
  float breakdown = u_p1 + u_bass * 0.3;

  // Crystalline lattice
  vec2 gp = p * scale;
  vec2 id = floor(gp);
  vec2 frac = fract(gp);

  // Grid lines - thickness affected by bass
  float grid_thickness = 0.04 * (0.7 + 0.6 * u_bass);
  float grid = smoothstep(grid_thickness, 0.0, min(frac.x, 1.0 - frac.x)) +
               smoothstep(grid_thickness, 0.0, min(frac.y, 1.0 - frac.y));

  // Lattice nodes - size pulsates with bass
  float node_size = 0.06 * (0.8 + 0.4 * u_mid);
  float nodes = smoothstep(node_size, node_size * 0.3, length(frac - 0.5));

  // Breakdown effect: corrupt grid based on parameter and time
  float corruption = hash(id + sin(t + u_treble));
  float breakdown_fade = smoothstep(0.3, 0.7, breakdown + corruption * (0.2 + u_bass));

  grid *= breakdown_fade * (0.6 + 0.4 * u_bass);
  nodes *= breakdown_fade * (0.6 + 0.4 * u_bass);

  // Oscillating energy at nodes - faster with bass
  float energy = sin(length(id) * (2.0 + u_treble) + t) * 0.5 + 0.5;

  vec3 col = vec3(0.0);
  col += vec3(0.1, 0.4 + u_bass * 0.2, 0.8) * grid * (0.3 + 0.3 * u_bass);
  col += vec3(0.3, 0.8, 1.0 + u_treble * 0.2) * nodes * energy * (0.6 + 0.4 * u_bass);

  // Glitch artifacts from breakdown
  col += vec3(0.8, 0.2 + u_bass * 0.3, 0.5) * smoothstep(1.0, 0.7, breakdown_fade) * (0.2 + 0.2 * u_mid);

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.2 + u_treble * 0.1);
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Entropic Decay",
    params: [
      { label: "Decay Rate", key: "u_p0", min: 0, max: 1, default: 0.4, step: 0.05 },
      { label: "Particles", key: "u_p1", min: 1, max: 20, default: 8.0, step: 1.0 },
    ],
    category: "Noise",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * (0.5 + u_bass * 2.0);
  float decay = u_p0 + u_bass * 0.2;

  vec3 col = vec3(0.0);

  // Multiple decaying particles dissolving outward
  int particle_count = int(u_p1 * (0.8 + 0.4 * u_mid));
  for(float i = 0.0; i < 20.0; i++) {
    if(i >= float(particle_count)) break;
    float seed = hash(vec2(i, 0.0));
    float life = mod(t * (0.5 + seed + u_treble) + seed, 2.0); // 0..2, cycles
    float expansion = life * life * (0.8 + decay * 3.0 + u_bass * 0.5);

    // Birth angle
    float birth_angle = seed * 6.28 + u_treble * 0.5;
    vec2 particle_center = vec2(cos(birth_angle), sin(birth_angle)) * (0.2 + u_mid * 0.2);

    float d = length(p - particle_center) / expansion;

    // Dissolving cloud
    float cloud = exp(-d * d * (8.0 + u_bass * 4.0)) * (1.0 - life * 0.5);

    // Color based on life stage - affected by bass
    vec3 particle_col = mix(vec3(1.0, 0.6 + u_bass * 0.2, 0.2), vec3(0.3, 0.1, 0.2 + u_treble * 0.2), life);
    col += particle_col * cloud * (0.2 + 0.2 * u_bass);
  }

  // Background entropy
  float entropy = hash(p * 20.0 + floor(t * 5.0));
  col += vec3(0.05, 0.02, 0.08) * entropy * 0.2;

  col *= 0.6 + 0.4 * u_level;
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Orbital Collapse",
    params: [
      { label: "Collapse Speed", key: "u_p0", min: 0, max: 2, default: 0.8, step: 0.1 },
      { label: "Orbits", key: "u_p1", min: 2, max: 12, default: 6.0, step: 1.0 },
    ],
    category: "Interactive",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p0;

  vec3 col = vec3(0.01, 0.01, 0.03);

  // Multiple rings collapsing inward
  for(float i = 0.0; i < u_p1; i++) {
    float fi = i / u_p1;
    float delay = fi;

    // Orbit radius shrinking over time
    float max_radius = 0.7 - fi * 0.3;
    float collapse_time = mod(t - delay * 2.0, 3.0);
    float radius = mix(max_radius, 0.02, collapse_time / 3.0);

    // Draw ring
    float r = length(p);
    float ring_width = 0.03 + (1.0 - collapse_time / 3.0) * 0.05;
    float ring = smoothstep(radius + ring_width, radius - ring_width, r) *
                 smoothstep(radius - ring_width, radius + ring_width, r);

    // Color gradient
    float hue = fi + t * 0.2;
    vec3 ring_col = mix(vec3(0.2, 0.5, 1.0), vec3(0.9, 0.3, 0.6), sin(hue * 3.14) * 0.5 + 0.5);

    col += ring_col * ring * (0.4 + collapse_time * 0.3 + u_mid * 0.3);
  }

  // Center flash on collapse
  float center_flash = smoothstep(0.1, 0.0, length(p)) * sin(t * 8.0) * 0.5 + 0.5;
  col += vec3(1.0, 0.7, 0.3) * center_flash * 0.3;

  col *= 0.6 + 0.4 * u_level;
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Chrono Warp",
    params: [
      { label: "Warp Strength", key: "u_p0", min: 0, max: 2, default: 1.0, step: 0.1 },
      { label: "Frequency", key: "u_p1", min: 1, max: 10, default: 4.0, step: 0.5 },
    ],
    category: "Plasma",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time;

  // Time distortion field
  float warp_strength = u_p0;
  float freq = u_p1;

  // Concentric time waves
  float r = length(p);
  float angle = atan(p.y, p.x);

  // Distorted time field
  float time_wave = sin(r * freq - t) * 0.5 + 0.5;
  float time_dist = sin(angle * 3.0 + t * 2.0) * 0.5 + 0.5;

  // Sample positions distorted by time
  vec2 warp_offset = vec2(
    sin(time_dist * 3.14 + t) * r * warp_strength * 0.3,
    cos(time_dist * 3.14 + t * 0.7) * r * warp_strength * 0.3
  );

  vec2 warped_p = p + warp_offset;
  float warped_r = length(warped_p);

  // Temporal layers
  float layer1 = sin(warped_r * 8.0 - t * 2.0);
  float layer2 = cos(warped_r * 5.0 - t);
  float layer3 = sin(warped_r * 3.0 - t * 0.5);

  float pattern = layer1 * layer2 * layer3 * 0.5 + 0.5;

  vec3 col = mix(vec3(0.02, 0.05, 0.15), vec3(0.4, 0.2, 0.8), pattern);
  col += vec3(0.3, 0.7, 1.0) * time_wave * 0.3;

  // Time distortion artifact
  col += vec3(1.0, 0.3, 0.8) * smoothstep(0.1, 0.0, abs(warped_r - 0.3)) * 0.4;

  col *= 0.6 + 0.4 * u_level;
  return clamp(col, vec3(0.0), vec3(1.0));
}`,
  },
  {
    name: "Dark Matter Flow",
    params: [
      { label: "Orbits", key: "u_p0", min: 3, max: 10, default: 5.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.6, step: 0.1 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p1 * (0.8 + 0.4 * u_bass);
  vec3 col = vec3(0.0);

  // Concentric orbital rings - wireframe style
  for(float i = 1.0; i <= u_p0; i++) {
    float orbit_r = i * 0.12 * (1.0 + u_bass * 0.3);
    float ring_thickness = 0.006 * (0.8 + u_mid * 0.4);
    float ring = smoothstep(ring_thickness, 0.0, abs(length(p) - orbit_r));
    col += vec3(ring * 0.8);

    // Radial spokes connecting through orbits
    float angle = atan(p.y, p.x) + u_treble * 0.3;
    float num_spokes = 4.0 + i;
    float spoke = sin(angle * num_spokes) * 0.5 + 0.5;
    float spoke_line = smoothstep(0.4, 0.0, spoke);
    float r = length(p);
    if(r > orbit_r - 0.015 && r < orbit_r + 0.015) {
      col += vec3(spoke_line * (0.4 + 0.6 * u_mid));
    }
  }

  // Center node - pulses with bass
  float center_d = length(p);
  float center_pulse = 0.02 + u_bass * 0.01;
  float center_ring = smoothstep(center_pulse + 0.008, center_pulse - 0.008, center_d);
  col += vec3(center_ring * (0.5 + 0.5 * u_bass));

  col *= 0.5 + 0.8 * u_level;
  col += vec3(u_bass * 0.2);
  return col;
}`,
  },
  {
    name: "Disintegration",
    params: [
      { label: "Speed", key: "u_p0", min: 0, max: 2, default: 0.8, step: 0.1 },
      { label: "Fragments", key: "u_p1", min: 2, max: 20, default: 10.0, step: 1.0 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p0 * (0.5 + u_bass * 2.0);
  vec3 col = vec3(0.0);

  // Exploding wireframe fragments
  float frag_count = u_p1 * (0.8 + 0.4 * u_mid);
  for(float i = 0.0; i < 50.0; i++) {
    if(i >= frag_count) break;

    float seed = hash(vec2(i, 0.0));
    float delay = seed * (1.0 - u_bass * 0.5);
    float life = mod(t - delay, 2.5 + u_treble);

    // Fragment direction from center
    vec2 dir = vec2(cos(seed * 6.28 + u_treble), sin(seed * 6.28 + u_treble));
    float distance = life * life * (0.3 + u_bass * 0.2);
    vec2 frag_pos = dir * distance;

    // Fragment as wireframe ring
    float d = length(p - frag_pos);
    float frag_size = 0.04 * (1.0 - life / 2.5);
    float ring = smoothstep(frag_size + 0.004, frag_size - 0.004, d);
    ring *= (1.0 - life / 2.5) * (0.5 + 0.5 * u_mid);

    col += vec3(ring * 0.8);
  }

  col *= 0.4 + 0.9 * u_level;
  col += vec3(u_bass * 0.15);
  return col;
}`,
  },

  {
    name: "Orbital Mesh",
    params: [
      { label: "Grid Rings", key: "u_p0", min: 3, max: 12, default: 6.0, step: 1.0 },
      { label: "Rotation", key: "u_p1", min: 0, max: 2, default: 0.6, step: 0.1 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p1 * (0.8 + 0.4 * u_bass);
  float r = length(p);
  float angle = atan(p.y, p.x) + t + u_treble * 0.5;

  vec3 col = vec3(0.0);

  // Wireframe concentric rings with radial spokes
  for(float i = 1.0; i <= u_p0; i++) {
    float ring_r = i * 0.12 * (1.0 + u_mid * 0.2);

    // Ring - thin wireframe line only, thickness affected by bass
    float ring_thickness = 0.005 * (0.7 + 0.6 * u_bass);
    float ring = smoothstep(ring_thickness, 0.0, abs(r - ring_r));
    col += vec3(ring * (0.6 + 0.4 * u_mid));

    // Radial lines/spokes
    float spoke_count = 6.0 + i * 0.5 + u_treble * 2.0;
    float spoke = sin(angle * spoke_count) * 0.5 + 0.5;
    float spoke_line = smoothstep(0.4, 0.0, spoke);

    // Only draw spokes at ring radius
    if(r > ring_r - 0.01 && r < ring_r + 0.01) {
      col += vec3(spoke_line * (0.4 + 0.6 * u_bass));
    }
  }

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.15 + u_mid * 0.1);
  return col;
}`,
  },

  {
    name: "Tentacle Network",
    params: [
      { label: "Arms", key: "u_p0", min: 3, max: 12, default: 6.0, step: 1.0 },
      { label: "Frequency", key: "u_p1", min: 0, max: 2, default: 0.8, step: 0.1 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p1 * (0.5 + u_bass * 2.0);
  vec3 col = vec3(0.0);

  // Wireframe tentacles radiating from center
  for(float i = 0.0; i < u_p0; i++) {
    float fi = i / u_p0;
    float base_angle = fi * 6.28 + u_treble * 0.5;
    float seed = hash(vec2(fi, 0.0));

    // Wireframe segments along each arm
    for(float seg = 0.0; seg < 1.0; seg += 0.08) {
      float wave = sin(seg * 6.0 + t) * (0.08 + u_mid * 0.15);
      float seg_length = seg * (0.4 + u_bass * 0.2);
      vec2 seg_pos = vec2(cos(base_angle + wave), sin(base_angle + wave)) * seg_length;

      // Draw each segment as small ring
      float d = length(p - seg_pos);
      float seg_size = 0.02 * (0.8 + 0.4 * u_mid);
      float segment = smoothstep(seg_size + 0.003, seg_size - 0.003, d);

      col += vec3(segment * (0.6 + 0.4 * u_bass));
    }

    // Connect segments with line
    for(float seg = 0.0; seg < 0.9; seg += 0.08) {
      float wave1 = sin(seg * 6.0 + t) * (0.08 + u_mid * 0.15);
      float wave2 = sin((seg + 0.08) * 6.0 + t) * (0.08 + u_mid * 0.15);

      vec2 pos1 = vec2(cos(base_angle + wave1), sin(base_angle + wave1)) * (seg * (0.4 + u_bass * 0.2));
      vec2 pos2 = vec2(cos(base_angle + wave2), sin(base_angle + wave2)) * ((seg + 0.08) * (0.4 + u_bass * 0.2));

      // Draw line between segments
      vec2 line_dir = normalize(pos2 - pos1);
      vec2 line_perp = vec2(-line_dir.y, line_dir.x);
      float dist_to_line = abs(dot(p - pos1, line_perp));
      float line = smoothstep(0.004, 0.0, dist_to_line);

      col += vec3(line * (0.3 + 0.7 * u_bass));
    }
  }

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.2);
  return col;
}`,
  },

  {
    name: "Particle Swarm",
    params: [
      { label: "Particles", key: "u_p0", min: 5, max: 20, default: 12.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.7, step: 0.1 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p1 * (0.7 + u_bass * 1.5);
  vec3 col = vec3(0.0);

  // Wireframe particles with connecting lines
  vec2 particle_pos[20];
  for(float i = 0.0; i < u_p0; i++) {
    float fi = i / u_p0;
    float seed = hash(vec2(fi, 0.0));
    float seed2 = hash(vec2(fi, 1.0));

    // Orbiting particle positions
    float orbit_r = (0.1 + seed * 0.25) * (1.0 + u_mid * 0.3);
    float orbit_angle = t * (1.0 - seed2 * 0.5) + fi * 6.28 + u_treble;
    particle_pos[int(i)] = vec2(cos(orbit_angle), sin(orbit_angle)) * orbit_r;

    // Draw particle as wireframe ring
    float d = length(p - particle_pos[int(i)]);
    float particle_size = 0.025 * (0.8 + 0.4 * u_mid);
    float ring = smoothstep(particle_size + 0.004, particle_size - 0.004, d);
    col += vec3(ring * (0.6 + 0.4 * u_bass));
  }

  // Connect nearby particles with wireframe lines
  for(float i = 0.0; i < u_p0; i++) {
    for(float j = i + 1.0; j < u_p0; j++) {
      vec2 pos1 = particle_pos[int(i)];
      vec2 pos2 = particle_pos[int(j)];
      float dist = length(pos2 - pos1);

      // Only draw lines for nearby particles
      if(dist < 0.3 && dist > 0.01) {
        vec2 line_dir = normalize(pos2 - pos1);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_to_line = abs(dot(p - pos1, line_perp));
        float along_line = dot(p - pos1, line_dir);

        if(along_line > 0.0 && along_line < dist) {
          float line = smoothstep(0.004, 0.0, dist_to_line);
          col += vec3(line * (0.3 + 0.7 * u_bass));
        }
      }
    }
  }

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.15 + u_mid * 0.1);
  return col;
}`,
  },

  {
    name: "Minimal Node Grid",
    params: [
      { label: "Grid Size", key: "u_p0", min: 3, max: 12, default: 6.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.5, step: 0.1 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0) * 2.0;
  float t = u_time * u_p1 * (0.6 + u_bass * 1.8);
  float grid_size = u_p0;
  vec3 col = vec3(0.0);

  // Wireframe grid nodes
  float step_size = 2.0 / grid_size;
  for(float x = -grid_size; x < grid_size; x++) {
    for(float y = -grid_size; y < grid_size; y++) {
      vec2 node_pos = vec2(x, y) * step_size;
      float d = length(p - node_pos);

      // Node as small wireframe ring - pulsates with bass
      float node_size = 0.03 * (0.8 + 0.4 * u_bass);
      float node = smoothstep(node_size + 0.004, node_size - 0.004, d);
      col += vec3(node * (0.6 + 0.4 * u_mid));

      // Horizontal and vertical connections
      if(x < grid_size - 1.0) {
        vec2 next_pos = vec2(x + 1.0, y) * step_size;
        vec2 line_dir = normalize(next_pos - node_pos);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_to_line = abs(dot(p - node_pos, line_perp));
        float along = dot(p - node_pos, line_dir);
        if(along > 0.0 && along < step_size && dist_to_line < 0.004) {
          col += vec3(0.4 + 0.6 * u_bass);
        }
      }

      if(y < grid_size - 1.0) {
        vec2 next_pos = vec2(x, y + 1.0) * step_size;
        vec2 line_dir = normalize(next_pos - node_pos);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_to_line = abs(dot(p - node_pos, line_perp));
        float along = dot(p - node_pos, line_dir);
        if(along > 0.0 && along < step_size && dist_to_line < 0.004) {
          col += vec3(0.4 + 0.6 * u_bass);
        }
      }
    }
  }

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.2 + u_treble * 0.05);
  return col;
}`,
  },

  {
    name: "Pulsing Network",
    params: [
      { label: "Nodes", key: "u_p0", min: 4, max: 20, default: 10.0, step: 1.0 },
      { label: "Pulse Speed", key: "u_p1", min: 0, max: 1, default: 0.7, step: 0.1 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p1 * (1.0 + u_bass * 2.0);
  vec3 col = vec3(0.0);

  // Wireframe network with pulsing nodes
  vec2 node_pos[25];
  float node_pulse[25];

  for(float i = 0.0; i < min(u_p0, 25.0); i++) {
    float seed_x = hash(vec2(i, 0.0));
    float seed_y = hash(vec2(i, 1.0));

    // Random node positions
    node_pos[int(i)] = (vec2(seed_x, seed_y) - 0.5) * 1.8;

    // Pulsing animation - faster with bass
    node_pulse[int(i)] = 0.5 + 0.5 * sin(t * (2.0 + u_mid) + i * 0.5);

    // Draw pulsing wireframe ring
    float d = length(p - node_pos[int(i)]);
    float size = 0.03 * (0.7 + 0.6 * node_pulse[int(i)] + u_bass * 0.2);
    float ring = smoothstep(size + 0.004, size - 0.004, d);
    col += vec3(ring * (0.5 + 0.5 * node_pulse[int(i)]));
  }

  // Connect nearby nodes with wireframe lines
  for(float i = 0.0; i < min(u_p0, 25.0); i++) {
    for(float j = i + 1.0; j < min(u_p0, 25.0); j++) {
      vec2 pos1 = node_pos[int(i)];
      vec2 pos2 = node_pos[int(j)];
      float dist = length(pos2 - pos1);

      // Only connect reasonably close nodes
      if(dist < 0.5 && dist > 0.01) {
        vec2 line_dir = normalize(pos2 - pos1);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_to_line = abs(dot(p - pos1, line_perp));
        float along_line = dot(p - pos1, line_dir);

        if(along_line > 0.0 && along_line < dist && dist_to_line < 0.004) {
          float line_brightness = 0.4 + 0.6 * (node_pulse[int(i)] + node_pulse[int(j)]) / 2.0;
          col += vec3(line_brightness * (0.4 + 0.6 * u_bass));
        }
      }
    }
  }

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.2 + u_treble * 0.08);
  return col;
}`,
  },

  {
    name: "Minimal Segments",
    params: [
      { label: "Segments", key: "u_p0", min: 5, max: 20, default: 12.0, step: 1.0 },
      { label: "Speed", key: "u_p1", min: 0, max: 1, default: 0.4, step: 0.05 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p1 * (0.8 + u_bass * 1.5);
  vec3 col = vec3(0.0);

  // Radiating wireframe segments
  for(float i = 0.0; i < u_p0; i++) {
    float fi = i / u_p0;
    float angle = t + fi * 6.28 + u_treble * 0.3;
    vec2 dir = vec2(cos(angle), sin(angle));

    // Segment length with wave modulation
    float wave = sin(fi * 8.0 + t) * (0.08 + u_mid * 0.15);
    float seg_length = (0.25 + u_bass * 0.15) + wave;

    // Segment tip
    vec2 tip = dir * seg_length;

    // Draw segment as line from center to tip
    vec2 line_dir = dir;
    vec2 line_perp = vec2(-line_dir.y, line_dir.x);

    float dist_to_line = abs(dot(p - vec2(0.0), line_perp));
    float along_line = dot(p - vec2(0.0), line_dir);

    if(along_line > 0.0 && along_line < seg_length && dist_to_line < 0.004 * (0.7 + 0.6 * u_bass)) {
      col += vec3(0.6 + 0.4 * u_bass);
    }

    // Draw endpoint as small ring
    float d_tip = length(p - tip);
    float endpoint_size = 0.02 * (0.8 + 0.4 * u_mid);
    float endpoint = smoothstep(endpoint_size + 0.003, endpoint_size - 0.003, d_tip);
    col += vec3(endpoint * (0.6 + 0.4 * u_bass));
  }

  // Center ring - pulses with bass
  float center_d = length(p);
  float center_pulse = 0.02 + u_bass * 0.008;
  float center_ring = smoothstep(center_pulse + 0.01, center_pulse - 0.01, center_d);
  col += vec3(center_ring * (0.5 + 0.5 * u_bass));

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.15 + u_mid * 0.08);
  return col;
}`,
  },

  {
    name: "Sine Wave Cascade",
    params: [
      { label: "Frequency", key: "u_p0", min: 1, max: 20, default: 8, step: 1 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1, step: 0.1 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p1;
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 col = vec3(0.0);

  // Horizontal cascading sine waves
  for(float i = 0.0; i < 12.0; i++) {
    float y_offset = (i / 12.0) - 0.5;
    float wave = sin(p.x * u_p0 + t + i * 0.3) * 0.08;
    float d = abs(p.y - (y_offset + wave));
    float line = smoothstep(0.008, 0.002, d);
    col += vec3(line * (0.7 + 0.3 * u_bass));
  }

  col *= 0.5 + 0.5 * u_level;
  col += u_mid * 0.1;
  return col;
}`,
  },

  {
    name: "Triangle Oscillator",
    params: [
      { label: "Frequency", key: "u_p0", min: 2, max: 20, default: 6, step: 1 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.8, step: 0.1 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p1;
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 col = vec3(0.0);

  // Triangle wave oscillators - create zigzag pattern
  float wave_val = abs(mod(p.x * u_p0 + t, 2.0) - 1.0) * 2.0 - 1.0;
  wave_val = wave_val * wave_val * 2.0 - 1.0; // Triangle approximation

  float modulation = sin(p.y * 8.0 + t * 0.5) * 0.05;
  float d = abs(p.y - (wave_val * 0.15 + modulation));

  float line = smoothstep(0.01, 0.002, d);
  col += vec3(line * (0.8 + 0.2 * u_bass));

  // Verticals at peaks
  for(float i = -2.0; i < 3.0; i++) {
    float x_peak = i / u_p0 + t * 0.2;
    float d_peak = abs(p.x - x_peak);
    float vert = smoothstep(0.006, 0.001, d_peak) * (0.5 + 0.3 * u_mid);
    col += vec3(vert);
  }

  col *= 0.5 + 0.6 * u_level;
  return col;
}`,
  },

  {
    name: "Sawtooth Sweep",
    params: [
      { label: "Frequency", key: "u_p0", min: 3, max: 20, default: 10, step: 1 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 1.2, step: 0.1 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p1;
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 col = vec3(0.0);

  // Sawtooth wave - linear rise and sharp fall
  for(float band = 0.0; band < 8.0; band++) {
    float y_center = (band / 8.0) - 0.5;

    // Sawtooth: modulo creates the repeating ramp
    float x_phase = p.x * u_p0 + t + band * 0.2;
    float saw_wave = mod(x_phase, 1.0) - 0.5; // -0.5 to 0.5

    float wave_y = saw_wave * 0.12;
    float d = abs(p.y - (y_center + wave_y));
    float line = smoothstep(0.007, 0.002, d);

    col += vec3(line * (0.6 + 0.4 * u_bass));
  }

  col *= 0.5 + 0.7 * u_level;
  col += u_treble * 0.15;
  return col;
}`,
  },

  {
    name: "Orbital Harmonics",
    params: [
      { label: "Harmonics", key: "u_p0", min: 2, max: 8, default: 4, step: 1 },
      { label: "Speed", key: "u_p1", min: 0, max: 2, default: 0.5, step: 0.1 },
    ],
    category: "Geometry",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p1;
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 col = vec3(0.0);

  // Multiple orbital harmonics - concentric sine waves
  for(float harmonic = 1.0; harmonic <= u_p0; harmonic++) {
    float r = length(p);

    // Orbital pattern
    float angle = atan(p.y, p.x);

    // Harmonic sine wave in radial direction
    float wave = sin(r * 20.0 * harmonic - t * 2.0 + angle * harmonic) * (0.5 + 0.5 * u_level);

    // Ring radius for this harmonic
    float ring_r = 0.1 + harmonic * 0.12;
    float ring_width = 0.015;

    // Modulate with sine wave
    float modulated_r = ring_r + wave * 0.03;
    float d = abs(r - modulated_r);

    float ring = smoothstep(ring_width, 0.0, d);
    col += vec3(ring * (0.5 + 0.3 * u_bass + 0.2 * sin(harmonic + t)));
  }

  col *= 0.6 + 0.4 * u_level;
  col += u_mid * 0.08;
  return col;
}`,
  },

  {
    name: "Nightcall Mountains",
    params: [
      { label: "Speed", key: "u_p0", min: 0.5, max: 3, default: 1.5, step: 0.1 },
      { label: "Intensity", key: "u_p1", min: 0.5, max: 2, default: 1.0, step: 0.1 },
    ],
    category: "Geometry",
    src: /* glsl */ `
// Distance from point to line segment
float distLine(vec2 p, vec2 a, vec2 b) {
  vec2 d = b - a;
  float t = clamp(dot(p - a, d) / dot(d, d), 0.0, 1.0);
  return length(p - a - t * d);
}

// Pseudo-random
float h11(float x) { return fract(sin(x * 12.9898) * 43758.5453); }

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p0;

  // Centered coords with aspect ratio
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // === SKY GRADIENT: violet bas → jaune autour soleil ===
  float skyT = clamp((p.y + 0.2) * 0.7, 0.0, 1.0);
  col = mix(vec3(0.45, 0.05, 0.55), vec3(0.25, 0.0, 0.45), skyT);

  // === SUN (background, with glow) ===
  vec2 sunPos = vec2(0.0, 0.1);
  float sunD = length(p - sunPos);

  // Outer halo: yellow → violet
  float outerGlow = exp(-sunD * sunD * 1.8);
  col = mix(col, vec3(1.0, 0.85, 0.3), outerGlow * 0.65);

  // Sun body
  float sunR = 0.22;
  float sunBody = smoothstep(sunR, sunR - 0.004, sunD);
  vec3 sunCol = mix(vec3(1.0, 0.95, 0.5), vec3(1.0, 0.55, 0.15), sunD / sunR);
  col = mix(col, sunCol, sunBody);

  // Sun bright core
  col += vec3(1.0, 1.0, 0.7) * exp(-sunD * sunD * 25.0) * 0.5;

  // === 3D FLOOR GRID (true perspective, rotated 20°) ===
  if (p.y < 0.0) {
    float ch = 0.35; // camera height
    float fz = -ch / p.y; // distance along floor
    float fx = p.x * fz / ch; // world x

    // Animate forward motion
    fz += t * 4.0;

    // Rotate grid by 20°
    float ang = radians(20.0);
    float ca = cos(ang), sa = sin(ang);
    vec2 g = vec2(fx * ca - fz * sa, fx * sa + fz * ca);

    // Grid distance
    vec2 gd = abs(fract(g + 0.5) - 0.5);

    // Adaptive thickness (constant in screen space)
    float thick = 0.035;
    float lineX = smoothstep(thick, 0.0, gd.x * fz * 0.4);
    float lineY = smoothstep(thick, 0.0, gd.y * fz * 0.4);
    float line = max(lineX, lineY);

    // Glow effect (wider falloff)
    float glowX = exp(-gd.x * gd.x * fz * fz * 50.0);
    float glowY = exp(-gd.y * gd.y * fz * fz * 50.0);
    float glow = max(glowX, glowY);

    // Floor base (dark with violet tint)
    vec3 floorBase = mix(vec3(0.04, 0.0, 0.08), vec3(0.15, 0.02, 0.2), -p.y);

    // Grid color: blue near, violet far
    vec3 gridCol = mix(vec3(0.2, 0.7, 1.0), vec3(0.8, 0.3, 1.0), clamp(fz * 0.05, 0.0, 1.0));

    // Compose floor
    col = mix(floorBase, gridCol * 1.8, line * u_p1);
    col += gridCol * glow * 0.4 * u_p1;

    // Fade into horizon
    float horizonFade = smoothstep(0.0, -0.05, p.y);
    col = mix(mix(vec3(0.45, 0.05, 0.55), col, 0.5), col, horizonFade);
  }

  // === WIREFRAME MOUNTAINS (3D pyramids, animated forward) ===
  float wireThick = 0.004;
  float mtnWire = 0.0;
  float mtnGlow = 0.0;
  float ch = 0.35;

  // 32 mountains, hexagonal base, hidden-face wireframe
  vec3 cam = vec3(0.0, ch, 0.0);
  for (int i = 0; i < 32; i++) {
    float fi = float(i);
    float side = (fi < 16.0) ? -1.0 : 1.0;
    float idx = mod(fi, 16.0);

    float r1 = h11(fi * 1.7);
    float r2 = h11(fi * 3.3);
    float r3 = h11(fi * 5.9);
    float r4 = h11(fi * 7.1);
    float r5 = h11(fi * 11.3);
    float r6 = h11(fi * 17.5);
    float r7 = h11(fi * 19.7);

    // World base center: more random spread (across X and Z offset)
    float wx = side * (0.55 + idx * 0.2 + r1 * 0.5 + r6 * 0.3);
    float r_base = 0.25 + r2 * 0.3;          // wider range 0.25..0.55
    float mh = 0.35 + r3 * 0.55;             // taller mountains possible
    float apexSkewX = (r4 - 0.5) * r_base * 0.6;
    float apexSkewY = (r5 - 0.5) * mh * 0.2;

    // Animated Z with random per-mountain offset for more chaos
    float wzCycle = 22.0;
    float wzInit = 1.0 + idx * 2.5 + r1 * 2.0 + r7 * 1.5;
    float wz = mod(wzInit - t * 3.5, wzCycle) + 0.7;
    if (wz < 0.4 || wz > 18.0) continue;  // Skip too close & too far

    // Also random Z offset perpendicular to camera direction
    wx += (r6 - 0.5) * 0.3 * wz * 0.2;  // perspective wiggle

    // === EARLY-OUT: bounding box check in screen space ===
    // Approximate screen bounds: center around projected base, radius accordingly
    vec2 sCenter = vec2(wx, -ch) / wz;
    float screenRadius = (r_base + mh) / wz * 1.5;
    if (length(p - sCenter) > screenRadius) continue;

    // === Build 6-sided base (vertices on floor, varying radius) ===
    vec3 apexW = vec3(wx + apexSkewX, mh + apexSkewY, wz);
    vec3 V0, V1, V2, V3, V4, V5;
    {
      float a0 = 0.0,         a1 = 1.0472,    a2 = 2.0944;
      float a3 = 3.14159,     a4 = 4.18879,   a5 = 5.23599;
      float ra0 = r_base * (0.6 + h11(fi + 0.11) * 0.8);
      float ra1 = r_base * (0.6 + h11(fi + 0.23) * 0.8);
      float ra2 = r_base * (0.6 + h11(fi + 0.37) * 0.8);
      float ra3 = r_base * (0.6 + h11(fi + 0.49) * 0.8);
      float ra4 = r_base * (0.6 + h11(fi + 0.61) * 0.8);
      float ra5 = r_base * (0.6 + h11(fi + 0.73) * 0.8);

      V0 = vec3(wx + cos(a0) * ra0, 0.0, wz + sin(a0) * ra0);
      V1 = vec3(wx + cos(a1) * ra1, 0.0, wz + sin(a1) * ra1);
      V2 = vec3(wx + cos(a2) * ra2, 0.0, wz + sin(a2) * ra2);
      V3 = vec3(wx + cos(a3) * ra3, 0.0, wz + sin(a3) * ra3);
      V4 = vec3(wx + cos(a4) * ra4, 0.0, wz + sin(a4) * ra4);
      V5 = vec3(wx + cos(a5) * ra5, 0.0, wz + sin(a5) * ra5);
    }

    // === MULTIPLE PEAKS for jagged mountain ridge ===
    // Main apex + 2 sub-peaks at varying heights (creates multi-summit relief)
    vec3 apex2W = vec3(
      wx + (h11(fi + 0.91) - 0.5) * r_base * 1.6,
      mh * (0.55 + h11(fi + 0.97) * 0.3),
      wz + (h11(fi + 0.83) - 0.5) * r_base * 1.0
    );
    vec3 apex3W = vec3(
      wx + (h11(fi + 0.41) - 0.5) * r_base * 1.6,
      mh * (0.4 + h11(fi + 0.59) * 0.3),
      wz + (h11(fi + 0.71) - 0.5) * r_base * 1.0
    );

    // === FACE VISIBILITY (hidden-face culling, INVERTED test) ===
    // Face i = triangle (apex, V_{i+1}, V_i) -> outward normal via cross(V_{i+1}-a, V_i-a)
    bool vis0, vis1, vis2, vis3, vis4, vis5;
    {
      vec3 a = apexW;
      // Outward normal: cross(V_{i+1}-a, V_i-a) (reversed winding)
      vec3 n0 = cross(V1 - a, V0 - a); vec3 c0 = (a + V0 + V1) / 3.0; vis0 = dot(n0, c0 - cam) < 0.0;
      vec3 n1 = cross(V2 - a, V1 - a); vec3 c1 = (a + V1 + V2) / 3.0; vis1 = dot(n1, c1 - cam) < 0.0;
      vec3 n2 = cross(V3 - a, V2 - a); vec3 c2 = (a + V2 + V3) / 3.0; vis2 = dot(n2, c2 - cam) < 0.0;
      vec3 n3 = cross(V4 - a, V3 - a); vec3 c3 = (a + V3 + V4) / 3.0; vis3 = dot(n3, c3 - cam) < 0.0;
      vec3 n4 = cross(V5 - a, V4 - a); vec3 c4 = (a + V4 + V5) / 3.0; vis4 = dot(n4, c4 - cam) < 0.0;
      vec3 n5 = cross(V0 - a, V5 - a); vec3 c5 = (a + V5 + V0) / 3.0; vis5 = dot(n5, c5 - cam) < 0.0;
    }

    // Secondary peaks visibility
    bool vis2peak = (apex2W - cam).z > 0.5;
    bool vis3peak = (apex3W - cam).z > 0.5;

    // === Project all vertices to screen ===
    vec2 sApex = vec2(apexW.x, apexW.y - ch) / apexW.z;
    vec2 sApex2 = vec2(apex2W.x, apex2W.y - ch) / apex2W.z;
    vec2 sApex3 = vec2(apex3W.x, apex3W.y - ch) / apex3W.z;
    vec2 sV0 = vec2(V0.x, V0.y - ch) / V0.z;
    vec2 sV1 = vec2(V1.x, V1.y - ch) / V1.z;
    vec2 sV2 = vec2(V2.x, V2.y - ch) / V2.z;
    vec2 sV3 = vec2(V3.x, V3.y - ch) / V3.z;
    vec2 sV4 = vec2(V4.x, V4.y - ch) / V4.z;
    vec2 sV5 = vec2(V5.x, V5.y - ch) / V5.z;

    // === EDGE VISIBILITY: edge visible if any adjacent face is visible ===
    // Ridge i (apex-Vi) shared between face_{i-1} and face_i
    // Base edge i (Vi-V{i+1}) belongs only to face_i
    float md = 1e10;

    // Ridge edges (apex to vertex)
    if (vis5 || vis0) md = min(md, distLine(p, sApex, sV0));
    if (vis0 || vis1) md = min(md, distLine(p, sApex, sV1));
    if (vis1 || vis2) md = min(md, distLine(p, sApex, sV2));
    if (vis2 || vis3) md = min(md, distLine(p, sApex, sV3));
    if (vis3 || vis4) md = min(md, distLine(p, sApex, sV4));
    if (vis4 || vis5) md = min(md, distLine(p, sApex, sV5));

    // Base edges
    if (vis0) md = min(md, distLine(p, sV0, sV1));
    if (vis1) md = min(md, distLine(p, sV1, sV2));
    if (vis2) md = min(md, distLine(p, sV2, sV3));
    if (vis3) md = min(md, distLine(p, sV3, sV4));
    if (vis4) md = min(md, distLine(p, sV4, sV5));
    if (vis5) md = min(md, distLine(p, sV5, sV0));

    // Secondary peak edges (sub-summits creating jagged ridge)
    if (vis2peak) {
      md = min(md, distLine(p, sApex2, sApex));   // ridge to main apex
      if (vis0 || vis5) md = min(md, distLine(p, sApex2, sV0));
      if (vis1 || vis0) md = min(md, distLine(p, sApex2, sV1));
      if (vis5 || vis4) md = min(md, distLine(p, sApex2, sV5));
    }
    // Third peak edges
    if (vis3peak) {
      md = min(md, distLine(p, sApex3, sApex));
      md = min(md, distLine(p, sApex3, sApex2));  // peak-to-peak ridge
      if (vis2 || vis1) md = min(md, distLine(p, sApex3, sV2));
      if (vis3 || vis2) md = min(md, distLine(p, sApex3, sV3));
      if (vis4 || vis3) md = min(md, distLine(p, sApex3, sV4));
    }

    // === CONTOUR RINGS on visible faces (skip for distant mountains) ===
    if (wz < 8.0) {
      int ringMax = (wz < 4.0) ? 3 : 2; // fewer rings on medium-far mountains
      for (int ring = 1; ring <= 3; ring++) {
        if (ring > ringMax) break;
        float rt = float(ring) / 4.0;
        vec2 r0 = mix(sV0, sApex, rt);
        vec2 r1v = mix(sV1, sApex, rt);
        vec2 r2v = mix(sV2, sApex, rt);
        vec2 r3v = mix(sV3, sApex, rt);
        vec2 r4v = mix(sV4, sApex, rt);
        vec2 r5v = mix(sV5, sApex, rt);

        if (vis0) md = min(md, distLine(p, r0, r1v));
        if (vis1) md = min(md, distLine(p, r1v, r2v));
        if (vis2) md = min(md, distLine(p, r2v, r3v));
        if (vis3) md = min(md, distLine(p, r3v, r4v));
        if (vis4) md = min(md, distLine(p, r4v, r5v));
        if (vis5) md = min(md, distLine(p, r5v, r0));
      }
    }

    // Wireframe & glow, with distance fade
    float w = smoothstep(wireThick * 1.5, 0.0, md);
    float g = exp(-md * md * 500.0);
    float fade = clamp(1.5 - wz * 0.08, 0.15, 1.0);
    fade *= smoothstep(0.5, 1.5, wz); // fade in when appearing

    mtnWire = max(mtnWire, w * fade);
    mtnGlow = max(mtnGlow, g * fade * 0.45);
  }

  // Apply mountains: cyan/blue wireframe with violet glow
  vec3 wireCol = vec3(0.3, 0.9, 1.0);
  vec3 glowCol = vec3(0.5, 0.4, 1.0);
  col += wireCol * mtnWire * 1.2 * u_p1;
  col += glowCol * mtnGlow * u_p1;

  return col;
}`,
  },
];
