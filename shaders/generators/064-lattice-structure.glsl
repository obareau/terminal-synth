/*{
  "name": "Lattice Structure",
  "params": [
    {
      "label": "Scale",
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

  // Structure en treillis avec rotation
  float angle = t * 0.5;
  vec2 rot_p = vec2(
    p.x * cos(angle) - p.y * sin(angle),
    p.x * sin(angle) + p.y * cos(angle)
  );

  // Grille diagonale
  float lattice_size = 0.15;
  vec2 lattice = fract(rot_p / lattice_size);

  float h_line = smoothstep(0.05, 0.0, abs(lattice.y - 0.5));
  float v_line = smoothstep(0.05, 0.0, abs(lattice.x - 0.5));

  vec3 col = vec3((h_line + v_line) * 0.75);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.05);
  return col;
}
