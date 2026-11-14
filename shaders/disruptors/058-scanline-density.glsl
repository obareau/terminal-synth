/*{
  "name": "Scanline Density",
  "id": "SLD",
  "defaultSensitivity": 0.45,
  "defaultDurationMs": 160,
  "defaultCooldownMs": 320
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float density = mix(200.0, 600.0, u_bass);
  float scan = 0.5 + 0.5 * sin(uv.y * density + u_time * 6.0);
  vec3 c = prev(uv);
  return c * mix(1.0, scan, a * 0.85);
}
