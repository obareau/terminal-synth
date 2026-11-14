/*{
  "name": "Tentacle Spheres",
  "params": [
    {
      "label": "Spheres",
      "key": "u_p0",
      "min": 3,
      "max": 12,
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
  float t = u_time * u_p1 * (0.7 + u_bass * 1.5);
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Dynamically sized sphere array
  vec2 nodes[12];
  float sizes[12];
  int sphere_count = int(u_p0);

  for(int i = 0; i < 12; i++) {
    if(i >= sphere_count) break;
    float fi = float(i);

    // Positions très aléatoires basées sur du hash
    float h1 = hash(vec2(fi, 0.0));
    float h2 = hash(vec2(fi, 1.0));
    float h3 = hash(vec2(fi, 2.0));

    // Mouvement brownien : dérive progressive avec du sin/cos chaotique
    vec2 base = vec2(h1 * 2.0 - 1.0, h2 * 2.0 - 1.0) * 0.9;
    float drift_x = sin(t * (0.3 + u_mid) + fi * 2.3) * sin(t * (0.2 + u_treble) + fi) * (0.2 + u_bass * 0.2);
    float drift_y = cos(t * (0.25 + u_bass) + fi * 1.7) * cos(t * (0.15 + u_mid) + fi * 0.5) * (0.2 + u_bass * 0.2);

    nodes[i] = base + vec2(drift_x, drift_y);
    sizes[i] = (0.04 + h3 * 0.05) * (0.8 + 0.4 * u_bass);
  }

  // Dessiner les nœuds (vides, juste le contour)
  for(int i = 0; i < 12; i++) {
    if(i >= sphere_count) break;
    float d = length(p - nodes[i]);
    // Juste le ring du nœud, pas rempli
    float ring = smoothstep(sizes[i] + 0.008, sizes[i] - 0.002, d) * smoothstep(sizes[i] - 0.008, sizes[i], d);
    col += vec3(ring * (0.7 + 0.3 * u_bass));

    // Lignes vers les autres sphères proches
    for(int j = i + 1; j < 12; j++) {
      if(j >= sphere_count) break;
      vec2 target = nodes[j];
      vec2 start = nodes[i];
      float dist_to_target = distance(start, target);

      // Connection distance affected by bass
      float connection_dist = 1.5 * (0.8 + 0.4 * u_mid);
      if(dist_to_target > connection_dist) continue;

      // Tracer une ligne simple
      vec2 line_dir = normalize(target - start);
      vec2 line_perp = vec2(-line_dir.y, line_dir.x);

      float dist_along_line = dot(p - start, line_dir);
      float dist_to_line = abs(dot(p - start, line_perp));

      // Vérifier qu'on est entre les deux points
      if(dist_along_line >= 0.0 && dist_along_line <= dist_to_target) {
        if(dist_to_line < 0.008 * (0.8 + 0.4 * u_bass)) {
          float line = smoothstep(0.01, 0.0, dist_to_line);
          float brightness = 0.3 + 0.7 * (0.5 + 0.5 * sin(dist_along_line * 5.0 + float(i) * 0.5 + u_treble));
          col += vec3(line * brightness * (0.5 + 0.5 * u_bass));
        }
      }
    }
  }

  // Fond affected by bass
  float bg = 0.01 * (0.3 + 0.5 * sin(t * (0.1 + u_bass)) + 0.2 * u_mid);
  col += vec3(bg);

  // Audio reactivity très marquée
  col *= 0.5 + 0.8 * u_level;
  col += vec3(u_bass * 0.2 + u_treble * 0.08);

  return clamp(col, vec3(0.0), vec3(1.0));
}
