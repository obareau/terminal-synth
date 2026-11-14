/*{
  "name": "CODE CASCADE",
  "category": "Industrial"
}*/

float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float h11(float p){ return fract(sin(p*78.233)*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(100.0, 50.0);
  p.y += u_time * 8.0;
  vec2 cell = floor(p), cuv = fract(p) - 0.5;
  float lineLen = h11(floor(cell.y))*0.8 + 0.1;
  if (uv.x > lineLen) return vec3(0.0);
  float indent = floor(h11(floor(cell.y) + 3.0)*4.0);
  if (cell.x < indent) return vec3(0.0);
  float seed = h21(cell);
  vec2 d = abs(cuv);
  float v;
  if (seed < 0.35) {
    v = (1.0 - smoothstep(0.06, 0.10, d.y)) * (1.0 - smoothstep(0.30, 0.36, d.x));
  } else if (seed < 0.6) {
    v = (1.0 - smoothstep(0.06, 0.10, d.x)) * (1.0 - smoothstep(0.30, 0.36, d.y));
  } else if (seed < 0.85) {
    float h = 1.0 - smoothstep(0.06, 0.10, d.y);
    float vv = 1.0 - smoothstep(0.06, 0.10, d.x);
    v = max(h, vv) * (1.0 - smoothstep(0.30, 0.36, max(d.x, d.y)));
  } else {
    v = smoothstep(0.32, 0.28, max(d.x, d.y)) - smoothstep(0.20, 0.16, max(d.x, d.y));
  }
  return vec3(v);
}
