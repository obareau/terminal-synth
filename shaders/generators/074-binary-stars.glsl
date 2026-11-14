/*{
  "name": "Binary Stars",
  "params": [
    {
      "label": "Stars",
      "key": "u_p0",
      "min": 2,
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
  float t = u_time * 0.4;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Star 1
  vec2 star1_pos = vec2(-0.35, 0.0);
  float d_star1 = length(p - star1_pos);
  float star1 = smoothstep(0.06, 0.04, d_star1) * smoothstep(0.04, 0.055, d_star1);
  col += vec3(star1 * 0.9);
  col += vec3(exp(-d_star1 * 8.0) * 0.3);

  // Star 2
  vec2 star2_pos = vec2(0.35, 0.0);
  float d_star2 = length(p - star2_pos);
  float star2 = smoothstep(0.06, 0.04, d_star2) * smoothstep(0.04, 0.055, d_star2);
  col += vec3(star2 * 0.9);
  col += vec3(exp(-d_star2 * 8.0) * 0.3);

  // Orbites autour star 1
  for(int i = 0; i < 3; i++) {
    float fi = float(i);
    float radius = 0.1 + fi * 0.08;
    float angle = t * (2.5 - fi * 0.3);

    vec2 planet_pos = star1_pos + vec2(cos(angle), sin(angle)) * radius;
    float d = length(p - planet_pos);

    float planet = smoothstep(0.035, 0.015, d) * smoothstep(0.015, 0.03, d);
    col += vec3(planet * 0.7);

    float orbit_line = smoothstep(0.006, 0.0, abs(length(p - star1_pos) - radius));
    col += vec3(orbit_line * 0.2);
  }

  // Orbites autour star 2
  for(int i = 0; i < 3; i++) {
    float fi = float(i);
    float radius = 0.1 + fi * 0.08;
    float angle = t * (2.5 - fi * 0.3) + 1.047;

    vec2 planet_pos = star2_pos + vec2(cos(angle), sin(angle)) * radius;
    float d = length(p - planet_pos);

    float planet = smoothstep(0.035, 0.015, d) * smoothstep(0.015, 0.03, d);
    col += vec3(planet * 0.7);

    float orbit_line = smoothstep(0.006, 0.0, abs(length(p - star2_pos) - radius));
    col += vec3(orbit_line * 0.2);
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.07);
  return clamp(col, vec3(0.0), vec3(1.0));
}
