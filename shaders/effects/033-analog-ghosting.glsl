/*{
  "name": "Analog Ghosting",
  "id": "AGH"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;

  // Multi-frame ghosting effect (CRT phosphor persistence)
  vec3 c0 = prev(uv);
  vec3 c1 = fb(uv + vec2(0.002, 0.001));
  vec3 c2 = fb(uv + vec2(0.004, 0.002));

  // Time-varying blend for analog feel
  float t_phase = mod(u_time * 60.0, 3.0) / 3.0;
  float blend = 0.5 + 0.5 * sin(t_phase * 3.14159);

  vec3 ghost = mix(c1, c2, blend) * (0.4 + a * 0.4);
  return mix(c0, c0 + ghost, a);
}
