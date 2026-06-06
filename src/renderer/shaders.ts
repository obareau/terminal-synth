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
];
