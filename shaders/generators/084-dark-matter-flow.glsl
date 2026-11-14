/*{
  "name": "Dark Matter Flow",
  "params": [
    {
      "label": "Orbits",
      "key": "u_p0",
      "min": 3,
      "max": 10,
      "default": 5,
      "step": 1
    },
    {
      "label": "Speed",
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
  vec3 col = vec3(0.0);

  // Concentric orbital rings - wireframe style
  for(float i = 1.0; i <= u_p0; i++) {
    float orbit_r = i * 0.12 * (1.0 + u_bass * 0.3);
    float ring_thickness = 0.006 * (0.8 + u_mid * 0.4);
    float ring = smoothstep(ring_thickness, 0.0, abs(length(p) - orbit_r));
    col += vec3(ring * 0.8);

    // Radial spokes connecting through orbits
    float angle = atan(p.y, p.x) + u_treble * 0.3;
    float num_spokes = 4.0 + i;
    float spoke = sin(angle * num_spokes) * 0.5 + 0.5;
    float spoke_line = smoothstep(0.4, 0.0, spoke);
    float r = length(p);
    if(r > orbit_r - 0.015 && r < orbit_r + 0.015) {
      col += vec3(spoke_line * (0.4 + 0.6 * u_mid));
    }
  }

  // Center node - pulses with bass
  float center_d = length(p);
  float center_pulse = 0.02 + u_bass * 0.01;
  float center_ring = smoothstep(center_pulse + 0.008, center_pulse - 0.008, center_d);
  col += vec3(center_ring * (0.5 + 0.5 * u_bass));

  col *= 0.5 + 0.8 * u_level;
  col += vec3(u_bass * 0.2);
  return col;
}
