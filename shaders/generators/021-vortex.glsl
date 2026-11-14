/*{
  "name": "Vortex",
  "params": [
    {
      "label": "Spires",
      "key": "u_p0",
      "min": 2,
      "max": 12,
      "default": 5,
      "step": 0.5
    },
    {
      "label": "Vitesse",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.35,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = u_time;
  float twist  = a - (1.0 / max(r, 0.05)) * 0.25 - t * (mix(0.1, 2.0, u_p1) + u_bass * 1.0);
  float spiral = sin(twist * u_p0 + r * 8.0);
  float rings  = sin(r * 22.0 - t * 2.5 + u_mid * 3.0);
  float v = (spiral * 0.6 + rings * 0.4) * 0.5 + 0.5;
  v *= smoothstep(0.0, 0.04, r); // trou noir au centre
  vec3 col = mix(vec3(0.02, 0.0, 0.06), vec3(0.05, 0.3, 0.7), v);
  col = mix(col, vec3(0.7, 0.15, 0.85), pow(v, 3.0));
  col = mix(col, vec3(0.95, 0.95, 1.0), pow(v, 8.0) * u_level);
  return col * (0.5 + u_level * 0.7);
}
