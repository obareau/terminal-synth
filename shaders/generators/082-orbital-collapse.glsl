/*{
  "name": "Orbital Collapse",
  "params": [
    {
      "label": "Collapse Speed",
      "key": "u_p0",
      "min": 0,
      "max": 2,
      "default": 0.8,
      "step": 0.1
    },
    {
      "label": "Orbits",
      "key": "u_p1",
      "min": 2,
      "max": 12,
      "default": 6,
      "step": 1
    }
  ],
  "category": "Interactive"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p0;

  vec3 col = vec3(0.01, 0.01, 0.03);

  // Multiple rings collapsing inward
  for(float i = 0.0; i < u_p1; i++) {
    float fi = i / u_p1;
    float delay = fi;

    // Orbit radius shrinking over time
    float max_radius = 0.7 - fi * 0.3;
    float collapse_time = mod(t - delay * 2.0, 3.0);
    float radius = mix(max_radius, 0.02, collapse_time / 3.0);

    // Draw ring
    float r = length(p);
    float ring_width = 0.03 + (1.0 - collapse_time / 3.0) * 0.05;
    float ring = smoothstep(radius + ring_width, radius - ring_width, r) *
                 smoothstep(radius - ring_width, radius + ring_width, r);

    // Color gradient
    float hue = fi + t * 0.2;
    vec3 ring_col = mix(vec3(0.2, 0.5, 1.0), vec3(0.9, 0.3, 0.6), sin(hue * 3.14) * 0.5 + 0.5);

    col += ring_col * ring * (0.4 + collapse_time * 0.3 + u_mid * 0.3);
  }

  // Center flash on collapse
  float center_flash = smoothstep(0.1, 0.0, length(p)) * sin(t * 8.0) * 0.5 + 0.5;
  col += vec3(1.0, 0.7, 0.3) * center_flash * 0.3;

  col *= 0.6 + 0.4 * u_level;
  return clamp(col, vec3(0.0), vec3(1.0));
}
