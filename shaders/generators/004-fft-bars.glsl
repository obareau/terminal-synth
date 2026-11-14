/*{
  "name": "FFT bars",
  "params": [
    {
      "label": "Barres",
      "key": "u_p0",
      "min": 16,
      "max": 128,
      "default": 96,
      "step": 1
    },
    {
      "label": "Crête",
      "key": "u_p1",
      "min": 0.003,
      "max": 0.04,
      "default": 0.012,
      "step": 0.001
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float v = fftAt(uv.x) * (0.8 + 0.4 * u_bass);  // hauteur de la barre (0..1), modulée par les basses
  float bar = step(uv.y, v);                      // rempli sous la valeur
  vec3 col = mix(vec3(0.0, 0.04 * (1.0 - u_mid), 0.03), vec3(0.10 + u_treble * 0.1, 0.90, 0.40 + u_mid * 0.2), bar);
  float peak_width = u_p1 * (0.8 + 0.4 * u_bass);
  col += vec3(0.9, 0.3 + u_treble * 0.2, 0.05) * smoothstep(peak_width, 0.0, abs(uv.y - v)); // crête chaude
  // séparation des barres
  col *= (0.4 + 0.4 * u_level) + 0.6 * step(0.12, fract(uv.x * u_p0));
  col += vec3(0.0, u_bass * 0.1, 0.0);
  return col;
}
