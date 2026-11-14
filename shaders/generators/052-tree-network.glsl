/*{
  "name": "Tree Network",
  "params": [
    {
      "label": "Branches",
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
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Arbre hiérarchique de nœuds
  for(int level = 0; level < 4; level++) {
    int node_count = int(pow(2.0, float(level)));
    float y_offset = 0.8 - float(level) * 0.3;

    for(int i = 0; i < node_count; i++) {
      if(i >= 8) break;  // Limite pour perf

      float fi = float(i);
      float x = (fi + 0.5) / float(node_count) * 2.0 - 1.0;
      vec2 node_pos = vec2(x, y_offset);

      // Perturbation
      node_pos += vec2(sin(t + fi * 0.7) * 0.1, cos(t * 0.5 + fi) * 0.05);

      float d = length(p - node_pos);
      float ring = smoothstep(0.06, 0.04, d) * smoothstep(0.04, 0.055, d);
      col += vec3(ring * 0.9);

      // Connexion parent
      if(level > 0) {
        int parent = i / 2;
        float parent_x = (float(parent) + 0.5) / float(node_count / 2) * 2.0 - 1.0;
        vec2 parent_pos = vec2(parent_x, y_offset + 0.3);
        parent_pos += vec2(sin(t + float(parent) * 0.7) * 0.1, cos(t * 0.5 + float(parent)) * 0.05);

        vec2 line_dir = normalize(parent_pos - node_pos);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_along = dot(p - node_pos, line_dir);
        float dist_to_line = abs(dot(p - node_pos, line_perp));
        float line_len = distance(node_pos, parent_pos);

        if(dist_along >= 0.0 && dist_along <= line_len && dist_to_line < 0.006) {
          float line = smoothstep(0.008, 0.0, dist_to_line);
          col += vec3(line * 0.65);
        }
      }
    }
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.06);
  return clamp(col, vec3(0.0), vec3(1.0));
}
