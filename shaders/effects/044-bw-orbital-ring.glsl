/*{
  "name": "BW Orbital Ring",
  "id": "BWR"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  float r = length(p);
  vec3 col = prev(uv);

  // Monochrome orbital rings
  for(float i = 1.0; i < 5.0; i++) {
    float orbit_r = i * 0.12;
    float pulse = 0.5 + 0.5 * sin(t * 1.5 + i * 0.8);
    float ring = smoothstep(0.02 * pulse, 0.005 * pulse, abs(r - orbit_r));
    col += vec3(ring * (0.4 + 0.6 * pulse) * a);
  }

  // Center pulse
  float center = exp(-r * r * 80.0) * (0.3 + 0.4 * sin(t * 2.0));
  col += vec3(center * a);

  return mix(prev(uv), col, a * 0.3);
}
