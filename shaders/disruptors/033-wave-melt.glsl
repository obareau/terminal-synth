/*{
  "name": "Wave Melt",
  "id": "WML",
  "defaultSensitivity": 0.58,
  "defaultDurationMs": 130,
  "defaultCooldownMs": 400
}*/

vec3 process(vec2 uv) {
  float a   = u_amount;
  float t   = u_time;
  float amp = a * 0.07;
  vec2  p   = uv;
  p.x += sin(p.y * (8.0 + a * 14.0) + t * 6.5) * amp;
  p.y += cos(p.x * (6.0 + a * 10.0) + t * 4.0) * amp * 0.6;
  return prev(clamp(p, 0.0, 1.0));
}
