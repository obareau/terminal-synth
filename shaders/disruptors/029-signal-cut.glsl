/*{
  "name": "Signal Cut",
  "id": "SIG",
  "defaultSensitivity": 0.85,
  "defaultDurationMs": 55,
  "defaultCooldownMs": 1100
}*/

vec3 process(vec2 uv) {
  float a    = u_amount;
  float glow = exp(-abs(uv.y - 0.5) * 90.0);
  vec3  line = vec3(0.15, 0.9, 0.55) * glow;
  return mix(prev(uv), line, a * 0.92);
}
