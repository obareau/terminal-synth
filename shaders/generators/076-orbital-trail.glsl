/*{
  "name": "Orbital Trail",
  "params": [
    {
      "label": "Planets",
      "key": "u_p0",
      "min": 3,
      "max": 8,
      "default": 5,
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
  float t = u_time * u_p1 * (0.6 + u_bass * 2.0);
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // Centre - pulsates with bass
  vec2 center = vec2(0.0);
  float d_center = length(p - center);
  float sun_size = 0.07 + u_bass * 0.02;
  float sun = smoothstep(sun_size + 0.01, sun_size - 0.01, d_center);
  col += vec3(sun * (0.7 + 0.3 * u_bass));

  // Planètes avec trails
  int planet_count = int(u_p0);
  for(int i = 0; i < 8; i++) {
    if(i >= planet_count) break;
    float fi = float(i);
    float radius = 0.15 + fi * (0.15 * (0.8 + 0.4 * u_mid));
    float speed = (2.0 - fi * 0.3) * (0.8 + 0.4 * u_treble);
    float angle = t * speed;

    vec2 planet_pos = center + vec2(cos(angle), sin(angle)) * radius;

    // Trail (trace antérieure)
    for(float trail = 0.0; trail < 1.0; trail += 0.1) {
      float trail_angle = angle - trail * 0.5;
      vec2 trail_pos = center + vec2(cos(trail_angle), sin(trail_angle)) * radius;

      float d_trail = length(p - trail_pos);
      float trail_dot = smoothstep(0.02, 0.0, d_trail);
      col += vec3(trail_dot * (1.0 - trail) * (0.2 + 0.2 * u_bass));
    }

    // Planète actuelle
    float d = length(p - planet_pos);
    float planet_size = 0.03 + u_mid * 0.02;
    float planet = smoothstep(planet_size + 0.01, planet_size - 0.01, d);
    col += vec3(planet * (0.6 + 0.4 * u_bass));

    // Orbite
    float orbit_line = smoothstep(0.007 * (0.8 + 0.4 * u_bass), 0.0, abs(length(p - center) - radius));
    col += vec3(orbit_line * (0.15 + 0.15 * u_bass));
  }

  col *= 0.5 + 0.8 * u_level;
  col += vec3(u_bass * 0.15 + u_treble * 0.05);
  return clamp(col, vec3(0.0), vec3(1.0));
}
