/*{
  "name": "Triangle Oscillator",
  "params": [
    {
      "label": "Frequency",
      "key": "u_p0",
      "min": 2,
      "max": 20,
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
  ],
  "category": "Geometry"
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p1;
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 col = vec3(0.0);

  // Triangle wave oscillators - create zigzag pattern
  float wave_val = abs(mod(p.x * u_p0 + t, 2.0) - 1.0) * 2.0 - 1.0;
  wave_val = wave_val * wave_val * 2.0 - 1.0; // Triangle approximation

  float modulation = sin(p.y * 8.0 + t * 0.5) * 0.05;
  float d = abs(p.y - (wave_val * 0.15 + modulation));

  float line = smoothstep(0.01, 0.002, d);
  col += vec3(line * (0.8 + 0.2 * u_bass));

  // Verticals at peaks
  for(float i = -2.0; i < 3.0; i++) {
    float x_peak = i / u_p0 + t * 0.2;
    float d_peak = abs(p.x - x_peak);
    float vert = smoothstep(0.006, 0.001, d_peak) * (0.5 + 0.3 * u_mid);
    col += vec3(vert);
  }

  col *= 0.5 + 0.6 * u_level;
  return col;
}
