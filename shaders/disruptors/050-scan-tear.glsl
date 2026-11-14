/*{
  "name": "Scan Tear",
  "id": "SCT",
  "defaultSensitivity": 0.6,
  "defaultDurationMs": 70,
  "defaultCooldownMs": 220
}*/

vec3 process(vec2 uv) {
  float t = u_time, a = u_amount;
  float band = floor(uv.y * 40.0);
  float seed = hash(vec2(band, floor(t * 16.0)));
  float tear = step(0.78, seed) * (seed - 0.5) * 0.25 * a;
  return prev(vec2(fract(uv.x + tear), uv.y));
}
