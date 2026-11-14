/*{
  "name": "Contour Shock",
  "id": "CSK",
  "defaultSensitivity": 0.65,
  "defaultDurationMs": 80,
  "defaultCooldownMs": 240
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 px = 1.0 / u_resolution;
  float lc = dot(prev(uv), vec3(0.2126, 0.7152, 0.0722));
  float lx = dot(prev(uv + vec2(px.x, 0.0)), vec3(0.2126, 0.7152, 0.0722));
  float ly = dot(prev(uv + vec2(0.0, px.y)), vec3(0.2126, 0.7152, 0.0722));
  float edge = clamp(abs(lc - lx) * 6.0 + abs(lc - ly) * 6.0, 0.0, 1.0);
  return mix(prev(uv), vec3(edge), a);
}
