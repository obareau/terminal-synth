/*{
  "name": "Twisted Bands",
  "params": [
    {
      "label": "Count",
      "key": "u_p0",
      "min": 2,
      "max": 12,
      "default": 6,
      "step": 1
    },
    {
      "label": "Twist",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 1,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  // Bandes qui se tordent
  float x_twist = p.x + sin(p.y * 5.0 + t) * 0.3;
  float wave = sin(x_twist * 3.0 - t * 2.0) * 0.5 + 0.5;

  float band = smoothstep(0.3, 0.0, abs(wave - 0.5)) * smoothstep(0.3, 0.2, abs(p.y));

  vec3 col = vec3(band * (0.5 + 0.5 * wave));

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.06);
  return col;
}
