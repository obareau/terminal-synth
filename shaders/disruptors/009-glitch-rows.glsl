/*{
  "name": "Glitch Rows",
  "id": "GRW",
  "defaultSensitivity": 0.62,
  "defaultDurationMs": 100,
  "defaultCooldownMs": 380
}*/

vec3 process(vec2 uv) {
  float t = u_time;
  float a = u_amount;
  // corruption de scan lines style VHS
  float rowIdx = floor(uv.y * u_resolution.y);
  float rnd = hash(vec2(rowIdx, floor(t * 30.0)));

  float glitchRow = step(0.8 - a * 0.18, rnd);
  float shift = (hash(vec2(rowIdx + t, t)) - 0.5) * 0.12 * a * glitchRow;

  vec2 glitchUv = uv + vec2(shift, 0.0);
  vec3 glitchColor = prev(clamp(glitchUv, 0.0, 1.0));

  // duplication horizontale sur la ligne corrompue
  vec3 dup = prev(clamp(glitchUv + vec2(0.05, 0.0), 0.0, 1.0));
  glitchColor = mix(glitchColor, dup, 0.3 * glitchRow);

  return mix(prev(uv), glitchColor, glitchRow * a * 0.9);
}
