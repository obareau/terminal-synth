/*{
  "name": "Block Displace",
  "id": "BLD",
  "defaultSensitivity": 0.65,
  "defaultDurationMs": 90,
  "defaultCooldownMs": 250
}*/

vec3 process(vec2 uv) {
  float t = u_time, a = u_amount;
  vec2 cellSize = vec2(0.05);
  vec2 cell = floor(uv / cellSize);
  float r = hash(cell + floor(t * 30.0));
  vec2 jit = vec2(r - 0.5, hash(cell.yx + r) - 0.5) * 0.10 * a;
  return prev(uv + jit * step(0.55, r));
}
