/*{
  "name": "Interférence",
  "params": [
    {
      "label": "Fréquence",
      "key": "u_p0",
      "min": 5,
      "max": 50,
      "default": 22,
      "step": 1
    },
    {
      "label": "Vitesse",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.4,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time;
  float tsp = mix(2.0, 12.0, u_p1);
  vec2 s1 = vec2( 0.30 * cos(t * 0.30),        0.20 * sin(t * 0.38));
  vec2 s2 = vec2(-0.26 * sin(t * 0.33 + 1.0),  0.27 * cos(t * 0.24));
  vec2 s3 = vec2( 0.12 * cos(t * 0.47 + 2.0), -0.23 * sin(t * 0.42 + 1.5));
  float f  = u_p0 + u_bass * 10.0;
  float w1 = sin(length(p - s1) * f           - t * tsp);
  float w2 = sin(length(p - s2) * (f * 1.07)  + t * (tsp * 0.86));
  float w3 = sin(length(p - s3) * (f * 0.94)  - t * (tsp * 0.76)) * (0.4 + u_mid * 0.8);
  float v  = (w1 + w2 + w3) / 3.0 * 0.5 + 0.5;
  vec3 col = mix(vec3(0.0, 0.01, 0.02), vec3(0.02, 0.38, 0.28), v);
  col = mix(col, vec3(0.95, 0.44, 0.04), pow(v, 7.0) * (0.4 + u_bass * 0.8));
  return col;
}
