/*{
  "name": "Glitch Minimal"
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * (0.8 + u_bass * 1.5);

  // Corruption minimaliste - audio-reactive
  vec2 p = uv;

  // Décalage aléatoire par scanlines - affected by bass
  float scan = floor(p.y * 20.0);
  float glitch_intensity = abs(sin(scan * 0.1 + t * (3.0 + u_treble * 2.0))) * step(0.8, fract(scan * 0.3 + t)) * (0.5 + 0.5 * u_bass);

  // Offset et duplication
  float offset = glitch_intensity * (0.06 + u_mid * 0.12);
  float r = texture(u_audio, vec2(p.x + offset, p.y * 0.25)).r;
  float g = texture(u_audio, vec2(p.x, (p.y + offset) * 0.25)).r;
  float b = texture(u_audio, vec2(p.x - offset, p.y * 0.25)).r;

  // Pattern blocky - influenced by bass
  float block = floor(p.x * (12.0 + u_treble * 4.0));
  float block_glitch = step(0.9, fract(block * 0.1 + t * (2.0 + u_mid))) * glitch_intensity;

  float brightness = max(max(r, g), b) * (1.0 - block_glitch) + block_glitch;

  brightness *= 0.5 + 0.8 * u_level;
  brightness += u_bass * 0.2;

  return vec3(brightness);
}
