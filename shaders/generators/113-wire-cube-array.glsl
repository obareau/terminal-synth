/*{
  "name": "WIRE CUBE ARRAY",
  "category": "Industrial"
}*/

float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(res.x/res.y, 1.0) * 6.0;
  vec2 cell = floor(p), cuv = fract(p) - 0.5;
  float a = u_time*0.6 + h21(cell)*6.28;
  cuv = rot(a) * cuv;
  vec2 ad = abs(cuv);
  float sq = max(ad.x, ad.y);
  float face = smoothstep(0.32, 0.30, sq) - smoothstep(0.28, 0.26, sq);
  vec2 cuv2 = cuv + vec2(0.08, -0.08);
  vec2 ad2 = abs(cuv2);
  float sq2 = max(ad2.x, ad2.y);
  float back = smoothstep(0.32, 0.30, sq2) - smoothstep(0.28, 0.26, sq2);
  return vec3(max(face, back*0.5));
}
