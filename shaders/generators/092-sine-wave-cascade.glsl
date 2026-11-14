/*{
  "name": "Sine Wave Cascade",
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
  ],
  "category": "Geometry"
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p1;
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  vec3 col = vec3(0.0);

  // Horizontal cascading sine waves
  for(float i = 0.0; i < 12.0; i++) {
    float y_offset = (i / 12.0) - 0.5;
    float wave = sin(p.x * u_p0 + t + i * 0.3) * 0.08;
    float d = abs(p.y - (y_offset + wave));
    float line = smoothstep(0.008, 0.002, d);
    col += vec3(line * (0.7 + 0.3 * u_bass));
  }

  col *= 0.5 + 0.5 * u_level;
  col += u_mid * 0.1;
  return col;
}
