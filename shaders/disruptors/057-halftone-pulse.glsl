/*{
  "name": "Halftone Pulse",
  "id": "HTP",
  "defaultSensitivity": 0.5,
  "defaultDurationMs": 140,
  "defaultCooldownMs": 300
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec2 grid = uv * 80.0;
  vec2 cuv = fract(grid) - 0.5;
  float dotR = mix(0.08, 0.45, lum);
  float d = 1.0 - smoothstep(dotR, dotR + 0.03, length(cuv));
  vec3 halftone = vec3(d);
  return mix(c, halftone, a);
}
