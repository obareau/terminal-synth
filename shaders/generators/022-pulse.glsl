/*{
  "name": "Pulse",
  "params": [
    {
      "label": "Vitesse",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.35,
      "step": 0.01
    },
    {
      "label": "Anneaux",
      "key": "u_p1",
      "min": 3,
      "max": 10,
      "default": 5,
      "step": 1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float r = length(p);
  float t = u_time;
  float bright = 0.0;
  float ringSpeed = mix(0.1, 0.8, u_p0) + u_bass * 0.3;
  int nRings = int(clamp(u_p1, 3.0, 10.0));
  for (int i = 0; i < 10; i++) {
    if (i >= nRings) break;
    float ring = mod(t * ringSpeed - float(i) * 0.22, 1.1);
    float fade = 1.0 - ring / 1.1;
    bright += smoothstep(0.025, 0.0, abs(r - ring * 0.7)) * fade * fade * 1.5;
  }
  bright += exp(-r * 9.0) * (0.3 + u_bass * 1.0);
  bright *= 0.8 + 0.2 * hash(vec2(floor(r * 60.0), floor(atan(p.y,p.x)*20.0)));
  vec3 col = vec3(0.04, 0.35, 0.75) * bright;
  col += vec3(0.95, 0.5, 0.05) * pow(bright, 3.5) * u_bass;
  return col * (0.5 + u_level * 0.7);
}
