/*{
  "name": "ASCII Density",
  "category": "Lofi"
}*/
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  // Character cell: 8×12 px at effective resolution
  vec2 cell = floor(uv * vec2(80.0, 40.0));
  vec2 within = fract(uv * vec2(80.0, 40.0));
  vec2 cc = cell / vec2(80.0, 40.0) - 0.5;
  // Compute density value for this cell
  float d  = sin(cc.x * 12.0 + t + u_bass * 3.0) * 0.5 + 0.5;
  d += sin(cc.y * 9.0 - t * 1.3 + u_mid * 4.0) * 0.5 + 0.5;
  d += sin(length(cc) * 16.0 - t + u_level * 2.0) * 0.5 + 0.5;
  d /= 3.0;
  // Pick a "character density" — simulate with block fill
  float threshold = fract(d * 7.0); // 7 density levels
  float charDensity = floor(d * 7.0) / 7.0;
  // Dense chars fill more of the cell
  float fill = step(1.0 - charDensity, within.x) * step(1.0 - charDensity, within.y)
             + step(charDensity, within.x) * step(charDensity, 1.0 - within.y) * step(charDensity, 0.5);
  float lit = step(0.5, fract(d * 7.0 + within.x * 0.5 + within.y * 0.5)) * charDensity;
  // Monochrome green CRT
  vec3 fg = vec3(0.0, 1.0, 0.35) * (0.5 + u_level * 0.5);
  vec3 bg = vec3(0.0, 0.06, 0.02);
  return mix(bg, fg, clamp(lit + fill * 0.3, 0.0, 1.0));
}
