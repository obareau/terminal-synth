/*{
  "name": "Concentric Circles",
  "params": [
    {
      "label": "Count",
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
      "default": 0.8,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  float r = length(p);

  // Cercles concentriques animés
  float circle = sin(r * 20.0 - t * 3.0) * 0.5 + 0.5;
  float line = smoothstep(0.1, 0.0, abs(circle - 0.5));

  // Modulation radiale
  float glow = exp(-r * 3.0) * 0.6;

  vec3 col = vec3(line * 0.9 + glow * 0.3);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.08);
  return col;
}
