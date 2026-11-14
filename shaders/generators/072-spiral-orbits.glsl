/*{
  "name": "Spiral Orbits",
  "params": [
    {
      "label": "Spiral Arms",
      "key": "u_p0",
      "min": 1,
      "max": 8,
      "default": 3,
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

  // Spirale d'orbites
  for(int i = 0; i < 20; i++) {
    float fi = float(i);

    // Paramètres spiralés
    float angle = t * 0.3 + fi * 0.3;
    float radius = 0.1 + fi * 0.08;
    float spiral_offset = fi * 0.05;

    // Centre de la spirale
    vec2 center = vec2(cos(angle), sin(angle)) * spiral_offset;

    // Planète
    vec2 planet_pos = center + vec2(cos(angle * 2.0), sin(angle * 2.0)) * radius;
    float d = length(p - planet_pos);

    float planet = smoothstep(0.03, 0.01, d) * smoothstep(0.01, 0.027, d);
    float brightness = 0.3 + 0.7 * fi / 20.0;
    col += vec3(planet * brightness);

    // Orbite
    float orbit_line = smoothstep(0.005, 0.0, abs(length(p - center) - radius));
    col += vec3(orbit_line * 0.2);
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.07);
  return clamp(col, vec3(0.0), vec3(1.0));
}
