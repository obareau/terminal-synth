/*{
  "name": "Kaleidoscope",
  "id": "KAL"
}*/

vec3 process(vec2 uv) {
  vec2 p;
  p.x = (uv.x < 0.5) ? uv.x : 1.0 - uv.x;
  p.y = (uv.y < 0.5) ? uv.y : 1.0 - uv.y;
  p  *= 2.0;
  float t = u_time * 0.06;
  p += vec2(cos(t) * u_mid * 0.06, sin(t * 1.3) * u_bass * 0.05);
  return mix(prev(uv), prev(clamp(p, 0.0, 1.0)), u_amount);
}
