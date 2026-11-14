/*{
  "name": "Scanline Burn",
  "id": "SLB",
  "defaultSensitivity": 0.63,
  "defaultDurationMs": 110,
  "defaultCooldownMs": 450
}*/

vec3 process(vec2 uv) {
  float t    = u_time;
  float a    = u_amount;
  float scl  = sin(uv.y * u_resolution.y * 0.5 + t * 2.0) * 0.5 + 0.5;
  float burn = 1.0 + scl * a * 1.8;
  float shift = (scl - 0.5) * a * 0.012;
  vec3  c    = prev(clamp(uv + vec2(shift, 0.0), 0.0, 1.0));
  return clamp(c * burn, 0.0, 1.0);
}
