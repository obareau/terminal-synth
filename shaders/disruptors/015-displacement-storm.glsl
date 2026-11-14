/*{
  "name": "Displacement Storm",
  "id": "DST",
  "defaultSensitivity": 0.6,
  "defaultDurationMs": 200,
  "defaultCooldownMs": 600
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  float disp1 = sin(uv.x * 20.0 + t * 5.0) * sin(uv.y * 15.0 + t * 3.0);
  float disp2 = cos(uv.x * 30.0 - t * 4.0) * cos(uv.y * 20.0 - t * 2.0);
  vec2 displaced = uv + vec2(disp1, disp2) * 0.1 * a;
  return prev(clamp(displaced, 0.0, 1.0));
}
