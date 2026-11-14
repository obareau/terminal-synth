/*{
  "name": "Chromatic shift",
  "params": [
    {
      "label": "Scale",
      "key": "u_p0",
      "min": 1,
      "max": 10,
      "default": 3,
      "step": 0.5
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
  float t = u_time * u_p1 * (0.8 + u_bass);
  float shift = (0.008 + u_bass * 0.06) * u_p0;

  float r = sin(uv.x * 10.0 + t) * 0.5 + 0.5;
  r = texture(u_audio, vec2(uv.x + shift, 0.25)).r;

  float g = sin(uv.y * 10.0 + t * 1.3) * 0.5 + 0.5;
  g = texture(u_audio, vec2(uv.x, 0.25)).r;

  float b = sin((uv.x + uv.y) * 10.0 + t * 0.7) * 0.5 + 0.5;
  b = texture(u_audio, vec2(uv.x - shift, 0.25)).r;

  return vec3(r, g, b) * (0.7 + u_level * 0.5);
}
