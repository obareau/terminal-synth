/*{
  "name": "Fractale",
  "params": [
    {
      "label": "Zoom",
      "key": "u_p0",
      "min": 0.5,
      "max": 8,
      "default": 3.4,
      "step": 0.1
    },
    {
      "label": "Vitesse",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.3,
      "step": 0.01
    },
    {
      "label": "Palette",
      "key": "u_p2",
      "min": 4,
      "max": 20,
      "default": 9,
      "step": 1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 z = (uv - 0.5) * u_p0 * vec2(res.x / res.y, 1.0);
  float t = u_time * mix(0.04, 0.4, u_p1);
  vec2 c = vec2(-0.74 + 0.38 * cos(t + u_bass * 2.0),
                 0.18 + 0.30 * sin(t * 1.3 + u_mid * 1.8));
  float si = -1.0;
  for (int n = 0; n < 48; n++) {
    if (dot(z, z) > 4.0) {
      si = max(0.0, float(n) - log2(log2(dot(z, z))));
      break;
    }
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
  }
  if (si < 0.0) return vec3(0.0);
  float v = fract(si / u_p2 + u_time * 0.04);
  // palette dark : bleu nuit -> cyan -> orange brule -> jaune
  vec3 col = mix(vec3(0.0, 0.04, 0.18), vec3(0.05, 0.65, 0.85), smoothstep(0.0, 0.5, v));
  col = mix(col, vec3(0.92, 0.40, 0.04), smoothstep(0.5, 0.8, v));
  col = mix(col, vec3(0.98, 0.92, 0.50), smoothstep(0.8, 1.0, v));
  return col * (0.5 + u_level * 0.7);
}
