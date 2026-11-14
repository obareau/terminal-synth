/*{
  "name": "Crosshatch Burn",
  "id": "CHB",
  "defaultSensitivity": 0.7,
  "defaultDurationMs": 120,
  "defaultCooldownMs": 600
}*/

vec3 process(vec2 uv) {
  float t    = u_time;
  float a    = u_amount;
  float xh   = max(sin(uv.x * 24.0 + t * 2.0), sin(uv.y * 24.0 - t * 1.5));
  float mask = step(1.0 - a * 0.35, xh);
  vec3  c    = prev(uv);
  float lum  = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(c, vec3(lum * 2.0, lum * 0.3, 0.0) * a, mask);
}
