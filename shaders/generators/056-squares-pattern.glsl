/*{
  "name": "Squares Pattern",
  "params": [
    {
      "label": "Scale",
      "key": "u_p0",
      "min": 1,
      "max": 20,
      "default": 8,
      "step": 1
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 0.6,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = uv;

  // Carrés animés
  float square_size = 0.2;
  vec2 sq = fract(p / square_size);
  float d_to_edge = min(min(sq.x, sq.y), min(1.0 - sq.x, 1.0 - sq.y));

  float border = smoothstep(0.08, 0.02, d_to_edge);

  // Remplissage avec animation
  float fill_amount = 0.5 + 0.5 * sin(t + length(uv) * 5.0);
  float fill = step(fill_amount, 0.5 + d_to_edge);

  vec3 col = vec3(border * 0.9 + fill * 0.3);

  col *= 0.75 + 0.25 * u_level;
  col += vec3(u_bass * 0.06);
  return col;
}
