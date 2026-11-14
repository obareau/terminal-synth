/*{
  "name": "Strobe",
  "id": "STR",
  "defaultSensitivity": 0.8,
  "defaultDurationMs": 40,
  "defaultCooldownMs": 800
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec3  c = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  // flash blanc + inversion partielle
  vec3 inv = 1.0 - c;
  vec3 flash = mix(c, inv + lum * 0.5, a * 0.7);
  return mix(c, flash + vec3(a * 0.25), a);
}
