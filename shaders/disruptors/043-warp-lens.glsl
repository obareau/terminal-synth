/*{
  "name": "Warp Lens",
  "id": "WRL",
  "defaultSensitivity": 0.75,
  "defaultDurationMs": 90,
  "defaultCooldownMs": 600
}*/

vec3 process(vec2 uv) {
  float a    = u_amount;
  vec2  d    = uv - 0.5;
  float r    = length(d);
  float warp = 1.0 + a * (r * r * 3.0 - 0.5);
  vec2  p    = clamp(0.5 + d * warp, 0.0, 1.0);
  return prev(p);
}
