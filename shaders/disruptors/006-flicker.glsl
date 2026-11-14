/*{
  "name": "Flicker",
  "id": "FLK",
  "defaultSensitivity": 0.72,
  "defaultDurationMs": 90,
  "defaultCooldownMs": 350
}*/

vec3 process(vec2 uv) {
  float t = u_time;
  float a = u_amount;
  // artefacts CRT rapides
  float flicker = abs(sin(t * 85.0)) * step(0.5, sin(t * 37.0));
  float lines = mod(uv.y * 480.0, 3.0);
  float scanline = step(0.7, fract(lines));

  vec3 c = prev(uv);
  vec3 darken = c * (1.0 - flicker * a * 0.6);
  vec3 displaced = prev(vec2(uv.x + sin(t * 120.0) * 0.008 * a, uv.y));

  return mix(c, mix(darken, displaced, 0.5), scanline * a * 0.8);
}
