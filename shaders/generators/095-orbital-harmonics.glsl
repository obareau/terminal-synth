/*{
  "name": "Orbital Harmonics",
  "params": [
    {
      "label": "Harmonics",
      "key": "u_p0",
      "min": 2,
      "max": 8,
      "default": 4,
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
  ],
  "category": "Geometry"
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p1;
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 col = vec3(0.0);

  // Multiple orbital harmonics - concentric sine waves
  for(float harmonic = 1.0; harmonic <= u_p0; harmonic++) {
    float r = length(p);

    // Orbital pattern
    float angle = atan(p.y, p.x);

    // Harmonic sine wave in radial direction
    float wave = sin(r * 20.0 * harmonic - t * 2.0 + angle * harmonic) * (0.5 + 0.5 * u_level);

    // Ring radius for this harmonic
    float ring_r = 0.1 + harmonic * 0.12;
    float ring_width = 0.015;

    // Modulate with sine wave
    float modulated_r = ring_r + wave * 0.03;
    float d = abs(r - modulated_r);

    float ring = smoothstep(ring_width, 0.0, d);
    col += vec3(ring * (0.5 + 0.3 * u_bass + 0.2 * sin(harmonic + t)));
  }

  col *= 0.6 + 0.4 * u_level;
  col += u_mid * 0.08;
  return col;
}
