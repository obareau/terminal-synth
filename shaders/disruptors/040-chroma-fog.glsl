/*{
  "name": "Chroma Fog",
  "id": "CFG",
  "defaultSensitivity": 0.5,
  "defaultDurationMs": 200,
  "defaultCooldownMs": 600
}*/

vec3 process(vec2 uv) {
  float t     = u_time;
  float a     = u_amount;
  float s     = a * 0.04;
  float angle = t * 1.3;
  vec2  dr    = vec2(cos(angle),                  sin(angle)                 ) * s;
  vec2  dg    = vec2(cos(angle + TWO_PI / 3.0),   sin(angle + TWO_PI / 3.0) ) * s;
  vec2  db    = vec2(cos(angle + TWO_PI * 2.0/3.0),sin(angle + TWO_PI*2.0/3.0)) * s;
  float r = prev(clamp(uv + dr, 0.0, 1.0)).r;
  float g = prev(clamp(uv + dg, 0.0, 1.0)).g;
  float b = prev(clamp(uv + db, 0.0, 1.0)).b;
  return vec3(r, g, b) * (1.0 + a * 0.3);
}
