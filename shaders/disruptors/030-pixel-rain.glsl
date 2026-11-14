/*{
  "name": "Pixel Rain",
  "id": "PRN",
  "defaultSensitivity": 0.62,
  "defaultDurationMs": 200,
  "defaultCooldownMs": 700
}*/

vec3 process(vec2 uv) {
  float t      = u_time;
  float a      = u_amount;
  float col    = floor(uv.x * 90.0);
  float speed  = 1.5 + hash(vec2(col, 0.0)) * 3.5;
  float offset = hash(vec2(col, 1.0));
  float rain   = fract(uv.y * 5.0 - t * speed + offset);
  float streak = exp(-rain * 10.0) * step(0.65, hash(vec2(col, floor(t * 3.0))));
  vec3  drop   = vec3(0.0, 0.85, 0.35) * streak * a;
  return prev(uv) * (1.0 - streak * a * 0.55) + drop;
}
