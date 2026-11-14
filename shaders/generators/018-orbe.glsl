/*{
  "name": "Orbe",
  "params": [
    {
      "label": "Rayon",
      "key": "u_p0",
      "min": 0.1,
      "max": 0.48,
      "default": 0.35,
      "step": 0.01
    },
    {
      "label": "Plasma",
      "key": "u_p1",
      "min": 2,
      "max": 16,
      "default": 8,
      "step": 1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = u_time;
  float sphere = smoothstep(u_p0 + u_bass * 0.08, u_p0 - 0.05, r);
  vec2 sp = vec2(a / TWO_PI + 0.5, r / u_p0);
  float plasma = sin(sp.x * u_p1 + t * 2.0 + u_bass * 4.0)
               * sin(sp.y * 6.0 - t * 1.5)
               * sin((sp.x + sp.y) * 10.0 + t * 0.7);
  plasma = plasma * 0.5 + 0.5;
  float halo = exp(-r * 3.0) * 0.4 * (0.5 + u_level);
  vec3 col = mix(vec3(0.02, 0.1, 0.7), vec3(0.9, 0.3, 0.05), plasma) * sphere;
  col = mix(col, vec3(1.0, 0.9, 0.7), pow(plasma, 4.0) * sphere);
  col += vec3(0.04, 0.1, 0.5) * halo;
  return col * (0.5 + u_level * 0.7);
}
