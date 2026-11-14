/*{
  "name": "CIRCUIT TRACE",
  "category": "Industrial"
}*/

float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float h11(float p){ return fract(sin(p*78.233)*43758.5453); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(res.x/res.y, 1.0) * 16.0;
  vec2 cell = floor(p), cuv = fract(p) - 0.5;
  float seed = h21(cell);
  float v = 0.0;
  if (seed < 0.4) {
    v = 1.0 - smoothstep(0.04, 0.06, abs(cuv.y));
  } else if (seed < 0.8) {
    v = 1.0 - smoothstep(0.04, 0.06, abs(cuv.x));
  } else {
    float h = 1.0 - smoothstep(0.04, 0.06, abs(cuv.y));
    float vv = 1.0 - smoothstep(0.04, 0.06, abs(cuv.x));
    v = max(h, vv);
    v = max(v, 1.0 - smoothstep(0.12, 0.14, length(cuv)));
  }
  float pulse = h11(floor(cell.x + cell.y*7.0));
  float t = fract(u_time*0.7 + pulse);
  v *= mix(0.35, 1.0, step(abs(t - 0.5), 0.15));
  return vec3(v);
}
