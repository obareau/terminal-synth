/*{
  "name": "Psycho Shift",
  "id": "PSH",
  "defaultSensitivity": 0.65,
  "defaultDurationMs": 120,
  "defaultCooldownMs": 450
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec3 c = prev(uv);
  float rnd = hash(vec2(floor(t * 30.0), uv.y * 100.0));
  vec3 shifted = vec3(
    c.g * (0.5 + 0.5 * sin(t * 4.0 + rnd)),
    c.b * (0.5 + 0.5 * cos(t * 3.0 + rnd)),
    c.r * (0.5 + 0.5 * sin(t * 5.0 + rnd * 2.0))
  );
  return mix(c, shifted, a * 0.7);
}
