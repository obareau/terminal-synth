/*{
  "name": "Vertical Tear",
  "id": "VTR",
  "defaultSensitivity": 0.67,
  "defaultDurationMs": 90,
  "defaultCooldownMs": 320
}*/

vec3 process(vec2 uv) {
  float t   = u_time;
  float col = floor(uv.x * 48.0);
  float rnd = hash(vec2(col, floor(t * 18.0)));
  float shift = step(0.80, rnd) * (hash(vec2(floor(t * 18.0), col)) - 0.5) * u_amount * 0.4;
  float s   = u_amount * 0.015;
  vec3  c;
  c.r = prev(fract(uv + vec2(0.0, shift + s))).r;
  c.g = prev(fract(uv + vec2(0.0, shift    ))).g;
  c.b = prev(fract(uv + vec2(0.0, shift - s))).b;
  return c;
}
