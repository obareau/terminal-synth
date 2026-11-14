/*{
  "name": "Neon Flare",
  "id": "NFR",
  "defaultSensitivity": 0.76,
  "defaultDurationMs": 80,
  "defaultCooldownMs": 800
}*/

vec3 process(vec2 uv) {
  float a   = u_amount;
  float t   = u_time;
  vec3  c   = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float r   = length(uv - 0.5);
  float flare = exp(-r * 3.0) * a * u_level;
  vec3  neon  = vec3(
    sin(t * 5.0) * 0.5 + 0.5,
    sin(t * 3.7 + 2.0) * 0.5 + 0.5,
    sin(t * 6.3 + 4.0) * 0.5 + 0.5
  );
  return clamp(c + neon * flare * lum * 2.0, 0.0, 1.0);
}
