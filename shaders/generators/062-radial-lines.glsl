/*{
  "name": "Radial Lines",
  "params": [
    {
      "label": "Lines",
      "key": "u_p0",
      "min": 4,
      "max": 32,
      "default": 16,
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
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  float angle = atan(p.y, p.x);
  float r = length(p);

  // Lignes radiantes
  float line_count = 12.0;
  float radial = abs(sin(angle * line_count)) * smoothstep(0.01, 0.0, abs(sin(angle * line_count)) - 0.5);

  // Modulation d'épaisseur animée
  float thickness = 0.3 + 0.2 * sin(t * 2.0 + r * 5.0);
  float lines = smoothstep(thickness, thickness - 0.1, r);

  vec3 col = vec3(radial * lines * 0.85);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.07);
  return col;
}
