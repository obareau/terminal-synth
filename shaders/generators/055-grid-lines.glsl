/*{
  "name": "Grid Lines",
  "params": [
    {
      "label": "Grid Size",
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
  float t = u_time * 0.3;
  vec2 p = uv;

  // Grille simple avec modulation animée
  float grid_size = 12.0;
  vec2 grid = abs(fract(p * grid_size) - 0.5);
  float grid_line = min(grid.x, grid.y);

  // Animation : les lignes s'épaississent et se rétrécissent
  float thickness = 0.08 + 0.04 * sin(t * 2.0);
  float line = step(grid_line, thickness);

  // Dégradé basé sur position
  float grad = uv.y * 0.5 + 0.5;
  vec3 col = vec3(line * grad);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.05);
  return col;
}
