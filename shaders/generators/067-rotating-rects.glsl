/*{
  "name": "Rotating Rects",
  "params": [
    {
      "label": "Count",
      "key": "u_p0",
      "min": 3,
      "max": 20,
      "default": 8,
      "step": 1
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 1,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Rectangles en rotation
  for(int i = 0; i < 6; i++) {
    float fi = float(i);
    float angle = t * (1.0 + fi * 0.2) + fi * 1.047;

    // Rotation
    vec2 rot_p = vec2(
      p.x * cos(angle) - p.y * sin(angle),
      p.x * sin(angle) + p.y * cos(angle)
    );

    // Rectangle
    float size = 0.2 + fi * 0.08;
    float rect = smoothstep(0.08, 0.05, max(abs(rot_p.x), abs(rot_p.y)) - size);

    col += vec3(rect * (0.5 + 0.5 * fi / 6.0));
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.07);
  return clamp(col, vec3(0.0), vec3(1.0));
}
