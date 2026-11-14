/*{
  "name": "Datamosh",
  "id": "DMS",
  "defaultSensitivity": 0.5,
  "defaultDurationMs": 200,
  "defaultCooldownMs": 500
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 flow = vec2(sin(uv.y * 6.0 + u_time * 3.0), cos(uv.x * 5.0 - u_time * 2.0)) * 0.02 * a;
  vec3 hist = fb(uv + flow) * 0.85;
  vec3 cur  = prev(uv);
  return max(cur, hist);
}
