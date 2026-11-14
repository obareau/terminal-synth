/*{
  "name": "Blink Strip",
  "id": "BLS",
  "defaultSensitivity": 0.73,
  "defaultDurationMs": 70,
  "defaultCooldownMs": 550
}*/

vec3 process(vec2 uv) {
  float t     = u_time;
  float a     = u_amount;
  float band  = floor(uv.y * 16.0);
  float rnd   = hash(vec2(band, floor(t * 20.0)));
  float flash = step(0.72, rnd) * step(rnd, 0.86) * a;
  float isBlk = step(0.79, rnd);
  vec3  fill  = mix(vec3(1.0), vec3(0.0), isBlk);
  return mix(prev(uv), fill, flash);
}
