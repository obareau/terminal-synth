/*{
  "name": "Spirale",
  "params": [
    {
      "label": "Tours",
      "key": "u_p0",
      "min": 1,
      "max": 20,
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
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = u_time;
  float turns = u_p0 + u_mid * 2.0;
  float sv = r * turns - (a + PI) / TWO_PI + t * (mix(0.1, 1.5, u_p1) + u_bass * 0.5);
  float d  = abs(fract(sv) - 0.5);
  float thick = 0.07 + fftAt(r) * 0.22;
  float arm  = smoothstep(thick, 0.0, d);
  float glow = exp(-d * 11.0) * 0.4;
  float hue  = fract(a / TWO_PI + t * 0.08);
  vec3 col = mix(vec3(0.9, 0.3, 0.05), vec3(0.05, 0.75, 0.9), hue);
  return col * (arm + glow) * (0.5 + u_level * 0.7);
}
