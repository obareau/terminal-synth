/*{
  "name": "Luma Separation",
  "id": "LUM"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;

  // Split into luminance and chrominance
  vec3 c = prev(uv);
  float luma = dot(c, vec3(0.299, 0.587, 0.114));

  // Offset chroma by a few lines (like old video tape artifacts)
  float offset = sin(u_time * 2.0) * 0.01 * a;
  vec3 chroma = prev(uv + vec2(0.0, offset));

  // Re-composite with exaggerated chroma
  vec3 result = vec3(
    luma + (chroma.r - luma) * (1.0 + a),
    luma,
    luma + (chroma.b - luma) * (1.0 + a)
  );

  return mix(c, clamp(result, 0.0, 1.0), a);
}
