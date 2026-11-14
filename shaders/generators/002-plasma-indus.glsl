/*{
  "name": "Plasma indus",
  "params": [
    {
      "label": "Échelle",
      "key": "u_p0",
      "min": 1,
      "max": 15,
      "default": 6,
      "step": 0.5
    },
    {
      "label": "Vitesse",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.3,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2  p    = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float sc   = u_p0;                      // échelle (défaut 6)
  float t    = u_time * u_p1;            // vitesse (défaut 0.3)
  float warp = 0.6 + u_bass * 1.6;
  float v = sin(p.x * sc * warp + t)
          + sin(p.y * sc - t * 1.3)
          + sin((p.x + p.y) * (sc * 0.83) + t * 0.7);
  v += sin(length(p) * (sc * 1.67) - t * 2.0) * (0.5 + u_mid);
  float g   = 0.5 + 0.5 * sin(v + t);
  vec3  col = mix(vec3(0.02, 0.05, 0.07), vec3(0.9, 0.45, 0.10), g);
  col += u_treble * 0.3 * hash(uv * res + t);
  return col * (0.55 + u_level * 0.9);
}
