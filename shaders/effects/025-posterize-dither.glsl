/*{
  "name": "Posterize Dither",
  "id": "PDT"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);

  // Ordered dithering with Bayer 4x4 matrix
  vec2 pixelCoord = uv * u_resolution;
  float bayerPattern[16] = float[](
    0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
    12.0/16.0, 4.0/16.0, 14.0/16.0,  6.0/16.0,
    3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
    15.0/16.0, 7.0/16.0, 13.0/16.0,  5.0/16.0
  );

  int bayerIdx = int(mod(pixelCoord.x, 4.0)) + int(mod(pixelCoord.y, 4.0)) * 4;
  float threshold = bayerPattern[bayerIdx];

  // Posterize levels (2-6 levels per channel)
  float levels = mix(256.0, 2.0, a);
  vec3 posterized = floor(c * levels) / levels;

  // Add dithering based on Bayer threshold
  vec3 error = c - posterized;
  float ditherAmount = a * (0.4 + u_level * 0.6);

  vec3 dithered = posterized;
  dithered.r += (threshold - 0.5) * 2.0 * error.r * ditherAmount;
  dithered.g += (threshold - 0.5) * 2.0 * error.g * ditherAmount;
  dithered.b += (threshold - 0.5) * 2.0 * error.b * ditherAmount;

  // Clamp to valid range
  dithered = clamp(dithered, 0.0, 1.0);

  // Re-posterize after dithering
  dithered = floor(dithered * levels) / levels;

  return mix(c, dithered, a);
}
