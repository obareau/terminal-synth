/*{
  "name": "STROBE GRID",
  "category": "Industrial"
}*/

float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(res.x/res.y, 1.0) * 10.0;
  vec2 cell = floor(p), cuv = fract(p) - 0.5;
  float seed = h21(cell + floor(u_time*2.0));
  vec2 d = abs(cuv);
  float box = smoothstep(0.46, 0.44, max(d.x, d.y));
  float on = step(seed, 0.2 + u_bass*0.5);
  float outline = smoothstep(0.46, 0.44, max(d.x, d.y))
                - smoothstep(0.40, 0.38, max(d.x, d.y));
  return vec3(max(on*box, outline*0.4));
}
