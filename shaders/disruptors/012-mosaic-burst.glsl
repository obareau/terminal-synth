/*{
  "name": "Mosaic Burst",
  "id": "MSB",
  "defaultSensitivity": 0.6,
  "defaultDurationMs": 150,
  "defaultCooldownMs": 500
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  float scale = 3.0 + a * 10.0;
  vec2 mosaic = floor(uv * scale) / scale;
  vec3 scrambled = prev(mosaic);
  scrambled += vec3(
    hash(mosaic + t) * 0.3,
    hash(mosaic + t + 0.5) * 0.3,
    hash(mosaic + t + 1.0) * 0.3
  ) * a;
  return mix(prev(uv), scrambled, a * 0.8);
}
