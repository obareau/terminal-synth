/*{
  "name": "Heat Shimmer",
  "id": "HSM",
  "defaultSensitivity": 0.52,
  "defaultDurationMs": 180,
  "defaultCooldownMs": 400
}*/

vec3 process(vec2 uv) {
  float t    = u_time;
  float a    = u_amount;
  float heat = sin(uv.x * 24.0 + t * 3.0) * cos(uv.x * 11.0 - t * 1.7);
  float rise = sin((1.0 - uv.y) * 18.0 + t * 5.0 + uv.x * 4.0);
  vec2  d    = vec2(heat * 0.018, rise * 0.022) * a;
  return prev(clamp(uv + d, 0.0, 1.0));
}
