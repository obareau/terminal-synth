/*{
  "name": "Digital Echo",
  "id": "DGE",
  "defaultSensitivity": 0.56,
  "defaultDurationMs": 170,
  "defaultCooldownMs": 500
}*/

vec3 process(vec2 uv) {
  float a     = u_amount;
  float t     = u_time;
  float phase = fract(t * 4.0);
  vec3  c     = prev(uv);
  vec2  e1    = uv + vec2(0.02,  0.01) * a * step(0.3, phase);
  vec2  e2    = uv + vec2(-0.03,-0.01) * a * step(0.6, phase);
  c += prev(clamp(e1, 0.0, 1.0)) * 0.4 * a;
  c += prev(clamp(e2, 0.0, 1.0)) * 0.25 * a;
  return clamp(c, 0.0, 1.0);
}
