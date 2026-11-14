/*{
  "name": "Entropic Decay",
  "params": [
    {
      "label": "Decay Rate",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.4,
      "step": 0.05
    },
    {
      "label": "Particles",
      "key": "u_p1",
      "min": 1,
      "max": 20,
      "default": 8,
      "step": 1
    }
  ],
  "category": "Noise"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * (0.5 + u_bass * 2.0);
  float decay = u_p0 + u_bass * 0.2;

  vec3 col = vec3(0.0);

  // Multiple decaying particles dissolving outward
  int particle_count = int(u_p1 * (0.8 + 0.4 * u_mid));
  for(float i = 0.0; i < 20.0; i++) {
    if(i >= float(particle_count)) break;
    float seed = hash(vec2(i, 0.0));
    float life = mod(t * (0.5 + seed + u_treble) + seed, 2.0); // 0..2, cycles
    float expansion = life * life * (0.8 + decay * 3.0 + u_bass * 0.5);

    // Birth angle
    float birth_angle = seed * 6.28 + u_treble * 0.5;
    vec2 particle_center = vec2(cos(birth_angle), sin(birth_angle)) * (0.2 + u_mid * 0.2);

    float d = length(p - particle_center) / expansion;

    // Dissolving cloud
    float cloud = exp(-d * d * (8.0 + u_bass * 4.0)) * (1.0 - life * 0.5);

    // Color based on life stage - affected by bass
    vec3 particle_col = mix(vec3(1.0, 0.6 + u_bass * 0.2, 0.2), vec3(0.3, 0.1, 0.2 + u_treble * 0.2), life);
    col += particle_col * cloud * (0.2 + 0.2 * u_bass);
  }

  // Background entropy
  float entropy = hash(p * 20.0 + floor(t * 5.0));
  col += vec3(0.05, 0.02, 0.08) * entropy * 0.2;

  col *= 0.6 + 0.4 * u_level;
  return clamp(col, vec3(0.0), vec3(1.0));
}
