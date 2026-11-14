/*{
  "name": "Pulsing Network",
  "params": [
    {
      "label": "Nodes",
      "key": "u_p0",
      "min": 4,
      "max": 20,
      "default": 10,
      "step": 1
    },
    {
      "label": "Pulse Speed",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.7,
      "step": 0.1
    }
  ],
  "category": "Geometry"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p1 * (1.0 + u_bass * 2.0);
  vec3 col = vec3(0.0);

  // Wireframe network with pulsing nodes
  vec2 node_pos[25];
  float node_pulse[25];

  for(float i = 0.0; i < min(u_p0, 25.0); i++) {
    float seed_x = hash(vec2(i, 0.0));
    float seed_y = hash(vec2(i, 1.0));

    // Random node positions
    node_pos[int(i)] = (vec2(seed_x, seed_y) - 0.5) * 1.8;

    // Pulsing animation - faster with bass
    node_pulse[int(i)] = 0.5 + 0.5 * sin(t * (2.0 + u_mid) + i * 0.5);

    // Draw pulsing wireframe ring
    float d = length(p - node_pos[int(i)]);
    float size = 0.03 * (0.7 + 0.6 * node_pulse[int(i)] + u_bass * 0.2);
    float ring = smoothstep(size + 0.004, size - 0.004, d);
    col += vec3(ring * (0.5 + 0.5 * node_pulse[int(i)]));
  }

  // Connect nearby nodes with wireframe lines
  for(float i = 0.0; i < min(u_p0, 25.0); i++) {
    for(float j = i + 1.0; j < min(u_p0, 25.0); j++) {
      vec2 pos1 = node_pos[int(i)];
      vec2 pos2 = node_pos[int(j)];
      float dist = length(pos2 - pos1);

      // Only connect reasonably close nodes
      if(dist < 0.5 && dist > 0.01) {
        vec2 line_dir = normalize(pos2 - pos1);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_to_line = abs(dot(p - pos1, line_perp));
        float along_line = dot(p - pos1, line_dir);

        if(along_line > 0.0 && along_line < dist && dist_to_line < 0.004) {
          float line_brightness = 0.4 + 0.6 * (node_pulse[int(i)] + node_pulse[int(j)]) / 2.0;
          col += vec3(line_brightness * (0.4 + 0.6 * u_bass));
        }
      }
    }
  }

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.2 + u_treble * 0.08);
  return col;
}
