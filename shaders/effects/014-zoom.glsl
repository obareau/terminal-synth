/*{
  "name": "Zoom",
  "id": "ZOM"
}*/

vec3 process(vec2 uv) {
  float a   = u_amount;
  vec2  dir = uv - 0.5;
  float s   = a * a * (0.25 + u_level * 0.2);
  vec3  col = vec3(0.0);
  float w   = 0.0;
  for (int i = 0; i < 10; i++) {
    float t  = float(i) / 9.0;
    float wt = 1.0 - t * 0.6;
    col += prev(clamp(uv - dir * s * t, 0.001, 0.999)) * wt;
    w   += wt;
  }
  return col / w;
}
