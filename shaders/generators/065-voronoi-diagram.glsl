/*{
  "name": "Voronoi Diagram",
  "params": [
    {
      "label": "Cells",
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
      "default": 0.5,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = uv;

  float min_dist = 10.0;
  float edge_dist = 10.0;

  // Centres de Voronoi
  for(int i = 0; i < 9; i++) {
    float fi = float(i);
    vec2 center = vec2(
      0.3 + mod(fi, 3.0) * 0.35,
      0.3 + floor(fi / 3.0) * 0.35
    );

    // Perturbation animée
    center += vec2(sin(t + fi * 2.0), cos(t * 0.7 + fi)) * 0.05;

    float d = distance(p, center);
    if(d < min_dist) {
      edge_dist = min_dist - d;
      min_dist = d;
    }
  }

  // Dessiner les bords
  float edge = smoothstep(0.03, 0.0, min_dist);

  vec3 col = vec3(edge * 0.8);

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.06);
  return col;
}
