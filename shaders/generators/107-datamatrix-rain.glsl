/*{
  "name": "DATAMATRIX RAIN",
  "category": "Industrial"
}*/

float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  float cols = 80.0, rows = 45.0;
  vec2 cell = vec2(floor(uv.x*cols), floor(uv.y*rows));
  float speed = mix(2.0, 6.0, h21(vec2(cell.x, 7.0)));
  float row = cell.y + u_time * speed;
  float bit = step(0.5, h21(vec2(cell.x, floor(row))));
  float head = exp(-fract(row) * 4.0);
  vec2 cuv = fract(uv * vec2(cols, rows));
  vec2 d = abs(cuv - 0.5);
  float glyph = bit > 0.5
    ? (1.0 - smoothstep(0.20, 0.22, max(d.x, d.y)))
    : (1.0 - smoothstep(0.10, 0.12, max(d.x, d.y)));
  return vec3(glyph * (0.3 + head * 0.7));
}
