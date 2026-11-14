/*{
  "name": "Radial Warp",
  "id": "RDW",
  "defaultSensitivity": 0.65,
  "defaultDurationMs": 150,
  "defaultCooldownMs": 500
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  float r = length(p);
  float angle = atan(p.y, p.x);

  // Distorsion radiale avec onde
  float warp = 1.0 + sin(t * 3.0 + angle * 6.0) * 0.15 * a;
  vec2 warped = center + p * warp;

  return prev(clamp(warped, 0.0, 1.0));
}
