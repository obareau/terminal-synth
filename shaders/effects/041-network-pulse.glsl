/*{
  "name": "Network Pulse",
  "id": "NPL"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  vec3 col = vec3(0.0);
  float node_count = 8.0;
  for(float layer = 0.0; layer < 3.0; layer++) {
    float orbit_r = 0.08 + layer * 0.12;
    float pulse = sin(t * 1.5 + layer) * 0.5 + 0.5;
    for(float i = 0.0; i < node_count; i++) {
      float angle = (i / node_count) * 6.28 + t * (1.0 - layer * 0.1);
      vec2 node_pos = vec2(cos(angle), sin(angle)) * orbit_r;
      float d = length(p - node_pos);
      float node = exp(-d * d * 100.0) * pulse;
      col += mix(vec3(0.2, 0.8, 0.6), vec3(0.8, 0.3, 0.9), layer / 3.0) * node * 0.7;
    }
    float orbit_line = smoothstep(0.01, 0.0, abs(length(p) - orbit_r));
    col += vec3(0.4, 0.6, 1.0) * orbit_line * pulse * 0.4;
  }
  return mix(prev(uv), prev(uv) + col, a * 0.4);
}
