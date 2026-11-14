/*{
  "name": "Acid Wash",
  "id": "ACD",
  "defaultSensitivity": 0.7,
  "defaultDurationMs": 100,
  "defaultCooldownMs": 600
}*/

vec3 process(vec2 uv) {
  float a   = u_amount;
  float t   = u_time;
  vec3  c   = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3  sat = (c - lum) * (1.0 + a * 3.5);
  float sh  = a * TWO_PI + sin(t * 9.0) * a * 1.2;
  float cs  = cos(sh); float ss = sin(sh);
  vec3 rot  = vec3(
    lum + sat.r * cs - sat.g * ss,
    lum + sat.r * ss + sat.g * cs,
    lum + sat.b * (1.0 + a)
  );
  return clamp(rot, 0.0, 1.0);
}
