/**
 * Shaders intégrés. Chacun fournit une fonction GLSL ES 3.00 :
 *   vec3 render(vec2 uv, vec2 res)
 * Le moteur (gl.ts) ajoute l'en-tête (uniforms) et le main().
 *
 * Uniforms disponibles : u_time, u_resolution, u_bass, u_mid, u_treble, u_level (0..1).
 */

export interface Shader {
  name: string;
  src: string;
}

export const SHADERS: Shader[] = [
  {
    name: "RECTA (texte)",
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * 0.3;
  float warp = 0.6 + u_bass * 1.6;
  float v = sin(p.x * 6.0 * warp + t)
          + sin(p.y * 6.0 - t * 1.3)
          + sin((p.x + p.y) * 5.0 + t * 0.7);
  v += sin(length(p) * 10.0 - t * 2.0) * (0.5 + u_mid);
  float g = 0.5 + 0.5 * sin(v + t);
  vec3 col = mix(vec3(0.02, 0.05, 0.07), vec3(0.9, 0.45, 0.10), g); // teal sombre -> orange
  float grain = fract(sin(dot(uv * res, vec2(12.9898, 78.233)) + t) * 43758.5453);
  col += u_treble * 0.3 * grain;
  return col * (0.55 + u_level * 0.9);
}`,
  },
  {
    name: "Tunnel",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float speed = 0.5 + u_level * 2.5;
  float z = 0.2 / max(r, 1e-3) + u_time * speed;
  float rings = 0.5 + 0.5 * sin(z * 8.0 + u_bass * 6.0);
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float v = fftAt(uv.x);                          // hauteur de la barre (0..1)
  float bar = step(uv.y, v);                       // rempli sous la valeur
  vec3 col = mix(vec3(0.0, 0.04, 0.03), vec3(0.10, 0.90, 0.40), bar);
  col += vec3(0.9, 0.3, 0.05) * smoothstep(0.012, 0.0, abs(uv.y - v)); // crête chaude
  // séparation des barres
  col *= 0.4 + 0.6 * step(0.12, fract(uv.x * 96.0));
  return col;
}`,
  },
  {
    name: "Waveform",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float w = waveAt(uv.x);                          // 0..1, 0.5 = zéro
  float d = abs(uv.y - w);
  float line = smoothstep(0.02, 0.0, d);
  vec3 col = vec3(0.0, 0.02, 0.04) + vec3(0.10, 0.70, 0.90) * line;
  col += vec3(0.10, 0.70, 0.90) * 0.15 * smoothstep(0.12, 0.0, d); // halo
  return col;
}`,
  },
  {
    name: "Matrix rain",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  float speed = 0.7 + u_bass * 2.5;

  float cols = 56.0;
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(res.x / res.y, 1.0);
  float scale = 18.0;
  vec2 g = fract(p * scale);
  float line = 1.0 - smoothstep(0.0, 0.04, g.x) * smoothstep(0.0, 0.04, g.y);
  float scan = 0.5 + 0.5 * sin(uv.y * res.y * 0.7 - u_time * 8.0);
  float pulse = 0.3 + u_mid * 1.0;
  vec3 base = vec3(0.0, 0.03, 0.02);
  vec3 grid = vec3(0.1, 0.9, 0.4) * line * pulse * (0.6 + 0.4 * scan); // grille verte
  grid += vec3(0.9) * line * u_bass * 0.5;                            // flash sur le kick
  return base + grid;
}`,
  },
  // ── Batch 4 ───────────────────────────────────────────────────────────────

  {
    name: "Topographie",
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
  vec2  p = uv * vec2(res.x/res.y,1.0) * 3.0 + u_time * 0.07;
  float h = tp_h(p + u_bass * 0.4);
  float n = (8.0 + u_mid * 6.0);
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = floor(u_time * 9.0);
  float bright = 0.0;
  for (int b = 0; b < 3; b++) {
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
    src: /* glsl */ `
float mb_n(vec2 p) {
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
vec3 render(vec2 uv, vec2 res) {
  vec2  p = uv * vec2(res.x/res.y,1.0) * 3.0;
  float t = u_time * 0.18;
  float turb=0.0, a=1.0; vec2 q=p+t;
  for(int i=0;i<4;i++){turb+=a*mb_n(q);q=q*2.0+vec2(1.7,9.2);a*=0.5;}
  float v = sin((p.x+p.y)*3.0 + turb*4.0*(1.0+u_bass) + t)*0.5+0.5;
  vec3 col = mix(vec3(0.02,0.02,0.04), vec3(0.05,0.6,0.88), pow(v,2.0));
  col = mix(col, vec3(0.9,0.4,0.04), pow(v,8.0)*(0.4+u_mid*0.8));
  col = mix(col, vec3(1.0,0.95,0.8), pow(v,18.0)*u_level);
  return col*(0.6+u_level*0.5);
}`,
  },
  // ── Batch 3 ───────────────────────────────────────────────────────────────

  {
    name: "Lissajous",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0) * 2.1;
  float scale = 0.8 + u_level * 0.35;
  // XY scope : deux demi-waveforms en X et Y
  float wx = (waveAt(uv.x * 0.5) * 2.0 - 1.0) * scale;
  float wy = (waveAt(uv.y * 0.5 + 0.5) * 2.0 - 1.0) * scale;
  float dx = abs(p.y - wx), dy = abs(p.x - wy);
  float lx = smoothstep(0.022, 0.0, dx) + exp(-dx * 38.0) * 0.45;
  float ly = smoothstep(0.022, 0.0, dy) + exp(-dy * 38.0) * 0.45;
  float cross = lx * ly;
  vec3 col = vec3(0.0, 0.62, 0.28) * max(lx, ly) * (0.4 + u_level * 0.8);
  col += vec3(1.0, 1.0, 0.45) * cross * 5.0;
  return col;
}`,
  },
  {
    name: "Aurora",
    src: /* glsl */ `
