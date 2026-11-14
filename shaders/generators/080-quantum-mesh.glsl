/*{
  "name": "Quantum Mesh",
  "params": [
    {
      "label": "Scale",
      "key": "u_p0",
      "min": 2,
      "max": 20,
      "default": 8,
      "step": 1
    },
    {
      "label": "Breakdown",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.3,
      "step": 0.05
    }
  ],
  "category": "Geometry"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * (0.2 + u_bass * 1.2);

  float scale = u_p0 * (0.8 + 0.4 * u_mid);
  float breakdown = u_p1 + u_bass * 0.3;

  // Crystalline lattice
  vec2 gp = p * scale;
  vec2 id = floor(gp);
  vec2 frac = fract(gp);

  // Grid lines - thickness affected by bass
  float grid_thickness = 0.04 * (0.7 + 0.6 * u_bass);
  float grid = smoothstep(grid_thickness, 0.0, min(frac.x, 1.0 - frac.x)) +
               smoothstep(grid_thickness, 0.0, min(frac.y, 1.0 - frac.y));

  // Lattice nodes - size pulsates with bass
  float node_size = 0.06 * (0.8 + 0.4 * u_mid);
  float nodes = smoothstep(node_size, node_size * 0.3, length(frac - 0.5));

  // Breakdown effect: corrupt grid based on parameter and time
  float corruption = hash(id + sin(t + u_treble));
  float breakdown_fade = smoothstep(0.3, 0.7, breakdown + corruption * (0.2 + u_bass));

  grid *= breakdown_fade * (0.6 + 0.4 * u_bass);
  nodes *= breakdown_fade * (0.6 + 0.4 * u_bass);

  // Oscillating energy at nodes - faster with bass
  float energy = sin(length(id) * (2.0 + u_treble) + t) * 0.5 + 0.5;

  vec3 col = vec3(0.0);
  col += vec3(0.1, 0.4 + u_bass * 0.2, 0.8) * grid * (0.3 + 0.3 * u_bass);
  col += vec3(0.3, 0.8, 1.0 + u_treble * 0.2) * nodes * energy * (0.6 + 0.4 * u_bass);

  // Glitch artifacts from breakdown
  col += vec3(0.8, 0.2 + u_bass * 0.3, 0.5) * smoothstep(1.0, 0.7, breakdown_fade) * (0.2 + 0.2 * u_mid);

  col *= 0.4 + 0.8 * u_level;
  col += vec3(u_bass * 0.2 + u_treble * 0.1);
  return clamp(col, vec3(0.0), vec3(1.0));
}
