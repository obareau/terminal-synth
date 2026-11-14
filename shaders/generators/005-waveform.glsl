/*{
  "name": "Waveform",
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
      "label": "Halo",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.3,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float w = waveAt(uv.x);                          // 0..1, 0.5 = zéro
  float d = abs(uv.y - w);
  float line_thickness = mix(0.004, 0.06, u_p0) * (0.7 + 0.6 * u_bass);
  float line = smoothstep(line_thickness, 0.0, d);
  vec3 col = vec3(0.0, 0.02 * (1.0 - u_mid), 0.04) + vec3(0.10, 0.70, 0.90) * line * (0.6 + 0.4 * u_bass);
  float halo_thickness = mix(0.02, 0.4, u_p1) * (0.8 + 0.4 * u_treble);
  col += vec3(0.10, 0.70, 0.90) * (0.1 + 0.15 * u_mid) * smoothstep(halo_thickness, 0.0, d);
  col *= 0.5 + 0.7 * u_level;
  return col;
}
