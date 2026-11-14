/*{
  "name": "Sine Waves",
  "params": [
    {
      "label": "Frequency",
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
      "default": 1,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.6;
  vec2 p = uv;

  // Ondes sinusoïdales superposées
  float wave1 = sin(p.x * 8.0 - t * 2.0) * 0.3;
  float wave2 = sin(p.x * 5.0 + t * 1.5) * 0.2;
  float wave3 = cos(p.x * 3.0 - t * 0.8) * 0.1;

  float y_offset = wave1 + wave2 + wave3;

  // Dessiner les courbes
  float dist_to_wave = abs(p.y - (0.5 + y_offset));
  float line = smoothstep(0.04, 0.0, dist_to_wave);

  // Gradient basé sur X
  float grad = p.x;
  vec3 col = vec3(line * (0.5 + grad * 0.5));

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.06);
  return col;
}
