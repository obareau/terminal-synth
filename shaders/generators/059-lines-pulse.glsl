/*{
  "name": "Lines Pulse",
  "params": [
    {
      "label": "Lines",
      "key": "u_p0",
      "min": 3,
      "max": 20,
      "default": 12,
      "step": 1
    },
    {
      "label": "Pulse Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 1,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.8;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Lignes parallèles animées
  for(int i = -5; i <= 5; i++) {
    float fi = float(i);
    float line_y = p.y + sin(t + fi * 0.3) * 0.3;

    float thickness = 0.05 + 0.03 * sin(t * 2.0 + fi);
    float line = smoothstep(thickness, 0.0, abs(line_y - fi * 0.25));

    col += vec3(line * (0.6 + 0.4 * abs(sin(fi * 0.5))));
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.1);
  return clamp(col, vec3(0.0), vec3(1.0));
}
