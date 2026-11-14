/*{
  "name": "Spiral Nodes",
  "params": [
    {
      "label": "Count",
      "key": "u_p0",
      "min": 5,
      "max": 20,
      "default": 15,
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
  float t = u_time * 0.5;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Spirale de nœuds
  for(int i = 0; i < 15; i++) {
    float fi = float(i);
    float angle = fi * 0.5 + t * 0.3;
    float radius = 0.3 + fi * 0.08;

    vec2 node_pos = vec2(cos(angle), sin(angle)) * radius;
    float d = length(p - node_pos);

    // Nœud
    float ring = smoothstep(0.08, 0.06, d) * smoothstep(0.06, 0.075, d);
    col += vec3(ring * 0.9);

    // Connexion avec le nœud précédent
    if(i > 0) {
      float prev_angle = (fi - 1.0) * 0.5 + t * 0.3;
      float prev_radius = 0.3 + (fi - 1.0) * 0.08;
      vec2 prev_pos = vec2(cos(prev_angle), sin(prev_angle)) * prev_radius;

      vec2 line_dir = normalize(prev_pos - node_pos);
      vec2 line_perp = vec2(-line_dir.y, line_dir.x);
      float dist_along = dot(p - node_pos, line_dir);
      float dist_to_line = abs(dot(p - node_pos, line_perp));
      float line_len = distance(node_pos, prev_pos);

      if(dist_along >= 0.0 && dist_along <= line_len && dist_to_line < 0.008) {
        float line = smoothstep(0.01, 0.0, dist_to_line);
        col += vec3(line * 0.7);
      }
    }
  }

  col *= 0.75 + 0.25 * u_level;
  col += vec3(u_bass * 0.08);
  return clamp(col, vec3(0.0), vec3(1.0));
}
