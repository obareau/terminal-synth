/*{
  "name": "Block Art",
  "category": "Lofi"
}*/
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.5;
  // Coarse grid — like old ANSI art
  vec2 cell = floor(uv * vec2(40.0, 25.0));
  vec2 within = fract(uv * vec2(40.0, 25.0));
  vec2 norm = cell / vec2(40.0, 25.0);
  // Plasma value
  float v = sin(norm.x * 8.0 + t + u_bass * 2.0);
  v += sin(norm.y * 6.0 - t * 0.7 + u_mid * 2.5);
  v += sin(length(norm - 0.5) * 12.0 + t * 0.9);
  v = v / 3.0 * 0.5 + 0.5;
  // ANSI 16-color palette approximation (8 pairs)
  float cidx = floor(v * 8.0);
  vec3 palette[8];
  palette[0] = vec3(0.0,  0.0,  0.0);
  palette[1] = vec3(0.67, 0.0,  0.0);
  palette[2] = vec3(0.0,  0.67, 0.0);
  palette[3] = vec3(0.67, 0.67, 0.0);
  palette[4] = vec3(0.0,  0.0,  0.67);
  palette[5] = vec3(0.67, 0.0,  0.67);
  palette[6] = vec3(0.0,  0.67, 0.67);
  palette[7] = vec3(0.67, 0.67, 0.67);
  vec3 bg = palette[int(cidx)];
  vec3 fg = palette[int(mod(cidx + 3.0, 8.0))];
  // Half-block simulation: top half / bottom half
  float half_block = step(0.5, within.y);
  vec3 col = mix(fg, bg, half_block);
  // Audio flash
  col = mix(col, vec3(1.0), step(0.92, u_bass) * step(0.7, fract(v * 8.0)));
  return col;
}
