/*{
  "name": "Wave Rings",
  "id": "WRN"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  float r = length(p);
  float angle = atan(p.y, p.x);
  vec3 col = prev(uv);
  for(float i = 0.0; i < 5.0; i++) {
    float ring_r = i * 0.1 + 0.05;
    float wave = sin(angle * 5.0 + t * 2.0 + i) * 0.5 + 0.5;
    float ring_width = 0.02 * (1.0 + wave * 0.5);
    float ring = smoothstep(ring_width, ring_width * 0.5, abs(r - ring_r));
    vec3 ring_col = vec3(
      0.3 + 0.4 * cos(i * 0.8 + t),
      0.5 + 0.3 * sin(i * 1.2 + t * 0.7),
      0.8 + 0.2 * cos(i * 0.5 + t * 1.3)
    );
    col += ring_col * ring * (0.5 + 0.5 * wave);
  }
  return mix(prev(uv), col, a * 0.45);
}
