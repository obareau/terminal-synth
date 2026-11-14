/*{
  "name": "Negative Flash",
  "id": "NGF",
  "defaultSensitivity": 0.75,
  "defaultDurationMs": 60,
  "defaultCooldownMs": 700
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);
  return mix(c, 1.0 - c, a);
}
