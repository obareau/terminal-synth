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
];
