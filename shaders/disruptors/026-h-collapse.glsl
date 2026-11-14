/*{
  "name": "H-Collapse",
  "id": "HCL",
  "defaultSensitivity": 0.8,
  "defaultDurationMs": 70,
  "defaultCooldownMs": 900
}*/

vec3 process(vec2 uv) {
  float a  = u_amount;
  float ny = mix(uv.y, 0.5, a * 0.96);
  return prev(clamp(vec2(uv.x, ny), 0.0, 1.0));
}
