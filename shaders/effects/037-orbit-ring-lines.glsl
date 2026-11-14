/*{
  "name": "Orbit Ring Lines",
  "id": "ORL"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time * 0.5;
  vec2 p = uv - 0.5;
  float r = length(p);
  float angle = atan(p.y, p.x) + t;
  float rings = sin(r * 30.0 - t * 3.0) * 0.5 + 0.5;
  float ring_line = smoothstep(0.015, 0.0, abs(mod(r, 0.15) - 0.075));
  float spokes = sin(angle * 8.0) * 0.5 + 0.5;
  float spoke_line = smoothstep(0.01, 0.0, abs(sin(angle * 8.0)));
  float pattern = (ring_line + spoke_line * 0.5) * (rings * 0.6 + 0.4);
  vec3 c = prev(uv);
  return mix(c, c + vec3(0.2, 0.5, 0.9) * pattern, a * 0.4);
}
