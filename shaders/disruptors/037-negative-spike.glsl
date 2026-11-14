/*{
  "name": "Negative Spike",
  "id": "NGS",
  "defaultSensitivity": 0.78,
  "defaultDurationMs": 45,
  "defaultCooldownMs": 700
}*/

vec3 process(vec2 uv) {
  float a   = u_amount;
  vec3  c   = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3  inv = 1.0 - c;
  float edge = abs(lum - 0.5) * 2.0;
  return mix(c, inv + vec3(edge * 0.3 * a), a);
}
