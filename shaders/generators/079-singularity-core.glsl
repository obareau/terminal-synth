/*{
  "name": "Singularity Core",
  "params": [
    {
      "label": "Collapse",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.5,
      "step": 0.05
    },
    {
      "label": "Density",
      "key": "u_p1",
      "min": 1,
      "max": 10,
      "default": 5,
      "step": 0.5
    }
  ],
  "category": "Interactive"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time;

  float r = length(p);
  float collapse = mix(0.1, 0.02, u_p0);
  float density = u_p1;

  // Particle field collapsing toward center
  float particles = 0.0;
  for(float i = 0.0; i < 5.0; i++) {
    float seed = hash(vec2(i, 0.0));
    float orbital_r = 0.5 + seed * 0.3;
    float angle = t * (1.0 - seed) + seed * 6.28;
    vec2 particle_pos = vec2(cos(angle), sin(angle)) * orbital_r;

    // Pull toward center based on collapse parameter
    particle_pos *= mix(1.0, collapse * 10.0, u_p0);

    float d = length(p - particle_pos);
    float particle = exp(-d * d * density * 10.0);
    particles += particle * (0.3 + u_mid * 0.4);
  }

  // Core energy
  float core = exp(-r * r * density * 20.0);

  vec3 col = mix(vec3(0.01, 0.02, 0.04), vec3(0.6, 0.2, 0.9), core);
  col += vec3(0.9, 0.3, 0.7) * particles;
  col += vec3(1.0, 0.5, 0.2) * smoothstep(0.08, 0.02, r) * (0.4 + u_treble);

  col *= 0.6 + 0.4 * u_level;
  return clamp(col, vec3(0.0), vec3(1.0));
}
