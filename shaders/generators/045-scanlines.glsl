/*{
  "name": "Scanlines",
  "params": [
    {
      "label": "Frequency",
      "key": "u_p0",
      "min": 5,
      "max": 30,
      "default": 20,
      "step": 1
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 1,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time;

  // Ligne de scan CRT rétro
  float scanline = sin(uv.y * res.y * 0.5 + t) * 0.5 + 0.5;
  float intensity = 0.7 + 0.3 * scanline;

  // Bruit horizontal style CRT
  float noise = hash(vec2(uv.x * 20.0, floor(uv.y * res.y)));

  // Dégradé vertical minimaliste
  float vert = uv.y * 0.5 + 0.5;

  // Audio reactivity en monochrome
  float audio_line = abs(sin(uv.x * 10.0 - t * 2.0)) * u_bass;

  vec3 col = vec3(vert * intensity) * (0.5 + noise * 0.2);
  col += vec3(1.0) * audio_line * 0.3;
  col *= 0.8 + 0.2 * u_level;

  return col;
}
