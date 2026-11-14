/*{
  "name": "Neurones",
  "params": [
    {
      "label": "Vitesse signal",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.4,
      "step": 0.01
    },
    {
      "label": "Intensité",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.5,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float asp = res.x / res.y;
  vec2 p = uv * vec2(asp, 1.0);
  float t = u_time;
  float bright = 0.0;
  float sigSpeed = mix(1.0, 8.0, u_p0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 n1 = vec2(hash(vec2(fi, 10.0)) * asp, 0.08 + hash(vec2(fi, 20.0)) * 0.84);
    float pulse = 0.5 + 0.5 * sin(t * (0.7 + hash(vec2(fi, 30.0)) * 1.2) + fi * 0.9);
    // noeud
    bright += 0.012 / (length(p - n1) + 0.02) * pulse * (0.4 + u_level * 0.8) * (0.5 + u_p1);
    // axones vers 2 voisins
    for (int jj = 1; jj <= 2; jj++) {
      float fj = mod(fi + float(jj) * 2.0 + 1.0, 7.0);
      vec2 n2  = vec2(hash(vec2(fj, 10.0)) * asp, 0.08 + hash(vec2(fj, 20.0)) * 0.84);
      vec2 ab  = n2 - n1;
      float s  = clamp(dot(p - n1, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
      float dl = length(p - (n1 + ab * s));
      float sig = sin(t * sigSpeed - s * 9.0 + fi * 2.3) * 0.5 + 0.5;
      bright += 0.003 / (dl + 0.007) * sig * pulse * (0.25 + u_bass * 0.55) * (0.5 + u_p1);
    }
  }
  float v = min(bright, 1.5);
  return mix(vec3(0.0, 0.55, 0.25), vec3(0.5, 0.95, 0.35), smoothstep(0.0, 1.0, v * 0.7)) * v;
}
