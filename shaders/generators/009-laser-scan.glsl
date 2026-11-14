/*{
  "name": "Laser scan",
  "params": [
    {
      "label": "Vitesse",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.25,
      "step": 0.01
    },
    {
      "label": "Largeur",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.5,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t  = u_time;
  float sp = mix(0.15, 2.0, u_p0) + u_bass * 0.5;
  // triangle wave : aller-retour
  float sc = fract(t * sp * 0.5) * 2.0;
  float scanX = sc > 1.0 ? 2.0 - sc : sc;
  float dx = abs(uv.x - scanX);
  float beamW = mix(40.0, 200.0, u_p1);
  float beam  = exp(-dx * beamW) * (0.9 + u_level * 0.2);
  float trail = exp(-dx * 20.0) * 0.22;
  // FFT révélée sous le laser
  float fft = fftAt(uv.x);
  float bar = step(1.0 - uv.y * 0.85, fft) * exp(-dx * 50.0);
  // Waveform tracée par le laser
  float wline = exp(-length(vec2(uv.x - scanX, uv.y - (waveAt(scanX)*0.75+0.12))) * 50.0);
  vec3 col = vec3(0.0);
  col += vec3(1.0, 0.12, 0.02) * (beam + trail) * (0.5 + u_level * 0.6);
  col += vec3(1.0, 0.5,  0.1 ) * bar;
  col += vec3(0.9, 0.4,  0.0 ) * wline * 0.5;
  return col;
}
