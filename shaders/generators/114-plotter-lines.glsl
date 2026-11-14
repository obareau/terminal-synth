/*{
  "name": "PLOTTER LINES",
  "category": "Industrial"
}*/

vec3 render(vec2 uv, vec2 res) {
  float v = 0.0;
  // shared cheap modulation, computed once
  float mod1 = sin(uv.x*9.0 + u_time*0.8)*0.005;
  for (int i=0; i<14; i++) {
    float fi = float(i);
    float y = fi/14.0 + sin(uv.x*4.0 + u_time*0.5 + fi*0.3)*0.015 + mod1;
    v = max(v, smoothstep(0.005, 0.0, abs(uv.y - y)));
  }
  return vec3(v);
}
