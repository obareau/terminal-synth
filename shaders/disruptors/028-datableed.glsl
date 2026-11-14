/*{
  "name": "Datableed",
  "id": "DBL",
  "defaultSensitivity": 0.6,
  "defaultDurationMs": 140,
  "defaultCooldownMs": 350
}*/

vec3 process(vec2 uv) {
  float t     = u_time;
  float a     = u_amount;
  float row   = floor(uv.y * 72.0);
  float bleed = max(0.0, hash(vec2(row, floor(t * 14.0))) - 0.25) * a * 0.3;
  vec3  c     = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    c += prev(clamp(uv - vec2(bleed * fi * 0.4, 0.0), 0.0, 1.0)) * (1.0 - fi * 0.1);
  }
  return c / 4.5;
}
