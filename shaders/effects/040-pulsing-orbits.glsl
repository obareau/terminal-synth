/*{
  "name": "Pulsing Orbits",
  "id": "POR"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  float r = length(p);
  vec3 col = vec3(0.0);
  for(float i = 1.0; i < 5.0; i++) {
    float pulse = sin(t * 2.0 + i) * 0.5 + 0.5;
    float orbit_r = i * 0.15;
    float ring = smoothstep(0.025 * pulse, 0.005 * pulse, abs(r - orbit_r));
    col += vec3(0.2 + i * 0.1, 0.5, 0.9 - i * 0.1) * ring * pulse;
  }
  float center = exp(-r * r * 50.0);
  col += vec3(1.0, 0.4, 0.2) * center;
  return mix(prev(uv), col, a * 0.5);
}
