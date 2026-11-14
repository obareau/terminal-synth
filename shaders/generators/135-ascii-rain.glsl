/*{
  "name": "ASCII Rain",
  "category": "Lofi"
}*/
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  // Matrix-like but with pure ASCII density, no texture
  vec2 cell = floor(uv * vec2(60.0, 36.0));
  vec2 within = fract(uv * vec2(60.0, 36.0));
  float col_id = cell.x;
  // Speed per column
  float spd = 0.8 + fract(sin(col_id * 127.1) * 4375.8) * 1.4;
  // "Character" value — determines brightness/density
  float row_id = floor(t * spd + fract(sin(col_id * 311.7) * 4375.8) * 36.0);
  float cv = fract(sin((row_id + col_id * 7.0) * 127.1) * 43758.5);
  float cv2 = fract(sin((row_id + col_id * 7.0 + 1.0) * 127.1) * 43758.5);
  // Head of the stream is bright white
  float isHead = step(0.95, fract(t * spd + fract(sin(col_id * 311.7) * 4375.8)));
  // Fake glyph — just density pattern in cell
  float glyph = step(cv * 0.8, within.x) * step(cv2 * 0.8, within.y);
  glyph *= step(within.x, 0.9) * step(within.y, 0.9);
  float brightness = mix(cv * 0.6, 1.0, isHead);
  brightness *= (0.5 + u_level * 0.5);
  vec3 fg = mix(vec3(0.0, 0.7, 0.2), vec3(0.8, 1.0, 0.8), isHead);
  return mix(vec3(0.0, 0.03, 0.01), fg * brightness, glyph);
}
