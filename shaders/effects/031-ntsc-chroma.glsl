/*{
  "name": "NTSC Chroma",
  "id": "NTC"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  // NTSC-style chroma subsampling (lower chroma resolution)
  float chroma_scale = mix(1.0, 4.0, a);
  vec2 chroma_uv = floor(uv * chroma_scale) / chroma_scale;

  // Sample RGB at different positions
  vec3 c = prev(uv);
  vec3 chroma = prev(chroma_uv);

  // Blend based on amount
  vec3 result = mix(c, vec3(c.r, chroma.g, chroma.b), a);

  return result;
}
