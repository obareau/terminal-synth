/*{
  "name": "Moire",
  "params": [
    {
      "label": "Vitesse",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.4,
      "step": 0.01
    },
    {
      "label": "Dérive",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.3,
      "step": 0.01
    },
    {
      "label": "Fréquence",
      "key": "u_p2",
      "min": 0,
      "max": 1,
      "default": 0.5,
      "step": 0.01
    }
  ],
  "category": "Geometry"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float speed = mix(0.1, 1.0, u_p0);
  float freq = mix(30.0, 90.0, u_p2);
  float drift = u_p1 * (0.3 + u_bass * 0.5);

  vec2 c1 = vec2(sin(u_time * speed) * drift, cos(u_time * speed * 0.7) * drift);
  vec2 c2 = vec2(cos(u_time * speed * 0.8 + 2.0) * drift, sin(u_time * speed * 1.1) * drift);
  vec2 c3 = -c1 * 0.5;

  float d1 = length(p - c1);
  float d2 = length(p - c2);
  float d3 = length(p - c3);

  float r1 = 0.5 + 0.5 * sin(d1 * freq - u_time * (1.0 + u_treble * 2.0));
  float r2 = 0.5 + 0.5 * sin(d2 * freq * 1.07 + u_time * (1.2 + u_mid * 2.0));
  float r3 = 0.5 + 0.5 * sin(d3 * freq * 0.93 - u_time * 0.7);

  float pattern = r1 * r2 * r3;
  pattern = pow(pattern, mix(1.0, 4.0, 0.5));

  vec3 colA = mix(vec3(0.05, 0.05, 0.1), vec3(0.1, 0.9, 0.7), u_mid);
  vec3 colB = mix(vec3(0.9, 0.2, 0.5), vec3(0.9, 0.7, 0.1), u_treble);
  vec3 col = mix(colA, colB, pattern);
  col *= 0.3 + pattern * 0.9;

  return col * (0.5 + u_level * 0.7);
}

