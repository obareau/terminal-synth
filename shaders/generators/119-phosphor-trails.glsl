/*{
  "name": "PHOSPHOR TRAILS",
  "category": "Industrial"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv - 0.5; p.x *= res.x/res.y;
  float v = 0.0;
  for (int i=0; i<8; i++) {
    float ti = u_time - float(i)*0.07;
    vec2 lp = vec2(sin(ti*1.7), sin(ti*2.3 + 1.3))*0.4;
    float d = length(p - lp);
    v += exp(-d*40.0) * (1.0 - float(i)/8.0);
  }
  return vec3(clamp(v, 0.0, 1.0));
}
