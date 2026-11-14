/*{
  "name": "Color Melt",
  "id": "CLM",
  "defaultSensitivity": 0.6,
  "defaultDurationMs": 160,
  "defaultCooldownMs": 500
}*/

vec3 process(vec2 uv) {
  float t  = u_time;
  float a  = u_amount;
  float dr = sin(uv.x * 20.0 + t * 3.0) * a * 0.045;
  float dg = sin(uv.x * 17.0 + t * 2.3 + 1.0) * a * 0.055;
  float db = sin(uv.x * 23.0 + t * 4.1 + 2.0) * a * 0.035;
  float r  = prev(clamp(uv + vec2(0.0, dr), 0.0, 1.0)).r;
  float g  = prev(clamp(uv + vec2(0.0, dg), 0.0, 1.0)).g;
  float b  = prev(clamp(uv + vec2(0.0, db), 0.0, 1.0)).b;
  return vec3(r, g, b);
}
