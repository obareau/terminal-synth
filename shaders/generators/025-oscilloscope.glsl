/*{
  "name": "Oscilloscope",
  "params": [
    {
      "label": "Épaisseur",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.3,
      "step": 0.01
    },
    {
      "label": "Grille",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.5,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float w  = waveAt(uv.x);
  float d  = abs(uv.y - w);
  float line  = smoothstep(mix(0.005, 0.05, u_p0), 0.0, d);
  float glow  = exp(-d * 55.0) * 0.45;
  float ghost = exp(-abs(uv.y - (1.0 - w)) * 100.0) * 0.09; // reflexion fantome
  float ity = (line + glow + ghost) * (0.4 + u_level * 0.9);
  // grille phosphore
  float gx = smoothstep(0.006, 0.0, mod(uv.x, 0.1) - 0.095) * u_p1;
  float gy = smoothstep(0.006, 0.0, mod(uv.y, 0.125) - 0.120) * u_p1;
  vec3 col = mix(vec3(0.0, 0.55, 0.2), vec3(0.75, 1.0, 0.85), line);
  return col * ity + vec3(0.0, 0.09, 0.03) * (gx + gy);
}
