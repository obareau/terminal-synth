/*{
  "name": "Wire Grid",
  "params": [
    {
      "label": "Grid Scale",
      "key": "u_p0",
      "min": 2,
      "max": 20,
      "default": 8,
      "step": 1
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 0.5,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;

  // Grille filaire minimaliste
  float grid_size = 8.0;
  vec2 grid = abs(fract(uv * grid_size) - 0.5);
  float grid_line = min(grid.x, grid.y);

  // Lignes horizontales animées
  float h_line = abs(sin((uv.y * grid_size + t) * 3.14159)) - 0.4;
  h_line = step(0.0, h_line) * step(0.0, 0.1 - abs(h_line));

  // Distorsion minimaliste
  float dist = abs(sin(uv.x * 20.0 + t * 2.0) * 0.02);
  float final_line = step(0.02, grid_line);

  float brightness = final_line * (0.6 + 0.4 * h_line);
  brightness += u_bass * 0.2;

  return vec3(brightness * 0.8) * (0.5 + u_level * 0.5);
}
