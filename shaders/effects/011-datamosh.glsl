/*{
  "name": "Datamosh",
  "id": "DTM"
}*/

vec3 process(vec2 uv) {
  float a    = u_amount;
  float t    = u_time;
  float bs   = 0.035 + a * 0.055;
  vec2  bid  = floor(uv / bs) * bs;
  float rnd  = hash(bid + floor(t * 2.0));
  float keep = step(0.68 - a * 0.38, rnd);
  vec2  mot  = (vec2(hash(bid+5.0), hash(bid+10.0))-0.5) * a * 0.14 * keep;
  vec3  cur  = prev(uv);
  vec3  old  = fb(clamp(uv + mot, 0.001, 0.999));
  return mix(cur, old, keep * a * (0.5 + u_bass * 0.45));
}
