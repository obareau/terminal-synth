/*{
  "name": "Terrain (Joy Division)",
  "params": [
    {
      "label": "Lignes",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.55,
      "step": 0.01
    },
    {
      "label": "Amplitude",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.55,
      "step": 0.01
    },
    {
      "label": "Texture",
      "key": "u_p2",
      "min": 0,
      "max": 1,
      "default": 0.35,
      "step": 0.01
    }
  ]
}*/

float jd_n(vec2 p) {
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float jd_sig(float x, float k, float t, float scX) {
  vec2 p = vec2(x*scX+t*0.05, k*0.38);
  // Multi-octave noise for radio-signal character
  float h = jd_n(p)*0.55 + jd_n(p*2.05+vec2(1.7,9.2))*0.30 + jd_n(p*4.3-vec2(5.3,1.7))*0.15;
  // Add a periodic "pulse" component (like actual pulsar signal)
  h += sin(x*8.0*scX + k*0.5 + t*0.03) * 0.08;
  return h;
}
vec3 render(vec2 uv, vec2 res) {
  float t   = u_time;
  float N   = mix(45.0, 90.0, u_p0);          // nombre de lignes
  float amp = mix(0.02, 0.18, u_p1);           // amplitude max
  float scX = mix(1.2,  7.0,  u_p2);           // texture horizontale
  float y   = uv.y;
  float minR = 2.0;
  vec3 result = vec3(0.0);
  // Parcours front-to-back (band 0 = bas = premier plan)
  for (int k = 90; k >= 0; k--) {
    if (float(k) >= N) continue;
    float fk    = float(k);
    float baseY = (fk + 0.5) / N;              // espacement REGULIER
    // Enveloppe gaussienne : cretes plus hautes au centre (comme Unknown Pleasures)
    float center = abs(baseY - 0.5) * 2.4;
    float env    = exp(-center * center * 1.8) * (0.25 + 0.75 * smoothstep(0.9, 0.1, abs(baseY-0.5)*2.0));
    float a      = amp * env * (1.0 + u_bass * 0.7);
    float h      = jd_sig(uv.x, fk, t, scX) * a;
    h += waveAt(uv.x) * a * 0.22 * u_level;
    float ridgeY = baseY - h;                   // crete monte au-dessus de baseY
    if (ridgeY < minR) {
      float dy    = abs(y - ridgeY);
      float thick = 0.006 + amp * 0.04;
      if (dy < thick) {
        float br = 1.0 - dy / thick;
        result = vec3(0.94, 0.97, 1.0) * br * br;
      }
      minR = ridgeY;
    }
    if (y > minR + 0.012) break;
  }
  return result;
}
