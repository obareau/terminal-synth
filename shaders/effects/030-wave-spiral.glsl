/*{
  "name": "Wave Spiral",
  "id": "WSP"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float wave = sin(angle * 5.0 + u_time * 3.0 - r * 30.0) * 0.1 * a;
  vec2 warped = center + (p + vec2(cos(angle), sin(angle)) * wave) * (1.0 + r * a * 0.5);
  return prev(clamp(warped, 0.0, 1.0));
}
