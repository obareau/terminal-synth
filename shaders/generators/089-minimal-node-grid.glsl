/*{
  "name": "Minimal Node Grid",
  "params": [
    {
      "label": "Grid Size",
      "key": "u_p0",
      "min": 3,
      "max": 12,
      "default": 6,
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
  ],
  "category": "Geometry"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0) * 2.0;
  float t = u_time * u_p1 * (0.6 + u_bass * 1.8);
  float grid_size = u_p0;
  vec3 col = vec3(0.0);

  // Wireframe grid nodes
  float step_size = 2.0 / grid_size;
  for(float x = -grid_size; x < grid_size; x++) {
    for(float y = -grid_size; y < grid_size; y++) {
      vec2 node_pos = vec2(x, y) * step_size;
      float d = length(p - node_pos);

      // Node as small wireframe ring - pulsates with bass
      float node_size = 0.03 * (0.8 + 0.4 * u_bass);
      float node = smoothstep(node_size + 0.004, node_size - 0.004, d);
      col += vec3(node * (0.6 + 0.4 * u_mid));

      // Horizontal and vertical connections
      if(x < grid_size - 1.0) {
        vec2 next_pos = vec2(x + 1.0, y) * step_size;
        vec2 line_dir = normalize(next_pos - node_pos);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_to_line = abs(dot(p - node_pos, line_perp));
        float along = dot(p - node_pos, line_dir);
        if(along > 0.0 && along < step_size && dist_to_line < 0.004) {
          col += vec3(0.4 + 0.6 * u_bass);
        }
      }

      if(y < grid_size - 1.0) {
        vec2 next_pos = vec2(x, y + 1.0) * step_size;
        vec2 line_dir = normalize(next_pos - node_pos);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_to_line = abs(dot(p - node_pos, line_perp));
        float along = dot(p - node_pos, line_dir);
        if(along > 0.0 && along < step_size && dist_to_line < 0.004) {
          col += vec3(0.4 + 0.6 * u_bass);
        }
      }
    }
  }

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.2 + u_treble * 0.05);
  return col;
}
