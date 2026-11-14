/*{
  "name": "Particle Swarm",
  "params": [
    {
      "label": "Particles",
      "key": "u_p0",
      "min": 5,
      "max": 20,
      "default": 12,
      "step": 1
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 0.7,
      "step": 0.1
    }
  ],
  "category": "Geometry"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p1 * (0.7 + u_bass * 1.5);
  vec3 col = vec3(0.0);

  // Wireframe particles with connecting lines
  vec2 particle_pos[20];
  for(float i = 0.0; i < u_p0; i++) {
    float fi = i / u_p0;
    float seed = hash(vec2(fi, 0.0));
    float seed2 = hash(vec2(fi, 1.0));

    // Orbiting particle positions
    float orbit_r = (0.1 + seed * 0.25) * (1.0 + u_mid * 0.3);
    float orbit_angle = t * (1.0 - seed2 * 0.5) + fi * 6.28 + u_treble;
    particle_pos[int(i)] = vec2(cos(orbit_angle), sin(orbit_angle)) * orbit_r;

    // Draw particle as wireframe ring
    float d = length(p - particle_pos[int(i)]);
    float particle_size = 0.025 * (0.8 + 0.4 * u_mid);
    float ring = smoothstep(particle_size + 0.004, particle_size - 0.004, d);
    col += vec3(ring * (0.6 + 0.4 * u_bass));
  }

  // Connect nearby particles with wireframe lines
  for(float i = 0.0; i < u_p0; i++) {
    for(float j = i + 1.0; j < u_p0; j++) {
      vec2 pos1 = particle_pos[int(i)];
      vec2 pos2 = particle_pos[int(j)];
      float dist = length(pos2 - pos1);

      // Only draw lines for nearby particles
      if(dist < 0.3 && dist > 0.01) {
        vec2 line_dir = normalize(pos2 - pos1);
        vec2 line_perp = vec2(-line_dir.y, line_dir.x);
        float dist_to_line = abs(dot(p - pos1, line_perp));
        float along_line = dot(p - pos1, line_dir);

        if(along_line > 0.0 && along_line < dist) {
          float line = smoothstep(0.004, 0.0, dist_to_line);
          col += vec3(line * (0.3 + 0.7 * u_bass));
        }
      }
    }
  }

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.15 + u_mid * 0.1);
  return col;
}
