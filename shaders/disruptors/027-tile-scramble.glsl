/*{
  "name": "Tile Scramble",
  "id": "TSC",
  "defaultSensitivity": 0.65,
  "defaultDurationMs": 110,
  "defaultCooldownMs": 500
}*/

vec3 process(vec2 uv) {
  float t   = u_time;
  float a   = u_amount;
  float sz  = 0.07 + (1.0 - a) * 0.08;
  vec2  tid = floor(uv / sz);
  float rnd = hash(tid + floor(t * 16.0));
  float doSwap = step(0.55, rnd) * a;
  vec2  swapTile = floor(vec2(
    hash(tid + vec2(rnd * 17.3, 5.1)) * 14.0,
    hash(tid + vec2(3.7, rnd * 11.9)) * 14.0
  ));
  vec2 srcTile = mix(tid, swapTile, doSwap);
  vec2 srcUv   = srcTile * sz + fract(uv / sz) * sz;
  return prev(clamp(srcUv, 0.001, 0.999));
}
