/*{
  "name": "Sine Chip",
  "category": "Lofi"
}*/
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 p = uv - 0.5;
  // Multiple quantized sine waves — chiptune oscilloscope
  float y1 = sin(p.x * 20.0 + t * 3.0 + u_bass * 5.0) * 0.15;
  float y2 = sin(p.x * 31.0 + t * 4.5 + u_mid  * 6.0) * 0.09;
  float y3 = sin(p.x * 47.0 + t * 7.0 + u_treble * 8.0) * 0.05;
  // Quantize y to pixel grid (height = 64 rows)
  y1 = floor(y1 * 32.0) / 32.0;
  y2 = floor(y2 * 32.0) / 32.0;
  y3 = floor(y3 * 32.0) / 32.0;
  // Draw each wave as a line
  float px = floor(p.y * 64.0) / 64.0;
  float l1 = step(abs(px - y1), 1.0 / 64.0) * 1.5;
  float l2 = step(abs(px - y2), 1.0 / 64.0) * 1.2;
  float l3 = step(abs(px - y3), 1.0 / 64.0) * 0.9;
  // Pixel grid
  float grid = (step(0.93, fract(uv.x * 128.0)) + step(0.93, fract(uv.y * 64.0))) * 0.06;
  vec3 col = vec3(0.02, 0.06, 0.02);
  col += vec3(0.0, 1.0, 0.3) * l1;
  col += vec3(0.2, 0.6, 1.0) * l2;
  col += vec3(1.0, 0.4, 0.0) * l3;
  col -= vec3(grid);
  return clamp(col, 0.0, 1.0);
}
