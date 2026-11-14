/*{
  "name": "Flip Vertical",
  "id": "FLV",
  "defaultSensitivity": 0.5,
  "defaultDurationMs": 200,
  "defaultCooldownMs": 600
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 flipped = vec2(uv.x, 1.0 - uv.y);
  return prev(mix(uv, flipped, a));
}
