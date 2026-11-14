/*{
  "name": "Polygon Grid",
  "params": [
    {
      "label": "Sides",
      "key": "u_p0",
      "min": 3,
      "max": 12,
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
  float t = u_time * 0.3;
  vec2 p = uv;

  vec3 col = vec3(0.0);

  // Grille de polygones
  float poly_size = 0.15;
  vec2 grid_id = floor(p / poly_size);

  for(int i = -1; i <= 1; i++) {
    for(int j = -1; j <= 1; j++) {
      vec2 cell = grid_id + vec2(float(i), float(j));
      vec2 cell_center = (cell + 0.5) * poly_size;

      // Nombre de côtés animé
      float sides = 3.0 + 2.0 * sin(t + length(cell));

      // Polygone
      for(float k = 0.0; k < 6.0; k++) {
        float angle = k * 2.0 * 3.14159 / sides + t * 0.5;
        vec2 vertex = cell_center + vec2(cos(angle), sin(angle)) * poly_size * 0.4;

        float d = distance(p, vertex);
        float ring = smoothstep(0.03, 0.01, d);
        col += vec3(ring * 0.6);
      }
    }
  }

  col *= 0.75 + 0.25 * u_level;
  col += vec3(u_bass * 0.06);
  return clamp(col, vec3(0.0), vec3(1.0));
}
