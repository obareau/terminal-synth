/*{
  "name": "Ellipse Orbits",
  "params": [
    {
      "label": "Count",
      "key": "u_p0",
      "min": 3,
      "max": 12,
      "default": 8,
      "step": 1
    },
    {
      "label": "Eccentricity",
      "key": "u_p1",
      "min": 0.1,
      "max": 0.9,
      "default": 0.6,
      "step": 0.05
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // 5 orbites elliptiques
  for(int i = 0; i < 5; i++) {
    float fi = float(i);
    float eccentricity = 0.3 + fi * 0.1;  // excentricité
    float major_axis = 0.15 + fi * 0.15;
    float minor_axis = major_axis * (1.0 - eccentricity);

    // Angle et position sur ellipse
    float angle = t * (2.0 - fi * 0.2);
    vec2 ellipse_pos = vec2(
      cos(angle) * major_axis,
      sin(angle) * minor_axis
    );

    float d = length(p - ellipse_pos);
    float planet = smoothstep(0.04, 0.02, d) * smoothstep(0.02, 0.035, d);
    col += vec3(planet * (0.5 + 0.5 * fi / 5.0));

    // Dessiner l'orbite elliptique
    float orbit_sample = smoothstep(0.008, 0.0, abs(
      length(p) - length(vec2(
        cos(atan(p.y, p.x)) * major_axis,
        sin(atan(p.y, p.x)) * minor_axis
      ))
    ));
    col += vec3(orbit_sample * 0.25);
  }

  col *= 0.8 + 0.2 * u_level;
  col += vec3(u_bass * 0.06);
  return clamp(col, vec3(0.0), vec3(1.0));
}
