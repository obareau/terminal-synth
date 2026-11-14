/*{
  "name": "Lissajous",
  "params": [
    {
      "label": "Échelle",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.5,
      "step": 0.01
    },
    {
      "label": "Épaisseur",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.3,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0) * 2.1;
  float scale = mix(0.4, 1.8, u_p0) + u_level * 0.3;
  // XY scope : deux demi-waveforms en X et Y
  float wx = (waveAt(uv.x * 0.5) * 2.0 - 1.0) * scale;
  float wy = (waveAt(uv.y * 0.5 + 0.5) * 2.0 - 1.0) * scale;
  float thick = mix(0.008, 0.04, u_p1);
  float dx = abs(p.y - wx), dy = abs(p.x - wy);
  float lx = smoothstep(thick, 0.0, dx) + exp(-dx * 38.0) * 0.45;
  float ly = smoothstep(thick, 0.0, dy) + exp(-dy * 38.0) * 0.45;
  float cross = lx * ly;
  vec3 col = vec3(0.0, 0.62, 0.28) * max(lx, ly) * (0.4 + u_level * 0.8);
  col += vec3(1.0, 1.0, 0.45) * cross * 5.0;
  return col;
}
