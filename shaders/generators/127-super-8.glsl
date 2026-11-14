/*{
  "name": "Super 8",
  "category": "Lofi"
}*/
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 p = uv;
  // Film grain
  float grain = fract(sin(dot(p + fract(t * 24.0), vec2(127.1, 311.7))) * 43758.5) - 0.5;
  // Vignette
  float v = 1.0 - smoothstep(0.3, 0.9, length(p - 0.5) * 1.4);
  // Sprocket holes on left edge
  float hole = step(p.x, 0.04) * step(0.5, fract((p.y - t * 0.05) * 8.0));
  // Warm amber color grade
  vec3 col = vec3(0.85, 0.72, 0.45) * v;
  col += grain * 0.18 * (0.5 + u_level);
  // Light leak on beat
  float leak = u_bass * smoothstep(0.8, 1.0, sin(t * 0.7 + p.x * 3.0) * 0.5 + 0.5);
  col = mix(col, vec3(1.0, 0.9, 0.4), leak * 0.4);
  col = mix(col, vec3(0.0), hole);
  // Jitter on beat
  if (u_bass > 0.7) col += vec3(grain * 0.3 * u_bass);
  return clamp(col, 0.0, 1.0);
}
