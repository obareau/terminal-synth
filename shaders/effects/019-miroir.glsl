/*{
  "name": "Miroir",
  "id": "MIR"
}*/

vec3 process(vec2 uv) {
  float a    = u_amount;
  float segs = 2.0 + floor(a * 6.0);   // 2..8 segments
  vec2  p    = uv - 0.5;
  float ang  = atan(p.y, p.x) + u_time * 0.08 * a;
  float r    = length(p);
  float segA = PI / segs;
  ang = mod(ang + PI, segA * 2.0);
  if (ang > segA) ang = segA * 2.0 - ang;
  ang -= PI;
  vec2 muv = clamp(0.5 + r * vec2(cos(ang), sin(ang)), 0.001, 0.999);
  return mix(prev(uv), prev(muv), a);
}
