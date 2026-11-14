/*{
  "name": "Orbital Mesh",
  "params": [
    {
      "label": "Grid Rings",
      "key": "u_p0",
      "min": 3,
      "max": 12,
      "default": 6,
      "step": 1
    },
    {
      "label": "Rotation",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 0.6,
      "step": 0.1
    }
  ],
  "category": "Geometry"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p1 * (0.8 + 0.4 * u_bass);
  float r = length(p);
  float angle = atan(p.y, p.x) + t + u_treble * 0.5;

  vec3 col = vec3(0.0);

  // Wireframe concentric rings with radial spokes
  for(float i = 1.0; i <= u_p0; i++) {
    float ring_r = i * 0.12 * (1.0 + u_mid * 0.2);

    // Ring - thin wireframe line only, thickness affected by bass
    float ring_thickness = 0.005 * (0.7 + 0.6 * u_bass);
    float ring = smoothstep(ring_thickness, 0.0, abs(r - ring_r));
    col += vec3(ring * (0.6 + 0.4 * u_mid));

    // Radial lines/spokes
    float spoke_count = 6.0 + i * 0.5 + u_treble * 2.0;
    float spoke = sin(angle * spoke_count) * 0.5 + 0.5;
    float spoke_line = smoothstep(0.4, 0.0, spoke);

    // Only draw spokes at ring radius
    if(r > ring_r - 0.01 && r < ring_r + 0.01) {
      col += vec3(spoke_line * (0.4 + 0.6 * u_bass));
    }
  }

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.15 + u_mid * 0.1);
  return col;
}
