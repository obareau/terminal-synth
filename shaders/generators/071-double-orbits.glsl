/*{
  "name": "Double Orbits",
  "params": [
    {
      "label": "Layers",
      "key": "u_p0",
      "min": 3,
      "max": 10,
      "default": 6,
      "step": 1
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
  float t = u_time * 0.4;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // 2 systèmes orbitaux opposés
  for(int system = 0; system < 2; system++) {
    float fs = float(system);
    vec2 center = vec2(cos(fs * 3.14159), sin(fs * 3.14159)) * 0.4;

    // 4 orbites par système
    for(int orbit = 0; orbit < 4; orbit++) {
      float fo = float(orbit);
      float radius = 0.15 + fo * 0.12;
      float speed = 2.0 - fo * 0.3;

      // Planètes
      for(int i = 0; i < 3; i++) {
        float fi = float(i);
        float angle = t * speed + fi * 2.094 + fs * 1.57;
        vec2 planet_pos = center + vec2(cos(angle), sin(angle)) * radius;

        float d = length(p - planet_pos);
        float planet = smoothstep(0.035, 0.015, d) * smoothstep(0.015, 0.03, d);
        col += vec3(planet * (0.6 + 0.4 * fi / 3.0));

        // Orbite fine
        float orbit_line = smoothstep(0.008, 0.0, abs(length(p - center) - radius));
        col += vec3(orbit_line * 0.25);
      }
    }
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.06);
  return clamp(col, vec3(0.0), vec3(1.0));
}
