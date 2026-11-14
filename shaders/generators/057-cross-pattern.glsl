/*{
  "name": "Cross Pattern",
  "params": [
    {
      "label": "Density",
      "key": "u_p0",
      "min": 2,
      "max": 16,
      "default": 6,
      "step": 1
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 0.8,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  // Croix principal
  float h_line = abs(p.y);
  float v_line = abs(p.x);
  float cross = min(h_line, v_line);

  float thickness = 0.1 + 0.05 * sin(t * 2.0);
  float main_cross = step(cross, thickness);

  // Croix animées qui tournent
  float angle = atan(p.y, p.x) + t * 0.5;
  float radius = length(p);

  float rotated_cross = min(abs(sin(angle)), abs(cos(angle)));
  float rot_line = smoothstep(radius * 0.3, 0.0, rotated_cross - 0.15);

  vec3 col = vec3(main_cross * 0.8 + rot_line * 0.4);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.08);
  return col;
}
