/*{
  "name": "Corrupt",
  "id": "CRP",
  "defaultSensitivity": 0.6,
  "defaultDurationMs": 120,
  "defaultCooldownMs": 400
}*/

vec3 process(vec2 uv) {
  float t    = floor(u_time * 28.0);
  vec2  grid = floor(uv * u_resolution / 5.0);
  float rnd  = hash(grid + t);
  float bad  = step(0.82 - u_amount * 0.18, rnd);
  vec3  noise = vec3(
    hash(grid + t + 17.3),
    hash(grid + t + 31.7),
    hash(grid + t + 53.1)
  );
  return mix(prev(uv), noise, bad * u_amount);
}
