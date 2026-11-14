/*{
  "name": "Sawtooth Sweep",
  "params": [
    {
      "label": "Frequency",
      "key": "u_p0",
      "min": 3,
      "max": 20,
      "default": 10,
      "step": 1
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 1.2,
      "step": 0.1
    }
  ],
  "category": "Geometry"
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p1;
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 col = vec3(0.0);

  // Sawtooth wave - linear rise and sharp fall
  for(float band = 0.0; band < 8.0; band++) {
    float y_center = (band / 8.0) - 0.5;

    // Sawtooth: modulo creates the repeating ramp
    float x_phase = p.x * u_p0 + t + band * 0.2;
    float saw_wave = mod(x_phase, 1.0) - 0.5; // -0.5 to 0.5

    float wave_y = saw_wave * 0.12;
    float d = abs(p.y - (y_center + wave_y));
    float line = smoothstep(0.007, 0.002, d);

    col += vec3(line * (0.6 + 0.4 * u_bass));
  }

  col *= 0.5 + 0.7 * u_level;
  col += u_treble * 0.15;
  return col;
}
