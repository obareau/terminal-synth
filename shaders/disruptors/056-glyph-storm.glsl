/*{
  "name": "Glyph Storm",
  "id": "GLS",
  "defaultSensitivity": 0.6,
  "defaultDurationMs": 130,
  "defaultCooldownMs": 350
}*/

vec3 process(vec2 uv) {
  float t = u_time, a = u_amount;
  vec2 grid = vec2(80.0, 45.0);
  vec2 cell = floor(uv * grid);
  vec2 cuv = fract(uv * grid) - 0.5;
  float seed = hash(cell + floor(t * 24.0));
  vec3 c = prev(uv);
  if (seed > 0.78) {
    vec2 d = abs(cuv);
    float h = 1.0 - smoothstep(0.08, 0.12, d.y);
    float v = 1.0 - smoothstep(0.08, 0.12, d.x);
    float glyph = max(h, v) * (1.0 - smoothstep(0.32, 0.38, max(d.x, d.y)));
    c = mix(c, vec3(glyph), a * 0.85);
  }
  return c;
}
