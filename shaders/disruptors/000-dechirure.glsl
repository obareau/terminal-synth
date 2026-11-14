/*{
  "name": "Déchirure",
  "id": "DCH",
  "defaultSensitivity": 0.65,
  "defaultDurationMs": 80,
  "defaultCooldownMs": 300
}*/

vec3 process(vec2 uv) {
  float t   = u_time;
  float row = floor(uv.y * 52.0);
  float rnd = hash(vec2(row, floor(t * 20.0)));
  float shift = step(0.82, rnd) * (hash(vec2(floor(t*20.0), row)) - 0.5) * u_amount * 0.45;
  float s  = u_amount * 0.018;
  vec3 c;
  c.r = prev(fract(uv + vec2(shift + s, 0.0))).r;
  c.g = prev(fract(uv + vec2(shift,     0.0))).g;
  c.b = prev(fract(uv + vec2(shift - s, 0.0))).b;
  return c;
}
