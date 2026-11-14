/*{
  "name": "Dropout",
  "id": "DRP",
  "defaultSensitivity": 0.7,
  "defaultDurationMs": 60,
  "defaultCooldownMs": 500
}*/

vec3 process(vec2 uv) {
  float t   = u_time;
  float bs  = 0.05 + u_amount * 0.05;
  vec2  bid = floor(uv / bs);
  float rnd = hash(bid + floor(t * 22.0));
  float kill = step(0.84 - u_amount * 0.12, rnd);
  vec3 noise = vec3(
    hash(uv * 2048.0 + t),
    hash(uv * 1537.0 + t * 1.3),
    hash(uv * 3071.0 + t * 0.7)
  );
  return mix(prev(uv), noise * u_amount + prev(uv) * (1.0 - u_amount), kill);
}
