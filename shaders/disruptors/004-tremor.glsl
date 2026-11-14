/*{
  "name": "Tremor",
  "id": "TRM",
  "defaultSensitivity": 0.55,
  "defaultDurationMs": 150,
  "defaultCooldownMs": 250
}*/

vec3 process(vec2 uv) {
  float t  = u_time;
  float a  = u_amount;
  float fr = floor(t * 32.0);
  vec2 shake = vec2(
    (hash(vec2(fr, 0.0)) - 0.5) * a * 0.05,
    (hash(vec2(fr, 1.0)) - 0.5) * a * 0.04
  );
  // décalage chromatique simultané
  float s = a * 0.015;
  vec3 c;
  c.r = prev(clamp(uv + shake + vec2( s, 0.0), 0.001, 0.999)).r;
  c.g = prev(clamp(uv + shake,                  0.001, 0.999)).g;
  c.b = prev(clamp(uv + shake - vec2( s, 0.0), 0.001, 0.999)).b;
  return c;
}
