/*{
  "name": "Signal",
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
      "label": "Amplitude",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.5,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  float tx = fract(uv.x + t * (mix(0.1, 1.2, u_p0) + u_level * 0.2)) - 0.5;
  float peakAmp = mix(0.4, 1.5, u_p1) + u_bass * 0.3;
  // QRS complex ECG
  float sig  = exp(-abs(tx + 0.05) * 80.0) * -0.30;
  sig += exp(-abs(tx)        * 40.0) * peakAmp;
  sig += exp(-abs(tx - 0.05) * 80.0) * -0.20;
  sig += exp(-abs(tx - 0.15) * 15.0) *  0.15;
  float wave = 0.5 + sig;
  float d    = abs(uv.y - wave);
  float line = smoothstep(0.014, 0.0, d);
  float glow = exp(-d * 50.0) * 0.5;
  float peak = exp(-abs(tx) * 40.0) * u_bass;
  float gx = smoothstep(0.005,0.0, mod(uv.x*10.0,1.0)-0.97);
  float gy = smoothstep(0.005,0.0, mod(uv.y* 8.0,1.0)-0.97);
  vec3 col  = vec3(0.0, 0.62, 0.22) * (line + glow);
  col += vec3(0.55, 1.0, 0.45) * line * peak;
  col += vec3(0.0,  0.12, 0.04) * (gx + gy);
  return col;
}
