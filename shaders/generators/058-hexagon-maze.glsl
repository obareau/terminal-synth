/*{
  "name": "Hexagon Maze",
  "params": [
    {
      "label": "Scale",
      "key": "u_p0",
      "min": 2,
      "max": 20,
      "default": 8,
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
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Grille hexagonale
  float hex_size = 0.25;
  vec2 hex_pos = uv / hex_size;

  // Offset tous les deux rangées
  if(mod(hex_pos.y, 2.0) > 1.0) {
    hex_pos.x += 0.5;
  }

  vec2 hex_center = floor(hex_pos) * hex_size;
  if(mod(floor(hex_pos).y, 2.0) > 0.5) {
    hex_center.x += hex_size * 0.5;
  }

  // Tracer hexagones
  for(int i = 0; i < 6; i++) {
    float angle = float(i) * 1.047;
    vec2 vertex = hex_center + vec2(cos(angle), sin(angle)) * hex_size * 0.3;

    float d = distance(uv, vertex);
    float ring = smoothstep(0.04, 0.01, d) * smoothstep(0.01, 0.035, d);
    col += vec3(ring * 0.8);
  }

  col *= 0.75 + 0.25 * u_level;
  col += vec3(u_bass * 0.05);
  return clamp(col, vec3(0.0), vec3(1.0));
}
