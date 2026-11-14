/*{
  "name": "VHS Static",
  "category": "Lofi"
}*/
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 p = uv;
  // Horizontal tracking lines
  float line = floor(p.y * 240.0);
  float roll = sin(t * 0.3 + line * 0.04) * 0.003 * (0.5 + u_bass);
  p.x += roll;
  // Static noise
  float n = fract(sin(dot(p * vec2(127.1, 311.7) + t, vec2(1.0))) * 43758.5453);
  // Scanline darkness
  float scan = 0.85 + 0.15 * step(0.5, fract(p.y * 240.0));
  // Color bleed — slight rgb split
  float r = n * 0.12 * (0.3 + u_level) * scan;
  float g = n * 0.08 * (0.3 + u_mid)   * scan;
  float b = n * 0.06 * (0.3 + u_treble) * scan;
  // Tape crinkle — warm brownish base
  vec3 base = vec3(0.18, 0.12, 0.08) * scan;
  // Dropout bands
  float drop = step(0.97, fract(sin(line * 0.07 + t * 1.3) * 327.4)) * 0.6 * u_bass;
  base = mix(base, vec3(0.9, 0.85, 0.7), drop);
  return base + vec3(r, g, b);
}
