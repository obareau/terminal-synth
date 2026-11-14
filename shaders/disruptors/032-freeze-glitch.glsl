/*{
  "name": "Freeze Glitch",
  "id": "FRZ",
  "defaultSensitivity": 0.72,
  "defaultDurationMs": 130,
  "defaultCooldownMs": 700
}*/

vec3 process(vec2 uv) {
  float t   = u_time;
  float a   = u_amount;
  float row = floor(uv.y * 38.0);
  float rnd = hash(vec2(row, floor(t * 7.0)));
  float slip = step(0.78, rnd) * (hash(vec2(floor(t * 7.0), row)) - 0.5) * 0.05 * a;
  vec2  fuv  = clamp(uv + vec2(slip, 0.0), 0.0, 1.0);
  return mix(prev(uv), fb(fuv), a * 0.92);
}
