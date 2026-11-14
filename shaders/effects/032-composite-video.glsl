/*{
  "name": "Composite Video",
  "id": "CPV"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;

  // Simulate composite video artifacts
  float freq = 3.579545 / 30.0; // NTSC subcarrier frequency
  float phase = sin(uv.x * 100.0 + u_time * freq) * 0.5 + 0.5;

  // Y (luminance)
  vec3 c = prev(uv);
  float luma = dot(c, vec3(0.299, 0.587, 0.114));

  // U,V (chrominance) with phase distortion
  vec3 chroma = prev(uv + vec2(sin(phase) * 0.01, 0.0));
  float u = chroma.r - luma;
  float v = chroma.b - luma;

  // Reconstruct with artifacts
  vec3 result = vec3(
    luma + 1.13983 * v,
    luma - 0.39465 * u - 0.58060 * v,
    luma + 2.03211 * u
  );

  return mix(c, clamp(result, 0.0, 1.0), a);
}
