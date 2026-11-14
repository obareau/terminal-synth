/*{
  "name": "Orbit Spiral",
  "id": "OSP"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float spiral_angle = angle - t * 0.5 + r * 4.0;
  float spiral = sin(spiral_angle * 3.0) * 0.5 + 0.5;
  float node_pulse = exp(-(r - 0.25 - spiral * 0.1) * (r - 0.25 - spiral * 0.1) * 30.0);
  float spiral_ring = smoothstep(0.008, 0.0, abs(mod(angle - t * 0.5 + r * 4.0, 1.0) - 0.5));
  vec3 col = prev(uv);
  col += vec3(0.3, 0.7, 1.0) * node_pulse * 0.6;
  col += vec3(0.2, 0.5, 0.8) * spiral_ring * 0.4;
  return mix(prev(uv), col, a * 0.4);
}
