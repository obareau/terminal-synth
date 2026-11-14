/*{
  "name": "Perlin-like noise",
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
      "default": 0.5,
      "step": 0.1
    }
  ]
}*/

float perlin_like(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * (0.3 + u_bass * 1.5);
  float n1 = perlin_like(uv * (3.0 + u_treble * 3.0) + t);
  float n2 = perlin_like(uv * (6.0 + u_mid * 4.0) - t * 0.7);
  float n3 = perlin_like(uv * 12.0 + t * 1.3);

  float fbm = n1 * 0.5 + n2 * 0.25 + n3 * 0.125;
  vec3 col = mix(vec3(0.1, 0.2 * (1.0 - u_mid), 0.4), vec3(0.8 + u_treble * 0.2, 0.4 + u_bass * 0.3, 0.1), fbm);
  col += fftAt(uv.x) * (0.2 + 0.3 * u_bass);
  col *= 0.5 + 0.7 * u_level;
  return col;
}
