/*{
  "name": "Expanding Rings",
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
      "default": 1,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.8;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  float r = length(p);

  // Anneaux qui s'expandent
  float ring = mod(r - t * 0.5, 0.2);
  float line = smoothstep(0.08, 0.02, abs(ring - 0.1));

  // Modulation radiale
  float fade = exp(-r * 1.5);

  vec3 col = vec3(line * fade * 0.9);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.08);
  return col;
}
