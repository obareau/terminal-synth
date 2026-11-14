/*{
  "name": "Orbital Chaos",
  "params": [
    {
      "label": "Chaos",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.6,
      "step": 0.05
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 1,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.6;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Système chaotique avec beaucoup de petites orbites
  for(int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    float layer_offset = fl * 0.3;

    for(int i = 0; i < 8; i++) {
      float fi = float(i);
      float angle1 = fi * 0.785 + t * (1.5 + fl * 0.5);
      float radius1 = 0.2 + fl * 0.15;

      vec2 center = vec2(cos(angle1), sin(angle1)) * radius1;

      // Sous-orbites
      for(int j = 0; j < 2; j++) {
        float fj = float(j);
        float angle2 = t * (3.0 + fj) + fi * 0.5;
        float radius2 = 0.08 + fj * 0.06;

        vec2 planet_pos = center + vec2(cos(angle2), sin(angle2)) * radius2;
        float d = length(p - planet_pos);

        float planet = smoothstep(0.02, 0.008, d);
        col += vec3(planet * (0.4 + 0.6 * fj));
      }
    }
  }

  col *= 0.75 + 0.25 * u_level;
  col += vec3(u_bass * 0.08);
  return clamp(col, vec3(0.0), vec3(1.0));
}
