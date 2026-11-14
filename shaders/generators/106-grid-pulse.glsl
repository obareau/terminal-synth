/*{
  "name": "GRID PULSE",
  "category": "Industrial"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(res.x/res.y, 1.0) * 20.0 + vec2(u_time * 0.3, 0.0);
  vec2 g = abs(fract(p) - 0.5);
  float line = smoothstep(0.48, 0.50, max(g.x, g.y));
  float thick = 1.0 - smoothstep(0.40 - u_bass * 0.15, 0.50, max(g.x, g.y));
  float v = max(line * 0.3, thick * (0.6 + u_bass * 0.4));
  return vec3(v);
}
