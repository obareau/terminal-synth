/*{
  "name": "Stripes wave",
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
      "default": 2,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float freq = u_p0 * (0.8 + u_bass * 1.2);
  float wave = sin(uv.x * freq + u_time * u_p1 * (1.0 + u_treble) - uv.y * (2.0 + u_mid));
  float stripe = abs(wave) * (0.4 + 0.2 * u_bass);

  vec3 col = vec3(0.0);
  col.r = stripe + sin(u_time * (0.5 + u_bass)) * 0.2;
  col.g = stripe + cos(u_time * (0.7 + u_mid)) * 0.2;
  col.b = stripe + sin(u_time * (0.3 + u_treble)) * 0.2;

  col += fftAt(uv.x * 0.3) * vec3(0.4, 0.2, 0.8) * (0.6 + 0.4 * u_bass);
  return col * (0.5 + 0.8 * u_level);
}
