/*{
  "name": "Color Shift",
  "id": "CSH",
  "defaultSensitivity": 0.6,
  "defaultDurationMs": 100,
  "defaultCooldownMs": 350
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec3 c = prev(uv);

  // Rotation des canaux RGB
  float hue = t * 2.0;
  vec3 shifted = vec3(
    c.r * (0.5 + 0.5 * sin(hue)),
    c.g * (0.5 + 0.5 * sin(hue + 2.094)),
    c.b * (0.5 + 0.5 * sin(hue + 4.189))
  );

  return mix(c, shifted, a * 0.6);
}
