/*{
  "name": "Mirror Flip",
  "id": "MFL",
  "defaultSensitivity": 0.5,
  "defaultDurationMs": 180,
  "defaultCooldownMs": 600
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;

  // Miroir diagonal avec rotation
  float angle = t * 2.0;
  vec2 p = uv - 0.5;
  vec2 rotated = vec2(
    p.x * cos(angle) - p.y * sin(angle),
    p.x * sin(angle) + p.y * cos(angle)
  );

  vec2 mirrored = vec2(1.0 - abs(rotated.x), abs(rotated.y)) + 0.5;
  return prev(clamp(mirrored, 0.0, 1.0));
}
