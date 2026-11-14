/*{
  "name": "Dithering",
  "id": "DTH"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);
  // Quantize color levels (2-8 levels per channel)
  float levels = mix(256.0, 2.0, a);
  vec3 quant = floor(c * levels) / levels;
  // Floyd-Steinberg error diffusion: distribute quantization error
  vec3 error = c - quant;
  vec2 px = 1.0 / u_resolution;
  // Apply dither by adding weighted error from neighboring pixels
  vec3 right = prev(clamp(uv + vec2(px.x, 0.0), 0.001, 0.999));
  vec3 down = prev(clamp(uv + vec2(0.0, -px.y), 0.001, 0.999));
  vec3 diag = prev(clamp(uv + vec2(px.x, -px.y), 0.001, 0.999));
  // Floyd-Steinberg kernel weights: right=7/16, down-left=3/16, down=5/16, down-right=1/16
  // Approximate by distributing error to neighbors
  vec3 dither = error * 0.43 * (
    right * 0.44 + down * 0.31 + diag * 0.062 +
    (right + down + diag) * hash(uv * u_resolution + u_time)
  );
  return mix(c, quant + dither * (0.3 + u_treble * 0.7), a);
}
