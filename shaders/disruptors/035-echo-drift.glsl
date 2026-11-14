/*{
  "name": "Echo Drift",
  "id": "ECD",
  "defaultSensitivity": 0.55,
  "defaultDurationMs": 160,
  "defaultCooldownMs": 500
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2  d = vec2(sin(t * 2.3) * 0.06, cos(t * 1.7) * 0.04) * a;
  vec3  c = prev(uv);
  vec3  g = fb(clamp(uv + d, 0.0, 1.0));
  return clamp(c + g * 0.6 * a, 0.0, 1.0);
}
