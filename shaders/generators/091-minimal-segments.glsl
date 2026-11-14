/*{
  "name": "Minimal Segments",
  "params": [
    {
      "label": "Segments",
      "key": "u_p0",
      "min": 5,
      "max": 20,
      "default": 12,
      "step": 1
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.4,
      "step": 0.05
    }
  ],
  "category": "Geometry"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p1 * (0.8 + u_bass * 1.5);
  vec3 col = vec3(0.0);

  // Radiating wireframe segments
  for(float i = 0.0; i < u_p0; i++) {
    float fi = i / u_p0;
    float angle = t + fi * 6.28 + u_treble * 0.3;
    vec2 dir = vec2(cos(angle), sin(angle));

    // Segment length with wave modulation
    float wave = sin(fi * 8.0 + t) * (0.08 + u_mid * 0.15);
    float seg_length = (0.25 + u_bass * 0.15) + wave;

    // Segment tip
    vec2 tip = dir * seg_length;

    // Draw segment as line from center to tip
    vec2 line_dir = dir;
    vec2 line_perp = vec2(-line_dir.y, line_dir.x);

    float dist_to_line = abs(dot(p - vec2(0.0), line_perp));
    float along_line = dot(p - vec2(0.0), line_dir);

    if(along_line > 0.0 && along_line < seg_length && dist_to_line < 0.004 * (0.7 + 0.6 * u_bass)) {
      col += vec3(0.6 + 0.4 * u_bass);
    }

    // Draw endpoint as small ring
    float d_tip = length(p - tip);
    float endpoint_size = 0.02 * (0.8 + 0.4 * u_mid);
    float endpoint = smoothstep(endpoint_size + 0.003, endpoint_size - 0.003, d_tip);
    col += vec3(endpoint * (0.6 + 0.4 * u_bass));
  }

  // Center ring - pulses with bass
  float center_d = length(p);
  float center_pulse = 0.02 + u_bass * 0.008;
  float center_ring = smoothstep(center_pulse + 0.01, center_pulse - 0.01, center_d);
  col += vec3(center_ring * (0.5 + 0.5 * u_bass));

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.15 + u_mid * 0.08);
  return col;
}
