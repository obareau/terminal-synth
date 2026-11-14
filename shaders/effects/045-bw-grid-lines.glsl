/*{
  "name": "BW Grid Lines",
  "id": "BWG"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  vec3 col = prev(uv);

  // Monochrome grid with rotation
  float angle = atan(p.y, p.x) + t * 0.3;
  float r = length(p);

  // Radial lines
  for(float i = 0.0; i < 8.0; i++) {
    float line_angle = i * 0.785; // 8 lines
    float angle_diff = mod(angle - line_angle + 3.14159, 6.28) - 3.14159;
    float line_width = 0.01 * (1.0 + 0.5 * sin(t * 2.0 + i));
    float line = smoothstep(line_width, 0.0, abs(angle_diff) * r);
    col += vec3(line * a * (0.5 + 0.5 * cos(t + i)));
  }

  // Concentric circles
  for(float i = 1.0; i < 6.0; i++) {
    float circle_r = i * 0.15;
    float circle = smoothstep(0.008, 0.001, abs(r - circle_r));
    col += vec3(circle * a * (0.4 + 0.3 * sin(t * 1.5 + i)));
  }

  return mix(prev(uv), col, a * 0.25);
}
