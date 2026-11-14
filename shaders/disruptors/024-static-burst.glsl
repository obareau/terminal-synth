/*{
  "name": "Static Burst",
  "id": "STB",
  "defaultSensitivity": 0.75,
  "defaultDurationMs": 60,
  "defaultCooldownMs": 400
}*/

vec3 process(vec2 uv) {
  float t = u_time;
  float a = u_amount;
  vec3 noise = vec3(
    hash(uv * 512.0 + t * 91.3),
    hash(uv * 384.0 + t * 73.7),
    hash(uv * 768.0 + t * 53.1)
  );
  return mix(prev(uv), noise, a * 0.92);
}
