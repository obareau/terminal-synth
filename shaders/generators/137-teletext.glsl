/*{
  "name": "Teletext",
  "category": "Lofi"
}*/
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  // Teletext / Minitel — 40×25 cells, hard color blocks
  vec2 cell = floor(uv * vec2(40.0, 25.0));
  vec2 norm = cell / vec2(40.0, 25.0);
  // Simple pattern — cells color from audio + position
  float h = fract(sin(dot(cell, vec2(127.1, 311.7)) + floor(t * 2.0)) * 43758.5);
  float audio_boost = u_level * 0.5;
  float cidx = floor(h * 8.0 * (1.0 + audio_boost));
  cidx = mod(cidx, 8.0);
  // Teletext palette
  vec3 cols[8];
  cols[0] = vec3(0.0, 0.0, 0.0);
  cols[1] = vec3(1.0, 0.0, 0.0);
  cols[2] = vec3(0.0, 1.0, 0.0);
  cols[3] = vec3(1.0, 1.0, 0.0);
  cols[4] = vec3(0.0, 0.0, 1.0);
  cols[5] = vec3(1.0, 0.0, 1.0);
  cols[6] = vec3(0.0, 1.0, 1.0);
  cols[7] = vec3(1.0, 1.0, 1.0);
  vec3 col = cols[int(cidx)];
  // Thick black border between cells
  vec2 within = fract(uv * vec2(40.0, 25.0));
  float border = step(within.x, 0.06) + step(1.0 - 0.06, within.x)
               + step(within.y, 0.08) + step(1.0 - 0.08, within.y);
  col *= 1.0 - clamp(border, 0.0, 1.0);
  return col;
}
