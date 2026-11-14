/*{
  "name": "Orbit Nodes Connect",
  "id": "ONC"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  vec3 col = prev(uv);
  for(float i = 0.0; i < 4.0; i++) {
    float orbit_r = 0.1 + i * 0.15;
    float nodes = 6.0 + i * 2.0;
    for(float j = 0.0; j < nodes; j++) {
      float angle = (t * (1.0 - i * 0.1)) + (j / nodes) * 6.28;
      vec2 node_pos = vec2(cos(angle), sin(angle)) * orbit_r;
      float d = length(p - node_pos);
      float node = exp(-d * d * 80.0) * (0.3 + 0.7 * (1.0 - i / 4.0));
      col += mix(vec3(0.2, 0.6, 1.0), vec3(0.8, 0.3, 0.6), i / 4.0) * node;
    }
    float orbit_d = abs(length(p) - orbit_r);
    float orbit_line = smoothstep(0.008, 0.0, orbit_d);
    col += vec3(0.1, 0.3, 0.6) * orbit_line * (0.3 + 0.7 * (1.0 - i / 4.0));
  }
  return mix(prev(uv), col, a * 0.5);
}
