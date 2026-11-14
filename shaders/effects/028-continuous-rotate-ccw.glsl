/*{
  "name": "Continuous Rotate CCW",
  "id": "RCC"
}*/

vec3 process(vec2 uv) {
  float speed = u_amount * 4.0;
  float angle = -u_time * speed;
  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  float c = cos(angle);
  float s = sin(angle);
  vec2 rotated = center + vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  return prev(clamp(rotated, 0.0, 1.0));
}
