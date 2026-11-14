/*{
  "name": "Chiptune Bars",
  "category": "Lofi"
}*/
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 p = uv;
  // 8 frequency bars — y=0 is bottom
  float barW = 1.0 / 8.0;
  float bar  = floor(p.x / barW);
  float barX = fract(p.x / barW);
  float freq[8];
  freq[0] = u_bass;
  freq[1] = u_bass * 0.8 + u_mid * 0.2;
  freq[2] = u_bass * 0.5 + u_mid * 0.5;
  freq[3] = u_mid;
  freq[4] = u_mid * 0.7 + u_treble * 0.3;
  freq[5] = u_mid * 0.3 + u_treble * 0.7;
  freq[6] = u_treble;
  freq[7] = u_treble * 0.8 + u_level * 0.2;
  float h = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) == bar) h = freq[i];
  }
  // Pixelated — 16 vertical steps, bars grow from bottom (y=0)
  float stepped = ceil(h * 16.0) / 16.0;
  float lit = step(p.y, stepped);          // lit where y <= stepped height
  // Gap between bars
  float gap = step(0.88, barX);
  // Color: red at bottom, yellow mid, green at top of bar
  float barY = clamp(p.y / max(stepped, 0.001), 0.0, 1.0);
  vec3 barCol = mix(vec3(1.0, 0.1, 0.0), vec3(0.1, 1.0, 0.0), barY);
  vec3 col = mix(vec3(0.0, 0.0, 0.02), barCol, lit * (1.0 - gap));
  return col;
}
