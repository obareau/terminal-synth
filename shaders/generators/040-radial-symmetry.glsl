/*{
  "name": "Radial symmetry",
  "params": [
    {
      "label": "Sides",
      "key": "u_p0",
      "min": 3,
      "max": 16,
      "default": 6,
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
  vec2 pos = uv - 0.5;
  float angle = atan(pos.y, pos.x);
  float radius = length(pos);

  float sides = u_p0 * (0.9 + 0.2 * u_mid);
  float pattern = cos(angle * sides + u_time * u_p1 * (0.8 + u_bass));
  float rings = sin(radius * (12.0 + u_treble * 4.0) - u_time * u_p1);

  float combined = pattern * rings * (0.7 + 0.3 * u_bass);
  vec3 col = mix(vec3(0.1, 0.05 + u_bass * 0.1, 0.2), vec3(0.9, 0.3 + u_mid * 0.3, 0.7 + u_treble * 0.2), combined * 0.5 + 0.5);
  col *= smoothstep(1.0, 0.3, radius);
  col *= 0.5 + 0.7 * u_level;
  return col;
}
