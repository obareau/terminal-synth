/*{
  "name": "Bit Crush",
  "id": "BCR",
  "defaultSensitivity": 0.55,
  "defaultDurationMs": 110,
  "defaultCooldownMs": 280
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float steps = mix(8.0, 2.0, a);
  float q = floor(lum * steps + 0.5) / steps;
  vec3 crushed = vec3(q);
  return mix(c, crushed, a);
}
