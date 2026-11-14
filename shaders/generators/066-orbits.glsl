/*{
  "name": "Orbits",
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
  float t = u_time * 0.5;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Centres orbitaux
  for(int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 center = vec2(cos(fi * 1.57), sin(fi * 1.57)) * 0.5;

    // Orbites
    for(int j = 0; j < 3; j++) {
      float fj = float(j);
      float radius = 0.2 + fj * 0.15;
      float orbit_angle = t * (2.0 - fj * 0.5) + fi * 0.5;

      vec2 planet_pos = center + vec2(cos(orbit_angle), sin(orbit_angle)) * radius;

      float d = length(p - planet_pos);
      float planet = smoothstep(0.04, 0.02, d) * smoothstep(0.02, 0.035, d);

      col += vec3(planet * 0.8);

      // Orbite tracée
      float orbit_line = smoothstep(0.01, 0.0, abs(length(p - center) - radius));
      col += vec3(orbit_line * 0.3);
    }
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.05);
  return clamp(col, vec3(0.0), vec3(1.0));
}
