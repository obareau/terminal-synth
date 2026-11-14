/*{
  "name": "Tentacle Network",
  "params": [
    {
      "label": "Arms",
      "key": "u_p0",
      "min": 3,
      "max": 12,
      "default": 6,
      "step": 1
    },
    {
      "label": "Frequency",
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
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p1 * (0.5 + u_bass * 2.0);
  vec3 col = vec3(0.0);

  // Wireframe tentacles radiating from center
  for(float i = 0.0; i < u_p0; i++) {
    float fi = i / u_p0;
    float base_angle = fi * 6.28 + u_treble * 0.5;
    float seed = hash(vec2(fi, 0.0));

    // Wireframe segments along each arm
    for(float seg = 0.0; seg < 1.0; seg += 0.08) {
      float wave = sin(seg * 6.0 + t) * (0.08 + u_mid * 0.15);
      float seg_length = seg * (0.4 + u_bass * 0.2);
      vec2 seg_pos = vec2(cos(base_angle + wave), sin(base_angle + wave)) * seg_length;

      // Draw each segment as small ring
      float d = length(p - seg_pos);
      float seg_size = 0.02 * (0.8 + 0.4 * u_mid);
      float segment = smoothstep(seg_size + 0.003, seg_size - 0.003, d);

      col += vec3(segment * (0.6 + 0.4 * u_bass));
    }

    // Connect segments with line
    for(float seg = 0.0; seg < 0.9; seg += 0.08) {
      float wave1 = sin(seg * 6.0 + t) * (0.08 + u_mid * 0.15);
      float wave2 = sin((seg + 0.08) * 6.0 + t) * (0.08 + u_mid * 0.15);

      vec2 pos1 = vec2(cos(base_angle + wave1), sin(base_angle + wave1)) * (seg * (0.4 + u_bass * 0.2));
      vec2 pos2 = vec2(cos(base_angle + wave2), sin(base_angle + wave2)) * ((seg + 0.08) * (0.4 + u_bass * 0.2));

      // Draw line between segments
      vec2 line_dir = normalize(pos2 - pos1);
      vec2 line_perp = vec2(-line_dir.y, line_dir.x);
      float dist_to_line = abs(dot(p - pos1, line_perp));
      float line = smoothstep(0.004, 0.0, dist_to_line);

      col += vec3(line * (0.3 + 0.7 * u_bass));
    }
  }

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.2);
  return col;
}
