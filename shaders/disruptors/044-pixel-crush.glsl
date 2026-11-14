/*{
  "name": "Pixel Crush",
  "id": "PCR",
  "defaultSensitivity": 0.68,
  "defaultDurationMs": 80,
  "defaultCooldownMs": 450
}*/

vec3 process(vec2 uv) {
  float t    = u_time;
  float a    = u_amount;
  vec2  px   = 1.0 / u_resolution;
  vec2  grid = floor(uv / px);
  float rnd  = hash(grid + floor(t * 30.0));
  float crush = step(0.88, rnd) * a;
  vec2  flipped = vec2(hash(grid + 7.3), hash(grid + 13.7));
  vec2  p    = mix(uv, flipped, crush);
  return prev(clamp(p, 0.0, 1.0));
}
