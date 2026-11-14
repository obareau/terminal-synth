/*{
  "name": "Pixel Plasma",
  "category": "Lofi"
}*/
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.8;
  // Hard pixel grid — 64×48 resolution
  vec2 pixel = floor(uv * vec2(64.0, 48.0)) / vec2(64.0, 48.0);
  vec2 p = pixel - 0.5;
  // Classic plasma
  float v  = sin(p.x * 8.0 + t);
  v += sin(p.y * 6.0 + t * 1.1);
  v += sin((p.x + p.y) * 7.0 + t * 0.9);
  v += sin(length(p) * 12.0 - t * 1.5 + u_bass * 3.0);
  v = v * 0.25 + 0.5;
  // Restricted 4-color palette (CGA-style)
  float idx = floor(v * 4.0);
  vec3 c0 = vec3(0.0, 0.0, 0.0);
  vec3 c1 = vec3(0.0, 0.67, 0.67);
  vec3 c2 = vec3(0.67, 0.0, 0.67);
  vec3 c3 = vec3(0.67, 0.67, 0.67);
  vec3 col = idx < 1.0 ? c0 : idx < 2.0 ? c1 : idx < 3.0 ? c2 : c3;
  // Audio flash to white
  col = mix(col, vec3(1.0), step(0.9, u_bass) * 0.4);
  return col;
}
