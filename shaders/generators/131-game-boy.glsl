/*{
  "name": "Game Boy",
  "category": "Lofi"
}*/
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  // 160×144 Game Boy resolution
  vec2 p = floor(uv * vec2(160.0, 144.0)) / vec2(160.0, 144.0);
  vec2 c = p - 0.5;
  // Bouncing squares pattern
  float d1 = max(abs(c.x + sin(t * 0.7) * 0.3), abs(c.y + cos(t * 0.5) * 0.25));
  float d2 = max(abs(c.x - sin(t * 0.5 + 1.0) * 0.2), abs(c.y - cos(t * 0.6) * 0.2));
  float d3 = length(c - vec2(sin(t * 0.9) * 0.3, cos(t * 0.8) * 0.3));
  float v = sin(d1 * 20.0 - t * 2.0 + u_bass * 4.0) * 0.5 + 0.5;
  v = mix(v, sin(d2 * 18.0 - t * 1.5) * 0.5 + 0.5, 0.4);
  v = mix(v, sin(d3 * 25.0 - t) * 0.5 + 0.5, u_mid * 0.4);
  // Game Boy 4-shade green palette
  vec3 c0 = vec3(0.608, 0.737, 0.059); // lightest
  vec3 c1 = vec3(0.475, 0.631, 0.067);
  vec3 c2 = vec3(0.188, 0.392, 0.188);
  vec3 c3 = vec3(0.063, 0.235, 0.063); // darkest
  float idx = floor(v * 4.0) / 3.0;
  vec3 col = mix(mix(c0, c1, step(0.33, idx)), mix(c2, c3, step(0.67, idx)), step(0.33, idx));
  return col;
}
