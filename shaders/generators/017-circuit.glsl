/*{
  "name": "Circuit",
  "params": [
    {
      "label": "Échelle",
      "key": "u_p0",
      "min": 3,
      "max": 24,
      "default": 8,
      "step": 0.5
    },
    {
      "label": "Vitesse",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.35,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float scale = u_p0 + u_mid * 3.0;
  vec2 p  = uv * vec2(res.x/res.y, 1.0) * scale;
  float t = u_time;
  vec2 id = floor(p), fr = fract(p) - 0.5;
  float sd  = hash(id), sd2 = hash(id + vec2(31.7, 17.3));
  float hz = step(0.5, sd), vt = 1.0 - hz;
  float lineH = smoothstep(0.04,0.0,abs(fr.y)) * step(abs(fr.x),0.49) * hz;
  float lineV = smoothstep(0.04,0.0,abs(fr.x)) * step(abs(fr.y),0.49) * vt;
  float via   = smoothstep(0.12, 0.06, length(fr));
  float speed = mix(0.5, 4.0, u_p1) + u_bass * 1.5;
  float posH  = fract(id.x * 0.37 + t * speed * sign(sd  - 0.5));
  float posV  = fract(id.y * 0.37 + t * speed * sign(sd2 - 0.5));
  float sigH  = smoothstep(0.18,0.0,abs(fr.x-(posH-0.5))) * step(abs(fr.y),0.04) * hz;
  float sigV  = smoothstep(0.18,0.0,abs(fr.y-(posV-0.5))) * step(abs(fr.x),0.04) * vt;
  float sig   = (sigH + sigV) * (0.8 + u_level * 0.5);
  vec3 col = vec3(0.0, 0.02, 0.01);
  col += vec3(0.0, 0.35, 0.15) * (lineH + lineV) * 0.6;
  col += vec3(0.25, 0.65, 0.2) * via * 0.8;
  col += vec3(0.4,  1.0,  0.25) * sig;
  return col;
}
