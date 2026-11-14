/*{
  "name": "Temporal Shift",
  "id": "TSH",
  "defaultSensitivity": 0.58,
  "defaultDurationMs": 125,
  "defaultCooldownMs": 480
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  float shift = sin(t * 6.0) * 0.1 * a;
  vec2 shifted = uv + vec2(sin(uv.y * 10.0 + t) * shift, cos(uv.x * 10.0 + t) * shift);
  vec3 c = prev(clamp(shifted, 0.0, 1.0));
  float sat = 1.0 - hash(vec2(floor(t * 20.0), floor(uv.y * 10.0))) * a * 0.3;
  return c * sat;
}
