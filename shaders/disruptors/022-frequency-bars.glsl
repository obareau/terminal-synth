/*{
  "name": "Frequency Bars",
  "id": "FRB",
  "defaultSensitivity": 0.62,
  "defaultDurationMs": 95,
  "defaultCooldownMs": 320
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;

  // Barres de fréquence animées
  float freq = sin(uv.x * 20.0 + t * 5.0) * 0.5 + 0.5;
  float bar = step(abs(sin(uv.y * 30.0)), freq * a);

  vec3 c = prev(uv);
  return c * (1.0 - bar * a * 0.4) + vec3(bar * freq * a * 0.2);
}
