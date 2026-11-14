/*{
  "name": "Hex",
  "params": [
    {
      "label": "Densité",
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
      "default": 0.3,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p  = uv * vec2(res.x/res.y, 1.0) * (u_p0 + u_mid * 4.0);
  float t = u_time;
  vec2 r = vec2(1.0, 1.732), h = r * 0.5;
  vec2 a = mod(p,   r) - h;
  vec2 b = mod(p+h, r) - h;
  vec2 gv = dot(a,a) < dot(b,b) ? a : b; // offset depuis centre hex
  vec2 id = round(p - gv);               // ID cellule
  float dEdge = 0.5 - max(abs(gv.x)*0.866025 + abs(gv.y)*0.5, abs(gv.y));
  float ch = hash(id * 0.1731);
  float pulse = (0.5 + 0.5*sin(t*(mix(0.1, 0.8, u_p1) + ch * 0.3)+ch*TWO_PI)) * (0.2+u_bass*1.0);
  float edge = smoothstep(0.0,  0.07, dEdge);
  float fill = smoothstep(0.07, 0.38, dEdge) * pulse;
  vec3 col = vec3(0.0, 0.02, 0.03);
  col += vec3(0.0, 0.55, 0.45) * edge * 0.55;
  col += vec3(0.0, 0.20, 0.50) * fill;
  col += vec3(0.9, 0.40, 0.08) * pow(fill, 3.0) * u_bass;
  return col;
}
