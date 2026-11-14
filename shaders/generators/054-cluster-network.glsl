/*{
  "name": "Cluster Network",
  "params": [
    {
      "label": "Clusters",
      "key": "u_p0",
      "min": 2,
      "max": 10,
      "default": 5,
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
  float t = u_time * 0.5;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // 5 clusters de nœuds
  for(int cluster = 0; cluster < 5; cluster++) {
    float fc = float(cluster);
    float cluster_angle = fc * 1.25 + t * 0.2;
    float cluster_radius = 0.6;
    vec2 cluster_center = vec2(cos(cluster_angle), sin(cluster_angle)) * cluster_radius;

    // 6 nœuds par cluster
    for(int i = 0; i < 6; i++) {
      float fi = float(i);
      float angle = fi * 1.047 + t * 0.5 + fc * 2.0;
      float radius = 0.15;

      vec2 node_pos = cluster_center + vec2(cos(angle), sin(angle)) * radius;
      float d = length(p - node_pos);

      float ring = smoothstep(0.045, 0.03, d) * smoothstep(0.03, 0.042, d);
      col += vec3(ring * 0.9);

      // Connexions intra-cluster
      if(i > 0) {
        float prev_angle = (fi - 1.0) * 1.047 + t * 0.5 + fc * 2.0;
        vec2 prev_pos = cluster_center + vec2(cos(prev_angle), sin(prev_angle)) * radius;

        vec2 line_dir = normalize(prev_pos - node_pos);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_along = dot(p - node_pos, line_dir);
        float dist_to_line = abs(dot(p - node_pos, line_perp));
        float line_len = distance(node_pos, prev_pos);

        if(dist_along >= 0.0 && dist_along <= line_len && dist_to_line < 0.005) {
          float line = smoothstep(0.007, 0.0, dist_to_line);
          col += vec3(line * 0.6);
        }
      }
    }

    // Connexions inter-clusters
    if(cluster < 4) {
      float next_angle = (fc + 1.0) * 1.25 + t * 0.2;
      vec2 next_center = vec2(cos(next_angle), sin(next_angle)) * cluster_radius;

      vec2 line_dir = normalize(next_center - cluster_center);
      vec2 line_perp = vec2(-line_dir.y, line_dir.x);
      float dist_to_line = abs(dot(p - cluster_center, line_perp));
      float dist_along = dot(p - cluster_center, line_dir);
      float line_len = distance(cluster_center, next_center);

      if(dist_along >= 0.0 && dist_along <= line_len && dist_to_line < 0.004) {
        float line = smoothstep(0.006, 0.0, dist_to_line);
        col += vec3(line * 0.4);
      }
    }
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.07);
  return clamp(col, vec3(0.0), vec3(1.0));
}
