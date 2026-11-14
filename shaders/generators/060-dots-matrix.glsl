/*{
  "name": "Dots Matrix",
  "params": [
    {
      "label": "Density",
      "key": "u_p0",
      "min": 2,
      "max": 20,
      "default": 10,
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
  float t = u_time * 0.5;
  vec2 p = uv;

  // Matrice de points
  float dot_size = 0.08;
  vec2 dots = fract(p * 12.0);

  float d_to_center = length(dots - 0.5);
  float dot_radius = dot_size * (0.5 + 0.5 * sin(t + length(uv) * 10.0));

  float dot = smoothstep(dot_radius + 0.02, dot_radius - 0.01, d_to_center);

  // Remplissage animé
  float fill = smoothstep(dot_radius, 0.0, d_to_center);

  vec3 col = vec3(dot * 0.9 + fill * 0.4);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.07);
  return col;
}
