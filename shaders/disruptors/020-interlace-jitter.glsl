/*{
  "name": "Interlace Jitter",
  "id": "IJT",
  "defaultSensitivity": 0.55,
  "defaultDurationMs": 110,
  "defaultCooldownMs": 380
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;

  // Lignes entrelacées qui tremblent
  float line = mod(uv.y * u_resolution.y, 2.0);
  float jitter = sin(t * 40.0 + uv.x * 10.0) * 0.01 * a;

  vec2 jittered = uv + vec2(jitter * line, 0.0);
  vec3 c = prev(clamp(jittered, 0.0, 1.0));

  // Obscurcir les lignes alternées
  float darken = mix(1.0, 0.7, step(0.5, line) * a);
  return c * darken;
}
