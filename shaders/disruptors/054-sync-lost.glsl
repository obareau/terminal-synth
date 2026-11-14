/*{
  "name": "Sync Lost",
  "id": "SYL",
  "defaultSensitivity": 0.6,
  "defaultDurationMs": 180,
  "defaultCooldownMs": 500
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float roll = u_time * (1.5 + u_bass * 2.0) * a;
  float y = fract(uv.y + roll);
  // dark band at the sync edge
  float edge = smoothstep(0.04, 0.0, abs(fract(uv.y + roll) - 0.0));
  vec3 c = prev(vec2(uv.x, y));
  return c * (1.0 - edge * 0.8 * a);
}
