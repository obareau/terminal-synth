/*{
  "name": "Spin Vortex",
  "id": "SVX",
  "defaultSensitivity": 0.55,
  "defaultDurationMs": 180,
  "defaultCooldownMs": 700
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float spin = angle + t * a * 8.0 - r * a * 12.0;
  vec2 vortex = center + r * vec2(cos(spin), sin(spin));
  return prev(clamp(vortex, 0.0, 1.0));
}
