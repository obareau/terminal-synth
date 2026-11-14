/*{
  "name": "Aberration",
  "id": "ABR"
}*/

vec3 process(vec2 uv) {
  float a   = u_amount;
  vec2 dir  = uv - 0.5;
  float s   = a * (0.018 + u_bass * 0.025);
  float r   = prev(clamp(uv + dir * s * 1.8, 0.0, 1.0)).r;
  float g   = prev(uv).g;
  float b   = prev(clamp(uv - dir * s * 1.8, 0.0, 1.0)).b;
  return vec3(r, g, b);
}
