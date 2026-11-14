/*{
  "name": "RF Noise",
  "id": "RFN"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;

  // Radio frequency interference pattern
  float freq_h = sin(uv.x * 50.0 + u_time * 3.0) * 0.5 + 0.5;
  float freq_v = sin(uv.y * 30.0 + u_time * 2.0) * 0.5 + 0.5;
  float interference = freq_h * freq_v;

  // Add analog noise
  float noise = hash(uv * u_resolution + u_time);
  float rf_noise = mix(interference, noise, 0.5) * a;

  vec3 c = prev(uv);
  return c + vec3(rf_noise * 0.1) - vec3(rf_noise * 0.05, rf_noise * 0.02, 0.0);
}
