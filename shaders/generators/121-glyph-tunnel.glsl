/*{
  "name": "GLYPH TUNNEL",
  "category": "Industrial"
}*/

float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv - 0.5; p.x *= res.x/res.y;
  float r = length(p), a = atan(p.y, p.x);
  float z = log(r + 0.05) + u_time*0.4;
  vec2 tp = vec2(a/6.2831*24.0, z*3.0);
  vec2 cell = floor(tp), cuv = fract(tp) - 0.5;
  float seed = h21(cell + floor(u_time));
  if (seed < 0.35) return vec3(0.0);
  vec2 d = abs(cuv);
  float glyph = smoothstep(0.36, 0.30, max(d.x, d.y))
              - smoothstep(0.22, 0.18, max(d.x, d.y));
  return vec3(glyph * smoothstep(0.0, 0.5, r));
}
