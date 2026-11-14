/*{
  "name": "Signal Loss",
  "id": "SGL",
  "defaultSensitivity": 0.7,
  "defaultDurationMs": 100,
  "defaultCooldownMs": 600
}*/

vec3 process(vec2 uv) {
  float t = u_time, a = u_amount;
  float sweep = fract(u_time * 0.8);
  float bar = step(abs(uv.y - sweep), 0.05) * a;
  float noise = hash(uv * u_resolution + t);
  vec3 cur = prev(uv);
  vec3 sig = mix(cur, vec3(noise), bar);
  // additional thin black bars
  float blk = step(0.92, hash(vec2(floor(uv.y * 80.0), floor(t * 4.0))));
  return sig * (1.0 - blk * a);
}
