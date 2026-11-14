/*{
  "name": "Wave Nodes",
  "params": [
    {
      "label": "Nodes",
      "key": "u_p0",
      "min": 3,
      "max": 15,
      "default": 8,
      "step": 1
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 0.7,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.6;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Vagues horizontales de nœuds
  int row_count = 8;
  for(int row = 0; row < row_count; row++) {
    float y = float(row) / float(row_count) * 2.0 - 1.0;
    int nodes_in_row = 12;

    for(int i = 0; i < nodes_in_row; i++) {
      float fi = float(i);
      float x = (fi + 0.5) / float(nodes_in_row) * 2.0 - 1.0;

      // Perturbation en vague
      float wave = sin(fi * 0.5 + t * 2.0 + float(row) * 0.3) * 0.15;
      vec2 node_pos = vec2(x + wave, y);

      float d = length(p - node_pos);
      float ring = smoothstep(0.05, 0.03, d) * smoothstep(0.03, 0.048, d);
      col += vec3(ring * 0.85);

      // Connexion horizontale
      if(i > 0) {
        float prev_wave = sin((fi - 1.0) * 0.5 + t * 2.0 + float(row) * 0.3) * 0.15;
        vec2 prev_pos = vec2(x - 1.0 / float(nodes_in_row) + prev_wave, y);

        vec2 line_dir = normalize(prev_pos - node_pos);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_along = dot(p - node_pos, line_dir);
        float dist_to_line = abs(dot(p - node_pos, line_perp));

        if(dist_along >= 0.0 && dist_along <= distance(node_pos, prev_pos) && dist_to_line < 0.006) {
          float line = smoothstep(0.008, 0.0, dist_to_line);
          col += vec3(line * 0.6);
        }
      }
    }
  }

  col *= 0.75 + 0.25 * u_level;
  col += vec3(u_bass * 0.1);
  return clamp(col, vec3(0.0), vec3(1.0));
}
