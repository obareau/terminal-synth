/*{
  "name": "Negative Burst",
  "id": "NGB",
  "defaultSensitivity": 0.7,
  "defaultDurationMs": 120,
  "defaultCooldownMs": 400
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  // Inversion complète modulée par luminosité
  vec3 inverted = 1.0 - c;
  return mix(c, inverted, a * lum * 0.8);
}
