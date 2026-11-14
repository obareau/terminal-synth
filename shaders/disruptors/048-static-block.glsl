/*{
  "name": "Static Block",
  "id": "SBK",
  "defaultSensitivity": 0.7,
  "defaultDurationMs": 90,
  "defaultCooldownMs": 550
}*/

vec3 process(vec2 uv) {
  float t    = u_time;
  float a    = u_amount;
  float bsz  = 0.15 + (1.0 - a) * 0.1;
  vec2  bid  = floor(uv / bsz);
  float rnd  = hash(bid + floor(t * 10.0));
  float bad  = step(0.75, rnd) * a;
  vec3  noise = vec3(
    hash(bid + vec2(t * 33.1, 0.0)),
    hash(bid + vec2(0.0, t * 27.7)),
    hash(bid + vec2(t * 17.3, t * 41.9))
  );
  return mix(prev(uv), noise, bad);
}
