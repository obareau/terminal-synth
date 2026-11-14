/*{
  "name": "Orbital Nodes",
  "id": "ORN"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  vec3 col = prev(uv);
  float orbit_count = 4.0;
  float nodes_per_orbit = 6.0;
  for(float orbit_idx = 0.0; orbit_idx < orbit_count; orbit_idx++) {
    float orbit_r = 0.06 + orbit_idx * 0.1;
    for(float node_idx = 0.0; node_idx < nodes_per_orbit; node_idx++) {
      float angle = (node_idx / nodes_per_orbit) * 6.28 + t * 0.8;
      float radius_modulation = sin(t + orbit_idx + node_idx) * 0.02;
      vec2 node_pos = vec2(cos(angle), sin(angle)) * (orbit_r + radius_modulation);
      float d = length(p - node_pos);
      float brightness = sin(t + node_idx * 2.0 + orbit_idx) * 0.5 + 0.5;
      float node = exp(-d * d * 120.0) * brightness;
      vec3 hue = vec3(
        0.5 + 0.5 * cos(orbit_idx * 2.0),
        0.5 + 0.5 * sin(orbit_idx),
        0.5 + 0.5 * cos(orbit_idx + node_idx)
      );
      col += hue * node * 0.6;
    }
  }
  return mix(prev(uv), col, a * 0.35);
}
