/*{
  "name": "Shatter",
  "id": "SHT",
  "defaultSensitivity": 0.68,
  "defaultDurationMs": 110,
  "defaultCooldownMs": 420
}*/

vec3 process(vec2 uv) {
  float t = u_time;
  float a = u_amount;
  // pixelation crystalline avec scatter géométrique
  float res = 20.0 + a * 40.0;
  vec2 grid = floor(uv * res) / res;

  float rnd = hash(grid + floor(t * 25.0));
  vec2 shatter = (vec2(hash(grid + 11.3), hash(grid + 22.7)) - 0.5) * 0.05 * a * step(0.6, rnd);

  vec3 c = prev(grid + shatter);
  float edge = length(fract(uv * res) - 0.5);
  float outline = step(0.4, edge) * (1.0 - edge);

  return c + outline * 0.2 * a;
}
