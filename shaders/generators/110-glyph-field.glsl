/*{
  "name": "GLYPH FIELD",
  "category": "Industrial"
}*/

float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(60.0, 40.0);
  vec2 cell = floor(p), cuv = fract(p);
  float seed = h21(cell + floor(u_time*2.0));
  if (seed < 0.55 + u_level*0.3) return vec3(0.0);
  vec2 d = cuv - 0.5; float glyph;
  if (seed < 0.7) {
    glyph = 1.0 - smoothstep(0.05, 0.08, abs(d.y));
    glyph *= 1.0 - smoothstep(0.30, 0.35, abs(d.x));
  } else if (seed < 0.85) {
    float h = 1.0 - smoothstep(0.05, 0.08, abs(d.y));
    float vv = 1.0 - smoothstep(0.05, 0.08, abs(d.x));
    glyph = max(h, vv) * (1.0 - smoothstep(0.30, 0.35, max(abs(d.x), abs(d.y))));
  } else {
    float outer = 1.0 - smoothstep(0.30, 0.32, max(abs(d.x), abs(d.y)));
    float inner = 1.0 - smoothstep(0.22, 0.24, max(abs(d.x), abs(d.y)));
    glyph = outer - inner;
  }
  return vec3(glyph);
}
