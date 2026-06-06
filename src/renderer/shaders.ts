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
  // ── Nouveaux générateurs ──────────────────────────────────────────────────

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
