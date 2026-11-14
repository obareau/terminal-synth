/*{
  "name": "ASCII TUNNEL",
  "category": "Industrial"
}*/

float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv - 0.5; p.x *= res.x/res.y;
  float r = length(p), a = atan(p.y, p.x);
  float z = 0.4/r + u_time*0.8;
  vec2 tp = vec2(a/6.2831*40.0, z*4.0);
  vec2 cell = floor(tp), cuv = fract(tp) - 0.5;
  float seed = h21(cell);
  float v;
  if (seed < 0.5) {
    v = (1.0 - smoothstep(0.06, 0.10, abs(cuv.x)))
      * (1.0 - smoothstep(0.34, 0.40, abs(cuv.y)));
  } else if (seed < 0.8) {
    v = (1.0 - smoothstep(0.06, 0.10, abs(cuv.y)))
      * (1.0 - smoothstep(0.34, 0.40, abs(cuv.x)));
  } else {
    v = 1.0 - smoothstep(0.22, 0.26, length(cuv));
  }
  return vec3(v * smoothstep(0.0, 0.4, r));
}
