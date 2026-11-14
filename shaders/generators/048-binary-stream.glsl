/*{
  "name": "Binary Stream",
  "params": [
    {
      "label": "Speed",
      "key": "u_p0",
      "min": 0,
      "max": 2,
      "default": 1,
      "step": 0.1
    },
    {
      "label": "Density",
      "key": "u_p1",
      "min": 0.1,
      "max": 1,
      "default": 0.5,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time;

  // Flux binaire (0 et 1)
  float col_size = 12.0;
  float row_size = 6.0;

  vec2 grid = floor(vec2(uv.x * col_size, (uv.y + t * 0.3) * row_size));
  float idx = mod(hash(grid) * 100.0, 2.0);

  // Afficher 0 ou 1
  vec2 f = fract(vec2(uv.x * col_size, (uv.y + t * 0.3) * row_size));

  // Caractère simple: ligne pour 1, carré pour 0
  float char_line = 0.0;
  if(idx < 1.0) {
    // "1" = ligne verticale
    char_line = step(0.4, f.x) * step(f.x, 0.6) * step(0.2, f.y) * step(f.y, 0.8);
  } else {
    // "0" = carré
    char_line = step(0.3, f.x) * step(f.x, 0.7) * step(0.2, f.y) * step(f.y, 0.8);
    char_line += (step(0.3, f.x) * step(f.x, 0.4) + step(0.6, f.x) * step(f.x, 0.7)) * (step(0.2, f.y) * step(f.y, 0.8));
  }

  float brightness = max(char_line, 0.05 * u_bass);

  return vec3(brightness * 0.8);
}
