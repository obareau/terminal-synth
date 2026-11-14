/*{
  "name": "Node Grid",
  "params": [
    {
      "label": "Grid Size",
      "key": "u_p0",
      "min": 3,
      "max": 10,
      "default": 5,
      "step": 1
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 0.3,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.3;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Grille régulière de nœuds
  float grid_scale = 5.0;
  vec2 grid_pos = floor(uv * grid_scale);
  vec2 grid_frac = fract(uv * grid_scale);

  // Distance au nœud le plus proche
  float min_dist = 10.0;
  vec2 closest_node = vec2(0.0);

  for(int dx = -1; dx <= 1; dx++) {
    for(int dy = -1; dy <= 1; dy++) {
      vec2 node_grid = grid_pos + vec2(float(dx), float(dy));
      vec2 node_world = (node_grid + 0.5) / grid_scale;

      // Perturbation animée
      float h = hash(node_grid);
      node_world += vec2(sin(t + h * 10.0), cos(t * 0.8 + h * 8.0)) * 0.04;

      float d = distance(uv, node_world);
      if(d < min_dist) {
        min_dist = d;
        closest_node = node_world;
      }

      // Dessiner le nœud
      float ring = smoothstep(0.015, 0.008, d) * smoothstep(0.008, 0.012, d);
      col += vec3(ring * 0.85);
    }
  }

  // Lignes vers 4 plus proches voisins
  for(int i = 0; i < 4; i++) {
    float angle = float(i) * 1.5708;  // 4 directions
    vec2 dir = normalize(vec2(cos(angle), sin(angle)));
    float step_size = 1.0 / grid_scale;

    // Tracer jusqu'au nœud suivant
    for(float s = 0.0; s <= 1.5; s += 0.1) {
      vec2 point = closest_node + dir * step_size * s;
      if(point.x < 0.0 || point.x > 1.0 || point.y < 0.0 || point.y > 1.0) break;

      vec2 perp = vec2(-dir.y, dir.x);
      float dist_to_line = abs(dot(uv - point, perp));

      if(dist_to_line < 0.008) {
        float line = smoothstep(0.01, 0.0, dist_to_line);
        col += vec3(line * 0.6);
      }
    }
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.05);
  return clamp(col, vec3(0.0), vec3(1.0));
}
