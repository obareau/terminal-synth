/*{
  "name": "Circuit Board",
  "params": [
    {
      "label": "Density",
      "key": "u_p0",
      "min": 2,
      "max": 20,
      "default": 10,
      "step": 1
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 0.6,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.3;

  // Traces de circuit minimalistes
  vec2 p = uv * 4.0;
  vec2 id = floor(p);
  vec2 f = fract(p);

  // Lignes horizontales et verticales
  float h_trace = step(0.45, f.y) * step(f.y, 0.55);
  float v_trace = step(0.45, f.x) * step(f.x, 0.55);

  // Points de connection (via)
  float via = length(f - 0.5);
  float via_circle = step(via, 0.08);

  // Animation des traces
  float pulse = sin(id.x * 0.5 + id.y * 0.3 + t) * 0.5 + 0.5;

  float trace_bright = (h_trace + v_trace) * pulse;
  float total = max(trace_bright, via_circle);

  total += u_bass * 0.15;

  return vec3(total * 0.7) * (0.6 + u_level * 0.4);
}
