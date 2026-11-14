/*{
  "name": "Onde",
  "id": "OND"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 c1 = vec2(0.5 + 0.2*sin(t*0.7),  0.5 + 0.2*cos(t*0.5));
  vec2 c2 = vec2(0.5 + 0.25*cos(t*0.4+1.0), 0.5 + 0.15*sin(t*0.6));
  float rip = sin(length(uv-c1)*30.0 - t*8.0)
            + sin(length(uv-c2)*25.0 - t*6.0);
  vec2 off = vec2(cos(rip*PI), sin(rip*PI)) * a * 0.013 * (0.5 + u_bass * 0.7);
  return prev(clamp(uv + off, 0.001, 0.999));
}
