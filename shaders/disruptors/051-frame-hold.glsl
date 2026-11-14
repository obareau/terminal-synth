/*{
  "name": "Frame Hold",
  "id": "FRH",
  "defaultSensitivity": 0.55,
  "defaultDurationMs": 120,
  "defaultCooldownMs": 400
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 held = fb(uv);
  vec3 cur  = prev(uv);
  float mixv = step(0.5, hash(vec2(floor(u_time * 8.0), 0.0))) * a;
  return mix(cur, held, mixv);
}
