/*{
  "name": "Glitch Blocks",
  "id": "GBL"
}*/

vec3 process(vec2 uv) {
  float a  = u_amount * (0.4 + u_bass * 0.9);
  float tk = floor(u_time * 5.0);
  vec2 bsz = vec2(mix(0.20, 0.08, a), mix(0.12, 0.04, a));
  vec2 blk = floor(uv / bsz) * bsz;
  float r1 = hash(blk + tk);
  float r2 = hash(blk.yx + tk + 3.7);
  float trig = step(0.55, r1) * step(0.4, a);
  vec2 shift = vec2((r2 - 0.5) * a * 0.38, (r1 - 0.7) * a * 0.14) * trig;
  float s    = length(shift) * 0.6;
  return vec3(
    prev(uv + shift + vec2( s, 0.0)).r,
    prev(uv + shift).g,
    prev(uv + shift - vec2( s, 0.0)).b);
}
