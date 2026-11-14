/*{
  "name": "RGB Explosion",
  "id": "RGX",
  "defaultSensitivity": 0.68,
  "defaultDurationMs": 100,
  "defaultCooldownMs": 350
}*/

vec3 process(vec2 uv) {
  float a  = u_amount;
  vec2  d  = uv - 0.5;
  vec2  dn = normalize(d + vec2(0.0001));
  float s  = a * 0.14;
  float cr = prev(clamp(uv + dn * s * 1.6, 0.0, 1.0)).r;
  float cg = prev(clamp(uv,                0.0, 1.0)).g;
  float cb = prev(clamp(uv - dn * s,       0.0, 1.0)).b;
  return vec3(cr, cg, cb);
}
