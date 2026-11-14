/*{
  "name": "BINARY STATIC",
  "category": "Industrial"
}*/

float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(120.0, 70.0);
  vec2 cell = floor(p), cuv = fract(p) - 0.5;
  float flick = floor(u_time*6.0 + h21(cell)*10.0);
  float bit = step(0.5, h21(cell + flick*0.1));
  float v;
  if (bit > 0.5) {
    v = (1.0 - smoothstep(0.05, 0.08, abs(cuv.x)))
      * (1.0 - smoothstep(0.34, 0.38, abs(cuv.y)));
  } else {
    float r = length(cuv);
    v = smoothstep(0.32, 0.30, r) - smoothstep(0.24, 0.22, r);
  }
  return vec3(v);
}
