/*{
  "name": "Barcode Rush",
  "params": [
    {
      "label": "Largeur",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.3,
      "step": 0.01
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
  float t = u_time;
  float bw = mix(0.003, 0.02, u_p0);
  float barIdx = floor(uv.x / bw);
  float barX   = fract(uv.x / bw);
  float jitter  = fract(sin(barIdx * 127.1) * 4375.8);
  float scroll  = floor(barIdx + t * mix(5.0, 40.0, u_p1) * (0.5 + jitter * 0.5));
  float on = step(0.45, fract(sin(scroll*311.7 + barIdx*0.13)*43758.5));
  float gap = step(0.90, barX);
  float bright = on * (1.0 - gap) * (0.35 + u_level*0.65 + u_bass*0.25);
  // Red scanner beam sweeping vertically
  float scan = exp(-abs(uv.y - (0.5 + sin(t*0.9)*0.35)) * 55.0) * u_mid;
  vec3 col = vec3(bright) + vec3(scan*0.9, scan*0.05, 0.0);
  return clamp(col, 0.0, 1.0);
}
