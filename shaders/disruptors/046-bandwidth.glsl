/*{
  "name": "Bandwidth",
  "id": "BWD",
  "defaultSensitivity": 0.62,
  "defaultDurationMs": 110,
  "defaultCooldownMs": 500
}*/

vec3 process(vec2 uv) {
  float t       = u_time;
  float a       = u_amount;
  float band    = floor(uv.y * 20.0);
  float rnd     = hash(vec2(band, floor(t * 12.0)));
  float stretch = 1.0 + step(0.6, rnd) * (rnd - 0.6) * a * 3.5;
  float newX    = (uv.x - 0.5) / stretch + 0.5;
  float inBnd   = step(0.0, newX) * step(newX, 1.0);
  return prev(vec2(newX, uv.y)) * inBnd;
}
