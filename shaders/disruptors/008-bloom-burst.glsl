/*{
  "name": "Bloom Burst",
  "id": "BBR",
  "defaultSensitivity": 0.75,
  "defaultDurationMs": 130,
  "defaultCooldownMs": 550
}*/

vec3 process(vec2 uv) {
  float t = u_time;
  float a = u_amount;
  vec3 c = prev(uv);

  // zones lumineuses qui explosent vers l'extérieur
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float bloomPulse = abs(sin(t * 40.0)) * a;

  // distance depuis le centre avec bloom radiatif
  vec2 center = vec2(0.5);
  float dist = length(uv - center);
  float burst = exp(-dist * 5.0) * lum * bloomPulse;

  // inversion progressive des hautes lumières
  vec3 invLum = mix(c, 1.0 - c, lum * a * 0.5);
  vec3 bloomed = mix(c, invLum + burst * 2.0, lum * 0.7 * a);

  return bloomed;
}