float aur_n(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.28;
  float w1 = aur_n(vec2(uv.x * 3.0 + t,        t * 0.5 )) * 0.50;
  float w2 = aur_n(vec2(uv.x * 6.0 - t * 0.7,  t * 0.3 )) * 0.25;
  float curtain = 0.44 + w1 + w2 + u_bass * 0.14;
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = u_time;
  float turns = 6.0 + u_mid * 4.0;
  float sv = r * turns - (a + PI) / TWO_PI + t * (0.4 + u_bass * 1.0);
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float scale = 8.0 + u_mid * 4.0;
  vec2 p  = uv * vec2(res.x/res.y, 1.0) * scale;
  float t = u_time;
  vec2 id = floor(p), fr = fract(p) - 0.5;
  float sd  = hash(id), sd2 = hash(id + vec2(31.7, 17.3));
  float hz = step(0.5, sd), vt = 1.0 - hz;
  float lineH = smoothstep(0.04,0.0,abs(fr.y)) * step(abs(fr.x),0.49) * hz;
  float lineV = smoothstep(0.04,0.0,abs(fr.x)) * step(abs(fr.y),0.49) * vt;
  float via   = smoothstep(0.12, 0.06, length(fr));
  float speed = 1.5 + u_bass * 2.5;
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = u_time;
  float sphere = smoothstep(0.35 + u_bass * 0.08, 0.30, r);
  vec2 sp = vec2(a / TWO_PI + 0.5, r / 0.35);
  float plasma = sin(sp.x * 8.0 + t * 2.0 + u_bass * 4.0)
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  float tx = fract(uv.x + t * (0.35 + u_level * 0.25)) - 0.5;
  // QRS complex ECG
  float sig  = exp(-abs(tx + 0.05) * 80.0) * -0.30;
  sig += exp(-abs(tx)        * 40.0) * ( 0.80 + u_bass * 0.55);
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float asp = res.x / res.y;
  vec2 p = uv * vec2(asp, 1.0);
  float t = u_time;
  float bright = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 n1 = vec2(hash(vec2(fi, 10.0)) * asp, 0.08 + hash(vec2(fi, 20.0)) * 0.84);
    float pulse = 0.5 + 0.5 * sin(t * (0.7 + hash(vec2(fi, 30.0)) * 1.2) + fi * 0.9);
    // noeud
    bright += 0.012 / (length(p - n1) + 0.02) * pulse * (0.4 + u_level * 0.8);
    // axones vers 2 voisins
    for (int jj = 1; jj <= 2; jj++) {
      float fj = mod(fi + float(jj) * 2.0 + 1.0, 7.0);
      vec2 n2  = vec2(hash(vec2(fj, 10.0)) * asp, 0.08 + hash(vec2(fj, 20.0)) * 0.84);
      vec2 ab  = n2 - n1;
      float s  = clamp(dot(p - n1, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
      float dl = length(p - (n1 + ab * s));
      float sig = sin(t * 3.5 - s * 9.0 + fi * 2.3) * 0.5 + 0.5;
      bright += 0.003 / (dl + 0.007) * sig * pulse * (0.25 + u_bass * 0.55);
    }
  }
  float v = min(bright, 1.5);
  return mix(vec3(0.0, 0.55, 0.25), vec3(0.5, 0.95, 0.35), smoothstep(0.0, 1.0, v * 0.7)) * v;
}`,
  },
  {
    name: "Vortex",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = u_time;
  float twist  = a - (1.0 / max(r, 0.05)) * 0.25 - t * (0.5 + u_bass * 1.5);
  float spiral = sin(twist * 5.0 + r * 8.0);
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float r = length(p);
  float t = u_time;
  float bright = 0.0;
  for (int i = 0; i < 5; i++) {
    float ring = mod(t * (0.28 + u_bass * 0.45) - float(i) * 0.22, 1.1);
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
  vec2 p = uv * vec2(res.x/res.y, 1.0);
  float t = u_time * 0.22;
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p  = uv * vec2(res.x/res.y, 1.0) * (8.0 + u_mid * 6.0);
  float t = u_time;
  vec2 r = vec2(1.0, 1.732), h = r * 0.5;
  vec2 a = mod(p,   r) - h;
  vec2 b = mod(p+h, r) - h;
  vec2 gv = dot(a,a) < dot(b,b) ? a : b; // offset depuis centre hex
  vec2 id = round(p - gv);               // ID cellule
  float dEdge = 0.5 - max(abs(gv.x)*0.866025 + abs(gv.y)*0.5, abs(gv.y));
  float ch = hash(id * 0.1731);
  float pulse = (0.5 + 0.5*sin(t*(0.3+ch*0.5)+ch*TWO_PI)) * (0.2+u_bass*1.0);
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float w  = waveAt(uv.x);
  float d  = abs(uv.y - w);
  float line  = smoothstep(0.018, 0.0, d);
  float glow  = exp(-d * 55.0) * 0.45;
  float ghost = exp(-abs(uv.y - (1.0 - w)) * 100.0) * 0.09; // réflexion fantôme
  float ity = (line + glow + ghost) * (0.4 + u_level * 0.9);
  // grille phosphore
  float gx = smoothstep(0.006, 0.0, mod(uv.x, 0.1) - 0.095);
  float gy = smoothstep(0.006, 0.0, mod(uv.y, 0.125) - 0.120);
  vec3 col = mix(vec3(0.0, 0.55, 0.2), vec3(0.75, 1.0, 0.85), line);
  return col * ity + vec3(0.0, 0.09, 0.03) * (gx + gy);
}`,
  },
  {
    name: "Cellules",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 st  = uv * vec2(res.x / res.y, 1.0) * (5.0 + u_bass * 7.0);
  vec2 id  = floor(st);
  vec2 fr  = fract(st);
  float t  = u_time;
  float minD = 9.0, minD2 = 9.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 nb   = vec2(i, j);
    vec2 seed = id + nb;
    float spd = 0.18 + hash(seed) * 0.28;
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 z = (uv - 0.5) * 3.4 * vec2(res.x / res.y, 1.0);
  float t = u_time * 0.12;
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
  float v = fract(si / 9.0 + u_time * 0.04);
  // palette dark : bleu nuit → cyan → orange brûlé → jaune
  vec3 col = mix(vec3(0.0, 0.04, 0.18), vec3(0.05, 0.65, 0.85), smoothstep(0.0, 0.5, v));
  col = mix(col, vec3(0.92, 0.40, 0.04), smoothstep(0.5, 0.8, v));
  col = mix(col, vec3(0.98, 0.92, 0.50), smoothstep(0.8, 1.0, v));
  return col * (0.5 + u_level * 0.7);
}`,
  },
  {
    name: "Radar",
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0) * 2.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = u_time * (0.4 + u_bass * 1.4);
  // balayage rotatif
  float scan = mod(t, TWO_PI) - PI;
  float da   = mod(a - scan + TWO_PI, TWO_PI);
  float sweep = exp(-da * 2.2) * step(r, 0.96) * step(0.015, r);
  // structure HUD : cercles + axes
  float rings = smoothstep(0.013, 0.0, mod(r, 0.25) - 0.234);
  float axes  = smoothstep(0.005, 0.0, min(abs(p.x), abs(p.y)));
  // blips persistants pseudo-aléatoires
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
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time;
  vec2 s1 = vec2( 0.30 * cos(t * 0.30),        0.20 * sin(t * 0.38));
  vec2 s2 = vec2(-0.26 * sin(t * 0.33 + 1.0),  0.27 * cos(t * 0.24));
  vec2 s3 = vec2( 0.12 * cos(t * 0.47 + 2.0), -0.23 * sin(t * 0.42 + 1.5));
  float f  = 22.0 + u_bass * 16.0;
  float w1 = sin(length(p - s1) * f           - t * 5.0);
  float w2 = sin(length(p - s2) * (f * 1.07)  + t * 4.3);
  float w3 = sin(length(p - s3) * (f * 0.94)  - t * 3.8) * (0.4 + u_mid * 0.8);
  float v  = (w1 + w2 + w3) / 3.0 * 0.5 + 0.5;
  vec3 col = mix(vec3(0.0, 0.01, 0.02), vec3(0.02, 0.38, 0.28), v);
  col = mix(col, vec3(0.95, 0.44, 0.04), pow(v, 7.0) * (0.4 + u_bass * 0.8));
  return col;
}`,
  },
];
