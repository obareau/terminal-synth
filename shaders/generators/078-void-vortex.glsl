/*{
  "name": "Void Vortex",
  "params": [
    {
      "label": "Spin",
      "key": "u_p0",
      "min": 0,
      "max": 2,
      "default": 1.2,
      "step": 0.1
    },
    {
      "label": "Event Horizon",
      "key": "u_p1",
      "min": 0.1,
      "max": 0.8,
      "default": 0.3,
      "step": 0.05
    }
  ],
  "category": "Interactive"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0) * 2.0;
  float t = u_time * u_p0;
  float r = length(p);
  float a = atan(p.y, p.x) + t * 0.5;

  // Event horizon (inner void)
  float horizon = u_p1 + u_level * 0.15;
  float inside_horizon = smoothstep(horizon + 0.02, horizon - 0.02, r);

  // Spiral distortion
  float spiral = sin(a * 3.0 - t + r * 8.0) * 0.5 + 0.5;
  float accretion = smoothstep(0.1, 0.6, r) * (1.0 - smoothstep(horizon, 0.0, r));

  // Deep void center
  vec3 col = mix(vec3(0.02, 0.0, 0.05), vec3(0.15, 0.05, 0.3), spiral * accretion);

  // Accretion disk glow
  float disk = smoothstep(horizon + 0.15, horizon + 0.05, r) *
               smoothstep(horizon - 0.05, horizon - 0.15, r);
  col += vec3(0.8, 0.2, 0.6) * disk * (0.6 + u_mid * 0.8);

  // Event horizon ring
  float ring = smoothstep(horizon + 0.01, horizon - 0.01, r);
  col += vec3(0.9, 0.4, 0.8) * ring * 0.5;

  col *= 0.5 + 0.5 * u_level;
  return clamp(col, vec3(0.0), vec3(1.0));
}
